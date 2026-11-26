// 확인 도구: 지정한 시각의 프레임 저장 · 콘솔 오류 · DURATION · 칩 폭 · 이음매 · 단계 표
// 사용: node tools/check.mjs --times 0,3.2,6.5 --out <폴더> [--box] [--seam] [--steps]
//   --times  실제 초 목록(쉼표). 시각마다 f_<초>.png(1920x1080) 저장
//   --box    ?box=1 화면(1024x576)도 b_<초>.png 로 저장
//   --seam   0초와 마지막 프레임((ceil(DURATION*60)-1)/60 초)의 픽셀 최대 차이(픽셀 배율 2, 내보내기와 같은 순서)
//   --steps  단계마다 id, 종류, 시작과 끝(실제 초)
// 서버(기본 포트 8933, PORT 로 바꿈)가 떠 있어야 한다. 서버 루트가 이 폴더가 아니면 BASE_PATH 에 index.html 이 있는 폴더 경로를 준다(예: /motions/demo). 마지막 줄에 결과 JSON 한 덩어리를 출력한다.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

// Playwright 위치: PW_ROOT 가 있으면 그 폴더, 없으면 이 파일에서 위로 올라가며 node_modules/playwright 를 찾는다
let root = process.env.PW_ROOT || fileURLToPath(new URL('.', import.meta.url));
while (root !== '/' && !existsSync(join(root, 'node_modules', 'playwright'))) root = dirname(root);
if (!existsSync(join(root, 'node_modules', 'playwright'))) { console.error('playwright 를 찾지 못했습니다. 모션 폴더에서 npm i playwright@1.58.2 를 실행하거나 PW_ROOT 를 지정하세요.'); process.exit(1); }
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const PORT = process.env.PORT || '8933', BASE_PATH = process.env.BASE_PATH || '', URL0 = `http://127.0.0.1:${PORT}${BASE_PATH}/index.html`;

const args = process.argv.slice(2), has = k => args.includes(k);
const val = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const times = (val('--times') || '').split(',').filter(Boolean).map(Number);
const outDir = val('--out') ? resolve(val('--out')) : null;
if (times.length && !outDir) { console.log('usage: node tools/check.mjs --times 0,3.2 --out <폴더> [--box] [--seam] [--steps]'); process.exit(1); }
if (outDir) mkdirSync(outDir, { recursive: true });
const name = t => t.toFixed(3);

const browser = await chromium.launch();
const R = { url: URL0, consoleErrors: [], pageErrors: [], files: [] };
async function open(query, viewport, scale = 1) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  page.on('console', m => { if (m.type() === 'error') R.consoleErrors.push(`${query} ${m.text()} ${m.location().url || ''}`.trim()); });
  page.on('pageerror', e => R.pageErrors.push(`${query} ${e.message}`));
  await page.goto(`${URL0}${query}`);
  await page.evaluate(async () => { await window.ready; await document.fonts.ready; });
  return page;
}

const page = await open('?export=1', { width: 1920, height: 1080 });
Object.assign(R, await page.evaluate(() => ({ DURATION: window.DURATION, paramsSource: window.paramsSource })));
R.frames = Math.ceil(R.DURATION * 60);

// 칩 7개: 그 장면의 첫 hold 단계 시작(칩이 다 보이는 때)에서 폭을 잰다
R.chips = await page.evaluate(() => {
  const out = [], C = window.STEPS, sp = C.DURATION / C.BASE;
  for (const n in MotionSteps.CAPTIONS) {
    const h = C.list.find(x => x.scene === +n && x.type === 'hold') || C.list.find(x => x.scene === +n);
    const t = h.start / 1000 * sp + 0.5; window.seek(t);
    const el = document.getElementById('cap' + n);
    out.push({ n: +n, at: +t.toFixed(3), width: el.offsetWidth, opacity: +el.style.opacity, overflow: window.captionOverflow(+n) });
  }
  return out;
});

if (has('--steps')) R.steps = await page.evaluate(() => {
  const C = window.STEPS, sp = C.DURATION / C.BASE;
  return C.list.map(x => ({ id: x.id, scene: x.scene, type: x.type, s: +(x.start / 1000 * sp).toFixed(3), e: +(x.end / 1000 * sp).toFixed(3) }));
});

for (const t of times) {
  await page.evaluate(tt => window.seek(tt), t);
  const f = join(outDir, `f_${name(t)}.png`); await page.screenshot({ path: f }); R.files.push(f);
}

if (has('--seam')) {
  const dir = outDir || join(tmpdir(), 'motion-qa-seam'); mkdirSync(dir, { recursive: true });
  // 내보내기(export.mjs)와 같은 조건: 픽셀 배율 2, 0초를 그린 뒤 마지막 2초를 1/60초씩 차례로 그리고 마지막 프레임을 저장한다.
  // 배율 1 이나 다른 방문 순서에서는 Chromium 그리기 차이로 몇 단계 다를 수 있어 그 값과 비교하지 않는다.
  const sp = await open('?export=1', { width: 1920, height: 1080 }, 2);
  const tLast = (R.frames - 1) / 60, a = join(dir, 'seam_first.png'), b = join(dir, 'seam_last.png');
  await sp.evaluate(() => window.seek(0)); await sp.screenshot({ path: a });
  for (let i = Math.max(1, R.frames - 120); i < R.frames; i++) {
    await sp.evaluate(tt => window.seek(tt), i / 60);
    await sp.screenshot(i === R.frames - 1 ? { path: b } : {});
  }
  const py = spawnSync('python3', ['-c', `
import sys; from PIL import Image; import numpy as np
x=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int); y=np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)
d=np.abs(x-y); print(int(d.max()), int((d.max(axis=2)>0).sum()))`, a, b], { encoding: 'utf8' });
  const [maxDiff, diffPixels] = (py.stdout || '').trim().split(' ').map(Number);
  R.seam = { tLast: +tLast.toFixed(4), maxDiff, diffPixels, files: [a, b], error: py.status ? py.stderr.trim() : undefined };
}

if (has('--box') && times.length) {
  const bp = await open('?box=1&t=0', { width: 1100, height: 700 });
  for (const t of times) {
    await bp.evaluate(tt => window.seek(tt), t);
    const f = join(outDir, `b_${name(t)}.png`); await bp.locator('#wrap').screenshot({ path: f }); R.files.push(f);
  }
}
await browser.close();

console.log(`DURATION ${R.DURATION} · 프레임 ${R.frames} · 값 출처 ${R.paramsSource}`);
console.log(`콘솔 오류 ${R.consoleErrors.length}`); R.consoleErrors.forEach(e => console.log('  ' + e));
console.log(`페이지 오류 ${R.pageErrors.length}`); R.pageErrors.forEach(e => console.log('  ' + e));
R.chips.forEach(c => console.log(`칩 ${c.n}: 폭 ${c.width}px ${c.overflow ? '넘침' : '760 안'} (t ${c.at}, 불투명도 ${c.opacity})`));
if (R.seam) console.log(`이음매: 0초 와 ${R.seam.tLast}초 최대 차이 ${R.seam.maxDiff}, 다른 픽셀 ${R.seam.diffPixels}${R.seam.error ? ' 오류 ' + R.seam.error : ''}`);
if (R.steps) R.steps.forEach(s => console.log(`  ${s.id.padEnd(14)} ${String(s.scene)} ${s.type.padEnd(6)} ${s.s.toFixed(3)} ~ ${s.e.toFixed(3)}`));
R.files.forEach(f => console.log('저장 ' + f));
if (outDir) writeFileSync(join(outDir, 'check.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
