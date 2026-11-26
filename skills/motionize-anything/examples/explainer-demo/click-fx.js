// 클릭 효과 엔진 (사용법 모션과 설명 모션 공용)
// 모든 시간은 ms, 효과 단계의 지연은 "누름 순간" 기준. 결과는 t 하나로만 정해진다(애니메이션 · 난수 없음).
(function (g) {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  const ioC = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const oC = p => 1 - Math.pow(1 - p, 3);
  const lerp = (a, b, p) => a + (b - a) * p;
  function bez(p) { const x1 = .3, x2 = .12; let lo = 0, hi = 1, u = p; for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < p) lo = u; else hi = u; } return 3 * (1 - u) * u * u + u * u * u; }
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
  const set = (e, o) => { for (const k in o) e.setAttribute(k, o[k]); };
  const show = (el, o) => { el.style.opacity = o; el.style.display = o <= 0.001 ? 'none' : ''; };

  const PW = 560, PH = 300;   // 튜닝 패널 크기(내보내기 값으로만 남김)
  // 튜닝 화면용 장면 목록. 이 플러그인은 튜닝 화면을 쓰지 않아 비워 둔다
  const SCENES = [];

  const VARIANTS = [
    { id: 'A', name: '현재안', desc: '노란 물방울 + 파란 물결 2겹 + 튀는 물방울 8개 + 대상 테두리.' },
    { id: 'B', name: '잉크 번짐', desc: '누른 자리에서 대상 안쪽으로만 색이 번졌다 사라집니다.' },
    { id: 'C', name: '수면 파문', desc: '작은 물방울이 떨어지고 가는 물결 3개가 차례로 퍼집니다.' },
    { id: 'D', name: '물방울 튐', desc: '크기가 다른 물방울 11개가 위로 솟았다 떨어지는 왕관 모양입니다.' },
    { id: 'E', name: '커서 링', desc: '커서 끝에 노란 원이 따라다니고, 누르면 줄었다 튕기며 돌아옵니다.' },
    { id: 'F', name: '대상 눌림', desc: '물결 없이 누른 요소가 0.97배로 눌렸다 돌아오고 파란 빛이 번집니다.' },
  ];

  // ---------- 단계 정의: delay/dur = [최소, 최대, 기본] ms ----------
  // win(P): 누름 기준 [시작, 끝] (공통 단계는 tl 함수에서 따로 계산)
  const COMMON = [
    { key: 'glide', name: '커서 이동', hint: '출발점에서 대상까지 곡선으로, 도착할 때 감속', dur: [200, 1500, 600] },
    { key: 'settle', name: '도착 후 멈춤', hint: '도착하고 누르기 전까지', dur: [0, 1000, 150] },
    { key: 'down', name: '누름(내려감)', hint: '커서가 0.88배로 작아짐. 지연은 누름 기준(음수 = 먼저)', delay: [-300, 0, -50], dur: [0, 300, 40] },
    { key: 'up', name: '누름(돌아옴)', hint: '커서가 원래 크기로 돌아옴', delay: [0, 600, 70], dur: [0, 300, 40] },
    { key: 'hold', name: '효과 후 유지', hint: '마지막 효과가 끝난 뒤 그대로 두는 시간', dur: [0, 2500, null] },
    { key: 'rest', name: '다음 반복까지', hint: '커서가 사라지고(최대 160ms) 다시 시작하기까지', dur: [0, 1500, 180] },
  ];
  const w = (p, k) => [p[k].delay || 0, (p[k].delay || 0) + p[k].dur];
  const STEPS = {
    A: [
      { key: 'core_grow', name: '중심 방울 커짐', hint: '노란 방울이 반지름 10까지', delay: [0, 500, 0], dur: [0, 500, 80], win: p => w(p, 'core_grow') },
      { key: 'core_fade', name: '중심 방울 사라짐', hint: '작아지며 투명해짐', delay: [0, 1000, 80], dur: [0, 1000, 200], win: p => w(p, 'core_fade') },
      { key: 'ringA', name: '파문1 퍼짐', hint: '굵은 물결, 반지름 8→64', delay: [0, 500, 0], dur: [100, 1500, 600], win: p => w(p, 'ringA') },
      { key: 'ringB', name: '파문2 시작 지연+퍼짐', hint: '가는 물결, 반지름 8→92', delay: [0, 800, 120], dur: [100, 1500, 650], win: p => w(p, 'ringB') },
      { key: 'drops', name: '튀는 방울 비행', hint: '방울 8개가 바깥으로 튐', delay: [0, 500, 30], dur: [100, 1500, 450], win: p => w(p, 'drops') },
      { key: 'hl_in', name: '강조 테두리 나타남', hint: '대상 둘레 파란 선', delay: [0, 800, 100], dur: [0, 800, 150], win: p => w(p, 'hl_in') },
      { key: 'hl_hold', name: '강조 유지', hint: '나타난 뒤 그대로', dur: [0, 2000, 600], win: p => { const s = w(p, 'hl_in')[1]; return [s, s + p.hl_hold.dur]; } },
      { key: 'hl_out', name: '강조 사라짐', hint: '테두리가 사라짐', dur: [0, 1000, 200], win: p => { const s = w(p, 'hl_in')[1] + p.hl_hold.dur; return [s, s + p.hl_out.dur]; } },
      { key: 'tint', name: '버튼 눌림 색(어두운 대상)', hint: '앞 40ms에 밝아지고 마지막 100ms에 돌아옴', delay: [-300, 300, -40], dur: [140, 1000, 240], win: p => w(p, 'tint') },
    ],
    B: [
      { key: 'ink', name: '번짐', hint: '누른 자리에서 대상 끝까지 원이 커짐', delay: [0, 500, 0], dur: [100, 1500, 450], win: p => w(p, 'ink') },
      { key: 'inkFade', name: '사라짐', hint: '번진 색이 옅어짐', delay: [0, 1500, 300], dur: [100, 1500, 450], win: p => w(p, 'inkFade') },
    ],
    C: [
      { key: 'drop', name: '방울 떨어짐', hint: '작은 방울이 살짝 튕기며 앉음(이후 280ms에 걸쳐 사라짐 포함)', dur: [40, 600, 120], win: p => [0, p.drop.dur + 280] },
      { key: 'gap', name: '물결 간격', hint: '물결 3개 사이 시작 간격', dur: [0, 600, 140], win: p => [0, 2 * p.gap.dur] },
      { key: 'ring', name: '물결 퍼짐(각)', hint: '물결 하나가 반지름 6→58로 퍼지는 시간', dur: [200, 2000, 900], win: p => [0, 2 * p.gap.dur + p.ring.dur] },
    ],
    D: [
      { key: 'flash', name: '노란 번쩍임', hint: '앞 25%에 커지고 뒤 75%에 사라짐', dur: [60, 800, 240], win: p => [0, p.flash.dur] },
      { key: 'fly', name: '물방울 비행', hint: '솟았다 떨어지는 시간(궤적 모양은 그대로)', delay: [0, 300, 20], dur: [200, 2000, 750], win: p => w(p, 'fly') },
      { key: 'ring', name: '물결 퍼짐', hint: '반지름 8→60', delay: [0, 500, 0], dur: [100, 1500, 500], win: p => w(p, 'ring') },
    ],
    E: [
      { key: 'shrink', name: '원 줄어듦', hint: '노란 원 36→24px', dur: [20, 400, 80], win: p => [0, p.shrink.dur] },
      { key: 'spring', name: '원 튕겨 돌아옴', hint: '감쇠 진동으로 36px로 돌아옴', dur: [100, 1500, 600], win: p => [p.shrink.dur, p.shrink.dur + p.spring.dur] },
      { key: 'ring', name: '링 퍼짐', hint: '가는 링 반지름 18→44', delay: [0, 500, 40], dur: [100, 1500, 460], win: p => w(p, 'ring') },
    ],
    F: [
      { key: 'press', name: '눌림', hint: '대상이 0.97배로 작아짐', dur: [20, 400, 80], win: p => [0, p.press.dur] },
      { key: 'release', name: '돌아옴', hint: '원래 크기로', dur: [50, 1000, 250], win: p => [p.press.dur, p.press.dur + p.release.dur] },
      { key: 'glowIn', name: '빛 나타남', hint: '대상 둘레 파란 빛', dur: [20, 600, 100], win: p => [0, p.glowIn.dur] },
      { key: 'glowOut', name: '빛 사라짐', hint: '', dur: [100, 2000, 700], win: p => [p.glowIn.dur, p.glowIn.dur + p.glowOut.dur] },
    ],
  };

  const CUR_IN = 100;   // 커서 나타남(고정)
  // 시간표: 반복 길이는 단계 값에서 계산한다 (고정 길이 없음)
  function timeline(v, p) {
    const g0 = CUR_IN, g1 = g0 + p.glide.dur, tc = g1 + p.settle.dur;
    const fx = STEPS[v].map(s => { const [a, b] = s.win(p); return { key: s.key, name: s.name, start: tc + a, end: tc + b }; });
    const dn = w(p, 'down'), up = w(p, 'up');
    const effectEnd = Math.max(up[1], ...STEPS[v].map(s => s.win(p)[1]));
    const holdStart = tc + effectEnd, restStart = holdStart + p.hold.dur, loop = restStart + p.rest.dur;
    const common = [
      { key: 'glide', name: '커서 이동', start: g0, end: g1 },
      { key: 'settle', name: '도착 후 멈춤', start: g1, end: tc },
      { key: 'down', name: '누름(내려감)', start: tc + dn[0], end: tc + dn[1] },
      { key: 'up', name: '누름(돌아옴)', start: tc + up[0], end: tc + up[1] },
      { key: 'hold', name: '효과 후 유지', start: holdStart, end: restStart },
      { key: 'rest', name: '다음 반복까지', start: restStart, end: loop },
    ];
    return { tc, loop, effectEnd, steps: [...common.slice(0, 4), ...fx, ...common.slice(4)], restStart };
  }

  function defaults() {
    const out = {};
    VARIANTS.forEach(({ id }) => {
      const p = {};
      [...COMMON, ...STEPS[id]].forEach(s => { p[s.key] = { dur: s.dur[2] }; if (s.delay) p[s.key].delay = s.delay[2]; });
      // 효과 후 유지 기본값: 커서가 2420ms에 사라지기 시작하도록 (click-variants.html 과 같은 2.6초 반복)
      p.hold.dur = 0;
      const t = timeline(id, p);
      p.hold.dur = Math.max(0, 2420 - (t.tc + t.effectEnd));
      out[id] = p;
    });
    return out;
  }
  // 저장된 값과 기본값 합치기 (새 단계가 생겨도 깨지지 않게)
  function merge(saved) {
    const d = defaults();
    if (!saved) return d;
    for (const v in d) for (const k in d[v]) for (const f in d[v][k]) {
      const x = saved[v] && saved[v][k] && saved[v][k][f];
      if (typeof x === 'number' && isFinite(x)) d[v][k][f] = x;
    }
    return d;
  }
  const KEY = 'clickTuner.v1';
  function loadState() {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
    return { variant: (s && s.variant) || 'A', speed: (s && s.speed) || 1, solo: (s && s.solo) || null, params: merge(s && s.params) };
  }
  function saveState(st) { localStorage.setItem(KEY, JSON.stringify({ variant: st.variant, speed: st.speed, solo: st.solo, params: st.params })); }

  // ---------- 패널 만들기 ----------
  const DROPS_A = [[-82, 60, 6], [-38, 52, 5], [4, 70, 7], [42, 48, 5.5], [88, 64, 6.5], [134, 54, 5], [180, 68, 6], [226, 50, 5.5]];
  const DROPS_D = [[-160, 300, 3], [-145, 380, 4.5], [-130, 330, 3.5], [-118, 420, 5.5], [-104, 360, 3], [-92, 440, 6], [-80, 350, 4], [-66, 410, 5], [-52, 320, 3], [-38, 370, 4.5], [-22, 290, 3.5]];
  function buildPanel(p, sc, vid) {
    p.classList.add('fx-panel');
    const bg = `background-image:url(${sc.img});background-size:${1440 * S}px ${900 * S}px;background-repeat:no-repeat;`;
    const T = sc.tgt;
    p.innerHTML = `<div style="position:absolute;left:0;top:0;width:${PW}px;height:${PH}px;${bg}background-position:${-sc.ox}px ${-sc.oy}px"></div>
      <div class="glow" style="position:absolute;left:${T.x}px;top:${T.y}px;width:${T.w}px;height:${T.h}px;border-radius:${sc.r}px"></div>
      <div class="cover" style="position:absolute;left:${T.x}px;top:${T.y}px;width:${T.w}px;height:${T.h}px;background:var(--color-base-100);border-radius:${sc.r}px"></div>
      <div class="grp2" style="position:absolute;left:${T.x}px;top:${T.y}px;width:${T.w}px;height:${T.h}px;border-radius:${sc.r}px;overflow:hidden">
        <div style="position:absolute;inset:0;${bg}background-position:${-(sc.ox + T.x)}px ${-(sc.oy + T.y)}px"></div>
        <div class="hover" style="position:absolute;inset:0;mix-blend-mode:${sc.dark ? 'screen' : 'multiply'};background:${sc.dark ? 'var(--color-base-content)' : 'var(--color-base-200)'}"></div>
        <div class="press" style="position:absolute;inset:0;mix-blend-mode:screen;background:var(--color-base-content)"></div>
        <div class="ink" style="position:absolute;border-radius:50%;background:${sc.dark ? 'color-mix(in oklab, var(--color-base-100) 25%, transparent)' : 'color-mix(in oklab, var(--color-click-blue) 14%, transparent)'}"></div>
      </div>`;
    const svg = mk('svg', { width: PW, height: PH, viewBox: `0 0 ${PW} ${PH}` }, p);
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    const disc = document.createElement('div'); disc.style.cssText = 'position:absolute;border-radius:50%;background:color-mix(in oklab, var(--color-click-yellow) 35%, transparent)'; p.appendChild(disc);
    const cur = mk('svg', { viewBox: '0 0 15 22', width: 30, height: 44 }, p);
    cur.style.cssText = 'position:absolute;left:0;top:0;transform-origin:2px 2px;overflow:visible';
    mk('path', { d: 'M1 1 L1 17.6 L5.1 13.7 L7.9 20.2 L10.7 19 L7.9 12.7 L13.5 12.7 Z', fill: 'var(--color-primary)', stroke: 'var(--color-primary-content)', 'stroke-width': 1, 'stroke-linejoin': 'round' }, cur);
    const q = s => p.querySelector(s);
    const o = { v: vid, sc, el: { cover: q('.cover'), grp: q('.grp2'), hover: q('.hover'), press: q('.press'), ink: q('.ink'), glow: q('.glow'), disc, cur } };
    const blue = 'var(--color-click-blue)';
    if (vid === 'A') { o.rect = mk('rect', { fill: 'none', stroke: blue, 'stroke-width': 3, rx: 14 }, svg); o.ringA = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 3 }, svg); o.ringB = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 2 }, svg); o.drops = DROPS_A.map(() => mk('circle', { fill: blue }, svg)); o.core = mk('circle', { fill: 'var(--color-click-yellow)', stroke: blue, 'stroke-width': 2 }, svg); }
    if (vid === 'C') { o.rings = [0, 1, 2].map(() => mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 1.6 }, svg)); o.drop = mk('circle', { fill: blue }, svg); }
    if (vid === 'D') { o.ring = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 2 }, svg); o.drops = DROPS_D.map(() => mk('circle', { fill: blue }, svg)); o.core = mk('circle', { fill: 'var(--color-click-yellow)', stroke: blue, 'stroke-width': 1.5 }, svg); }
    if (vid === 'E') { o.ring = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 1.5 }, svg); }
    return o;
  }

  // ---------- 그리기: t = 반복 안의 시간(ms), p = 이 시안의 값 ----------
  function renderPanel(o, t, p) {
    const tl = timeline(o.v, p), d = t - tc0(tl), { sc, el } = o, [cx, cy] = sc.click, T = sc.tgt;
    const START = [150, 110], a0 = [cx + START[0], cy + START[1]];
    const pg = bez(seg(t, CUR_IN, CUR_IN + p.glide.dur)), dx = cx - a0[0], dy = cy - a0[1], len = Math.hypot(dx, dy);
    const k = [(a0[0] + cx) / 2 + (-dy / len) * len * 0.14, (a0[1] + cy) / 2 + (dx / len) * len * 0.14], u = 1 - pg;
    const px = u * u * a0[0] + 2 * u * pg * k[0] + pg * pg * cx, py = u * u * a0[1] + 2 * u * pg * k[1] + pg * pg * cy;
    const ca = seg(t, 0, CUR_IN) * (1 - seg(t, tl.restStart, tl.restStart + Math.min(160, p.rest.dur)));
    const over = ca > 0 && px >= T.x && px <= T.x + T.w && py >= T.y && py <= T.y + T.h;
    show(el.hover, over ? 1 : 0);
    show(el.press, 0); show(el.ink, 0); show(el.glow, 0); show(el.cover, 0); el.grp.style.transform = ''; show(el.disc, 0);
    const [d0, d1] = w(p, 'down'), [u0, u1] = w(p, 'up');
    const ps = 1 - 0.12 * seg(d, d0, d1) * (1 - seg(d, u0, u1));
    show(el.cur, ca); el.cur.style.transform = `translate(${px - 2}px,${py - 2}px) scale(${ps})`;
    if (o.v === 'A') {
      const hi = w(p, 'hl_in'), hs = hi[1] + p.hl_hold.dur;
      const a = ioC(seg(d, hi[0], hi[1])) * (1 - ioC(seg(d, hs, hs + p.hl_out.dur))), pad = 8 * S;
      set(o.rect, { x: T.x - pad, y: T.y - pad, width: T.w + pad * 2, height: T.h + pad * 2, opacity: a, display: a > 0 ? 'inline' : 'none' });
      const ti = w(p, 'tint'), pv = seg(d, ti[0], ti[0] + 40) * (1 - seg(d, ti[1] - 100, ti[1])); show(el.press, sc.dark && pv > 0 ? 1 : 0);
      const cg = w(p, 'core_grow'), cf = w(p, 'core_fade');
      const cr = d < cg[0] ? 0 : d < cg[1] ? 10 * oC(seg(d, cg[0], cg[1])) : 10 * (1 - ioC(seg(d, cf[0], cf[1])));
      set(o.core, { cx, cy, r: Math.max(cr, 0), opacity: d < cf[0] ? 1 : 1 - seg(d, cf[0], cf[1]) });
      const ra = w(p, 'ringA'), pa = seg(d, ra[0], ra[1]); set(o.ringA, { cx, cy, r: lerp(8, 64, oC(pa)), opacity: d >= ra[0] && pa < 1 ? 0.9 * (1 - pa) : 0 });
      const rb = w(p, 'ringB'), pb = seg(d, rb[0], rb[1]); set(o.ringB, { cx, cy, r: lerp(8, 92, oC(pb)), opacity: d >= rb[0] && pb < 1 ? 0.6 * (1 - pb) : 0 });
      const dr = w(p, 'drops'), pd = seg(d, dr[0], dr[1]);
      o.drops.forEach((e, i) => { const [ang, dist, r0] = DROPS_A[i], rad = ang * Math.PI / 180, q = oC(pd);
        set(e, { cx: cx + Math.cos(rad) * dist * q, cy: cy + Math.sin(rad) * dist * q + 14 * pd * pd, r: Math.max(r0 * (1 - pd * 0.85), 0), opacity: d < dr[0] || pd >= 1 ? 0 : 1 - pd * pd }); });
    }
    if (o.v === 'B') {
      const lx = cx - T.x, ly = cy - T.y, R = Math.max(...[[0, 0], [T.w, 0], [0, T.h], [T.w, T.h]].map(([x, y]) => Math.hypot(x - lx, y - ly)));
      const ik = w(p, 'ink'), fd = w(p, 'inkFade');
      const r = R * oC(seg(d, ik[0], ik[1])), a = d < ik[0] ? 0 : 1 - ioC(seg(d, fd[0], fd[1]));
      show(el.ink, a); Object.assign(el.ink.style, { left: lx - r + 'px', top: ly - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px' });
    }
    if (o.v === 'C') {
      const D = p.drop.dur, dp = seg(d, 0, D), over2 = dp < 1 ? Math.sin(dp * Math.PI) * 0.15 : 0;
      set(o.drop, { cx, cy, r: d < 0 ? 0 : 6 * (dp + over2) * (1 - seg(d, D + 30, D + 280)), opacity: d < 0 ? 0 : 1 - seg(d, D + 80, D + 280) });
      o.rings.forEach((e, i) => { const s0 = i * p.gap.dur, q = seg(d, s0, s0 + p.ring.dur); set(e, { cx, cy, r: lerp(6, 58, oC(q)), opacity: d < s0 || q >= 1 ? 0 : [0.75, 0.5, 0.32][i] * (1 - q) }); });
    }
    if (o.v === 'D') {
      const F = p.flash.dur;
      set(o.core, { cx, cy, r: d < 0 || d > F ? 0 : d < F * 0.25 ? 9 * oC(d / (F * 0.25)) : 9 * (1 - ioC(seg(d, F * 0.25, F))), opacity: 1 });
      const rg = w(p, 'ring'), pv = seg(d, rg[0], rg[1]); set(o.ring, { cx, cy, r: lerp(8, 60, oC(pv)), opacity: d < rg[0] || pv >= 1 ? 0 : 0.7 * (1 - pv) });
      const fl = w(p, 'fly');
      o.drops.forEach((e, i) => { const [ang, v0, r0] = DROPS_D[i], rad = ang * Math.PI / 180, life = seg(d, fl[0], fl[1]), s = life * 0.75;
        set(e, { cx: cx + Math.cos(rad) * v0 * s * 0.55, cy: cy + Math.sin(rad) * v0 * s + 0.5 * 1400 * s * s, r: Math.max(r0 * (1 - 0.6 * life), 0), opacity: d < fl[0] || life >= 1 ? 0 : 1 - Math.pow(life, 3) }); });
    }
    if (o.v === 'E') {
      const Sh = p.shrink.dur, Sp = p.spring.dur;
      const c = d < 0 ? 0 : d < Sh ? d / Sh : Math.exp(-(d - Sh) / (Sp / 6)) * Math.cos(2 * Math.PI * (d - Sh) / (Sp / 2));
      const size = 36 - 12 * c; show(el.disc, ca); Object.assign(el.disc.style, { left: px - size / 2 + 'px', top: py - size / 2 + 'px', width: size + 'px', height: size + 'px' });
      const rg = w(p, 'ring'), pv = seg(d, rg[0], rg[1]); set(o.ring, { cx: px, cy: py, r: lerp(18, 44, oC(pv)), opacity: d < rg[0] || pv >= 1 ? 0 : 0.6 * (1 - pv) });
    }
    if (o.v === 'F') {
      const P = p.press.dur, Rl = p.release.dur, Gi = p.glowIn.dur, Go = p.glowOut.dur;
      const kk = d < 0 ? 0 : d < P ? d / P : 1 - ioC(seg(d, P, P + Rl));
      show(el.cover, kk > 0 ? 1 : 0); el.grp.style.transform = `scale(${1 - 0.03 * kk})`;
      const gg = d < 0 ? 0 : d < Gi ? d / Gi : 1 - ioC(seg(d, Gi, Gi + Go));
      show(el.glow, gg); el.glow.style.boxShadow = `0 0 22px 6px color-mix(in oklab, var(--color-click-blue) ${45 * gg}%, transparent)`;
    }
  }
  const tc0 = tl => tl.tc;
  // 지금 진행 중인 단계 이름 (가장 늦게 시작한 것)
  function activeStep(tl, t) { let a = null; tl.steps.forEach(s => { if (t >= s.start && t < s.end && (!a || s.start >= a.start)) a = s; }); return a; }

  // ---------- 본 영상용: 무대 위에 효과만 그리기 (화면 조각 없이) ----------
  // ctx = { x, y: 누른 점, box: {x,y,w,h,r} 대상(무대 px), dark, touch, pointer: [x,y] 커서 끝 }
  // F 의 "대상 눌림(0.97배)" 은 합성 화면의 일부를 키울 수 없어 빛만 그린다.
  function buildOverlay(svg, layer, vid) {
    const o = { v: vid, els: [] }, blue = 'var(--color-click-blue)';
    const g0 = mk('g', {}, svg); o.g = g0;
    const div = css => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;' + css; layer.appendChild(e); o.els.push(e); return e; };
    if (vid === 'A') { o.ringA = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 3 }, g0); o.ringB = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 2 }, g0); o.drops = DROPS_A.map(() => mk('circle', { fill: blue }, g0)); o.core = mk('circle', { fill: 'var(--color-click-yellow)', stroke: blue, 'stroke-width': 2 }, g0); }
    if (vid === 'B') { o.clip = div('overflow:hidden'); o.ink = document.createElement('div'); o.ink.style.cssText = 'position:absolute;border-radius:50%'; o.clip.appendChild(o.ink); }
    if (vid === 'C') { o.rings = [0, 1, 2].map(() => mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 1.6 }, g0)); o.drop = mk('circle', { fill: blue }, g0); }
    if (vid === 'D') { o.ring = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 2 }, g0); o.drops = DROPS_D.map(() => mk('circle', { fill: blue }, g0)); o.core = mk('circle', { fill: 'var(--color-click-yellow)', stroke: blue, 'stroke-width': 1.5 }, g0); }
    if (vid === 'E') { o.ring = mk('circle', { fill: 'none', stroke: blue, 'stroke-width': 1.5 }, g0); o.disc = div('border-radius:50%;background:color-mix(in oklab, var(--color-click-yellow) 35%, transparent)'); }
    if (vid === 'F') { o.glow = div(''); }
    return o;
  }
  function destroyOverlay(o) { o.g.remove(); o.els.forEach(e => e.remove()); }
  // E: 누름 뒤 원 크기 (36 → 24 → 튕겨 돌아옴)
  function discSize(d, p) { const Sh = p.shrink.dur, Sp = p.spring.dur; const c = d < 0 ? 0 : d < Sh ? d / Sh : Math.exp(-(d - Sh) / (Sp / 6)) * Math.cos(2 * Math.PI * (d - Sh) / (Sp / 2)); return 36 - 12 * c; }
  function renderOverlay(o, d, p, ctx) {
    const { x: cx, y: cy } = ctx, B = ctx.box;
    if (o.v === 'A') {
      const cg = w(p, 'core_grow'), cf = w(p, 'core_fade');
      const cr = d < cg[0] ? 0 : d < cg[1] ? 10 * oC(seg(d, cg[0], cg[1])) : 10 * (1 - ioC(seg(d, cf[0], cf[1])));
      set(o.core, { cx, cy, r: Math.max(cr, 0), opacity: d < cf[0] ? 1 : 1 - seg(d, cf[0], cf[1]) });
      const ra = w(p, 'ringA'), pa = seg(d, ra[0], ra[1]); set(o.ringA, { cx, cy, r: lerp(8, 64, oC(pa)), opacity: d >= ra[0] && pa < 1 ? 0.9 * (1 - pa) : 0 });
      const rb = w(p, 'ringB'), pb = seg(d, rb[0], rb[1]); set(o.ringB, { cx, cy, r: lerp(8, 92, oC(pb)), opacity: d >= rb[0] && pb < 1 ? 0.6 * (1 - pb) : 0 });
      const dr = w(p, 'drops'), pd = seg(d, dr[0], dr[1]);
      o.drops.forEach((e, i) => { const [ang, dist, r0] = DROPS_A[i], rad = ang * Math.PI / 180, q = oC(pd);
        set(e, { cx: cx + Math.cos(rad) * dist * q, cy: cy + Math.sin(rad) * dist * q + 14 * pd * pd, r: Math.max(r0 * (1 - pd * 0.85), 0), opacity: d < dr[0] || pd >= 1 ? 0 : 1 - pd * pd }); });
    }
    if (o.v === 'B') {
      Object.assign(o.clip.style, { left: B.x + 'px', top: B.y + 'px', width: B.w + 'px', height: B.h + 'px', borderRadius: (B.r || 0) + 'px' });
      const lx = cx - B.x, ly = cy - B.y, R = Math.max(...[[0, 0], [B.w, 0], [0, B.h], [B.w, B.h]].map(([x, y]) => Math.hypot(x - lx, y - ly)));
      const ik = w(p, 'ink'), fd = w(p, 'inkFade'), r = R * oC(seg(d, ik[0], ik[1])), a = d < ik[0] ? 0 : 1 - ioC(seg(d, fd[0], fd[1]));
      show(o.clip, a); Object.assign(o.ink.style, { left: lx - r + 'px', top: ly - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', background: ctx.dark ? 'color-mix(in oklab, var(--color-base-100) 25%, transparent)' : 'color-mix(in oklab, var(--color-click-blue) 14%, transparent)' });
    }
    if (o.v === 'C') {
      const D = p.drop.dur, dp = seg(d, 0, D), over2 = dp < 1 ? Math.sin(dp * Math.PI) * 0.15 : 0;
      set(o.drop, { cx, cy, r: d < 0 ? 0 : 6 * (dp + over2) * (1 - seg(d, D + 30, D + 280)), opacity: d < 0 ? 0 : 1 - seg(d, D + 80, D + 280) });
      o.rings.forEach((e, i) => { const s0 = i * p.gap.dur, q = seg(d, s0, s0 + p.ring.dur); set(e, { cx, cy, r: lerp(6, 58, oC(q)), opacity: d < s0 || q >= 1 ? 0 : [0.75, 0.5, 0.32][i] * (1 - q) }); });
    }
    if (o.v === 'D') {
      const F = p.flash.dur;
      set(o.core, { cx, cy, r: d < 0 || d > F ? 0 : d < F * 0.25 ? 9 * oC(d / (F * 0.25)) : 9 * (1 - ioC(seg(d, F * 0.25, F))), opacity: 1 });
      const rg = w(p, 'ring'), pv = seg(d, rg[0], rg[1]); set(o.ring, { cx, cy, r: lerp(8, 60, oC(pv)), opacity: d < rg[0] || pv >= 1 ? 0 : 0.7 * (1 - pv) });
      const fl = w(p, 'fly');
      o.drops.forEach((e, i) => { const [ang, v0, r0] = DROPS_D[i], rad = ang * Math.PI / 180, life = seg(d, fl[0], fl[1]), s = life * 0.75;
        set(e, { cx: cx + Math.cos(rad) * v0 * s * 0.55, cy: cy + Math.sin(rad) * v0 * s + 0.5 * 1400 * s * s, r: Math.max(r0 * (1 - 0.6 * life), 0), opacity: d < fl[0] || life >= 1 ? 0 : 1 - Math.pow(life, 3) }); });
    }
    if (o.v === 'E') {
      const [px, py] = ctx.pointer || [cx, cy];
      const rg = w(p, 'ring'), pv = seg(d, rg[0], rg[1]); set(o.ring, { cx: px, cy: py, r: lerp(18, 44, oC(pv)), opacity: d < rg[0] || pv >= 1 ? 0 : 0.6 * (1 - pv) });
      // 커서가 없는 터치에서만 원을 직접 그림 (PC 는 커서 쪽에서 그림)
      const a = ctx.touch ? seg(d, -150, -70) * (1 - seg(d, p.shrink.dur + p.spring.dur, p.shrink.dur + p.spring.dur + 200)) : 0;
      const size = discSize(d, p); show(o.disc, a); Object.assign(o.disc.style, { left: px - size / 2 + 'px', top: py - size / 2 + 'px', width: size + 'px', height: size + 'px' });
    }
    if (o.v === 'F') {
      const Gi = p.glowIn.dur, Go = p.glowOut.dur, gg = d < 0 ? 0 : d < Gi ? d / Gi : 1 - ioC(seg(d, Gi, Gi + Go));
      show(o.glow, gg); Object.assign(o.glow.style, { left: B.x + 'px', top: B.y + 'px', width: B.w + 'px', height: B.h + 'px', borderRadius: (B.r || 0) + 'px', boxShadow: `0 0 22px 6px color-mix(in oklab, var(--color-click-blue) ${45 * gg}%, transparent)` });
    }
  }
  // 커서 누름 크기 (0.88배)
  const pressScale = (d, p) => { const [d0, d1] = w(p, 'down'), [u0, u1] = w(p, 'up'); return 1 - 0.12 * seg(d, d0, d1) * (1 - seg(d, u0, u1)); };
  // 효과가 끝나는 시점(ms, 누름 기준)
  const effectEnd = (v, p) => Math.max(w(p, 'up')[1], ...STEPS[v].map(s => s.win(p)[1]));
  // 본 영상에서 쓰는 효과 값(커서 이동 · 멈춤 · 유지 · 반복은 영상 단계가 정함)
  const effectKeys = v => ['down', 'up', ...STEPS[v].map(s => s.key)];

  g.ClickFX = { SCENES, VARIANTS, COMMON, STEPS, timeline, defaults, merge, loadState, saveState, KEY, buildPanel, renderPanel, activeStep, PW, PH,
    buildOverlay, destroyOverlay, renderOverlay, discSize, pressScale, effectEnd, effectKeys };
})(window);
