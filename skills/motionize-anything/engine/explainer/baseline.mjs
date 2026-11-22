// 기준 프레임 찍기 · 비교 (화면을 고치기 전후로 기본값 그림이 같은지)
// 사용: node baseline.mjs <출력폴더> [포트]   → 단계마다 대표 순간 + 0초 + 끝 직전 프레임을 1920×1080 PNG 로
//       python3 -c "..." 로 두 폴더 비교 (reference/qa.md)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
const here = new URL('.', import.meta.url).pathname;
let root = process.env.PW_ROOT || here; while (root !== '/' && !existsSync(join(root, 'node_modules', 'playwright'))) root = dirname(root);   // PW_ROOT 가 있으면 그 폴더에서 시작해 위로 찾는다
if (!existsSync(join(root, 'node_modules', 'playwright'))) { console.error('playwright 를 찾지 못했습니다. 모션 폴더에서 npm i playwright@1.58.2 를 실행하거나 PW_ROOT 를 지정하세요.'); process.exit(1); }
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const [, , outDir, port = '8947'] = process.argv, BASE_PATH = process.env.BASE_PATH || '';   // BASE_PATH: 서버 루트에서 이 폴더까지 경로
if (!outDir) { console.log('usage: node baseline.mjs <outDir> [port]'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${port}${BASE_PATH}/index.html?export=1`); await p.evaluate(async () => { await window.ready; });
const times = await p.evaluate(() => { const C = window.STEPS, sp = C.DURATION / C.BASE; const ts = [0, ...C.list.map((x) => window.MotionSteps.keyMoment(x) / 1000 * sp), C.DURATION - 0.01]; return [...new Set(ts.map((t) => +Math.min(t, C.DURATION - 0.01).toFixed(3)))]; });
for (const t of times) { await p.evaluate((tt) => window.seek(tt), t); await p.screenshot({ path: `${outDir}/f_${t.toFixed(3).padStart(7, '0')}.png` }); }
console.log('DURATION', await p.evaluate(() => window.DURATION), 'frames', times.length, 'errs', errs);
await b.close();
