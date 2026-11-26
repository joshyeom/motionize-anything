// mp4 내보내기 (모션 공용)
// 사용: 이 폴더를 로컬 서버(127.0.0.1)로 띄운 뒤
//   node export.mjs [crf]            → <폴더이름>-1080p60.mp4 + <폴더이름>-1440p60.mp4
//   NAME=demo PORT=8948 node export.mjs 16
//   LIMIT=120 node export.mjs        → 앞 120프레임만 (시험용)
// 프레임은 3840×2160(픽셀 배율 2)으로 한 번 그려 두 크기로 Lanczos 축소한다(초과 샘플링). BT.709 TV 범위 태그를 붙인다.
// index.html?export=1 은 motion-params.json 이 있으면 그 값으로 그린다(없으면 기본값).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

const dir = new URL('.', import.meta.url).pathname;
// Playwright 위치: PW_ROOT 환경 변수가 있으면 그 폴더, 없으면 이 폴더에서 위로 올라가며 node_modules/playwright 를 찾는다
let root = process.env.PW_ROOT || dir; while (root !== '/' && !existsSync(join(root, 'node_modules', 'playwright'))) root = dirname(root);
if (!existsSync(join(root, 'node_modules', 'playwright'))) { console.error('playwright 를 찾지 못했습니다. 모션 폴더에서 npm i playwright@1.58.2 를 실행하거나 PW_ROOT 를 지정하세요.'); process.exit(1); }
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('playwright');

const FPS = 60, CRF = process.argv[2] ?? '16';
const NAME = process.env.NAME || basename(dir.replace(/\/$/, ''));
const PORT = process.env.PORT || '8947', BASE_PATH = process.env.BASE_PATH || '';   // BASE_PATH: 서버 루트에서 이 폴더까지 경로(서버 루트가 이 폴더가 아닐 때)
const out1080 = join(dir, `${NAME}-1080p60.mp4`), out1440 = join(dir, `${NAME}-1440p60.mp4`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/index.html?export=1`);
await page.evaluate(async () => { await window.ready; await document.fonts.ready; });
const src = await page.evaluate(() => window.paramsSource);
const duration = await page.evaluate(() => window.DURATION);
const frames = Math.min(Math.ceil(duration * FPS), +process.env.LIMIT || Infinity);
console.log(`값 출처: ${src} · 길이 ${duration.toFixed(2)}s · ${frames}프레임`);

const conv = (w, h) => `scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709`;
const enc = ['-c:v', 'libx264', '-crf', CRF, '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-filter_complex', `[0:v]split=2[a][b];[a]${conv(1920, 1080)}[o1];[b]${conv(2560, 1440)}[o2]`,
  '-map', '[o1]', ...enc, out1080, '-map', '[o2]', ...enc, out1440], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 300 === 0) console.log(`${i}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
await browser.close();
if (errs.length) console.log('페이지 오류', errs);
console.log(`done ${frames} frames, ${duration.toFixed(2)} s → ${out1080}, ${out1440}`);
