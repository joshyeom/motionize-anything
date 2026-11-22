// 공용 도구 (장면 파일이 쓰는 부품 · 진행값 · 움직임). 사용법은 CONTRACT.md.
// 좌표와 크기는 모두 무대 좌표 px(1920x1080, 왼쪽 위 0,0)다. 시간은 기준 초(ctx.t)다.
// CSS 애니메이션, CSS transition, 난수, 현재 시각을 쓰지 않는다. 같은 t 면 같은 그림이다.
(function (g) {
  // ---- 색 · 글꼴 · 문장 자리 ----
  const C = {
    bg: 'rgb(242,244,246)', card: 'rgb(255,255,255)', ink: 'rgb(25,31,40)',
    sub: 'rgb(107,118,132)', line: 'rgb(229,232,235)', blue: 'rgb(31,102,241)',
  };
  const F = { sans: '"Pretendard Variable", Pretendard, -apple-system, sans-serif', mono: '"SF Mono", Menlo, monospace' };
  const SENT = { x: 120, 1: { y: 114, h: 48, size: 40, weight: 700 }, 2: { y: 166, h: 44, size: 34, weight: 600 } };
  const BD = {
    line: `1px solid ${C.line}`, dash: `2px dashed ${C.sub}`, blue: `2px solid ${C.blue}`, gray2: `2px solid ${C.sub}`,
  };

  const css = document.createElement('style');
  css.textContent = `
#stage .k{box-sizing:border-box;white-space:nowrap;-webkit-font-smoothing:antialiased;}
#stage .k-sans{font-family:${F.sans};}
#stage .k-mono{font-family:${F.mono};}
#stage .k-num{font-variant-numeric:tabular-nums;}
#stage .k-bd{left:0;top:0;width:100%;height:100%;box-sizing:border-box;border-radius:inherit;}
#stage .k-view{left:0;top:0;width:1920px;height:1080px;}
`;
  document.head.appendChild(css);

  // ---- 수학 ----
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ioC = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);   // 나타남 · 장면 전환
  const oC = p => 1 - Math.pow(1 - p, 3);
  // 감속 이동: 엔진 커서 glide 와 같은 cubic-bezier(.3,0,.12,1) (index.html 의 bez 와 같은 식)
  function ease(p) {
    const x1 = 0.3, y1 = 0, x2 = 0.12, y2 = 1; let lo = 0, hi = 1, u = p;
    for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < p) lo = u; else hi = u; }
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  }
  const rgb = s => s.match(/\d+/g).map(Number);
  const mixColor = (a, b, p) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], p))).join(',')})`; };

  // ---- 단계 진행값 (ctx = render 가 받는 값) ----
  const prog = (ctx, id) => seg(ctx.t, ctx.T[id].s, ctx.T[id].e);                                   // 단계 전체 0~1
  const sub = (ctx, id, ms0, ms) => seg(ctx.t, ctx.T[id].s + ms0 / 1000, ctx.T[id].s + (ms0 + ms) / 1000);   // 단계 시작 ms0 뒤부터 ms 동안 0~1 (ms 0 이면 그 순간부터 1)

  // ---- 상자 하나 만들기 (모든 부품의 바탕) ----
  // o: x y w h, bg, radius, border(선 CSS), border2(바뀔 선 CSS, 처음 불투명도 0), text, font('sans'|'mono'), size, weight, color,
  //    align('left'|'center'|'right'), pad(글 쪽 안쪽 여백), num(true 면 tabular-nums)
  function box(root, o) {
    const el = document.createElement('div');
    el.className = `k k-${o.font || 'sans'}${o.num ? ' k-num' : ''}`;
    const st = el.style;
    st.left = o.x + 'px'; st.top = o.y + 'px';
    if (o.w != null) st.width = o.w + 'px';
    if (o.h != null) { st.height = o.h + 'px'; st.lineHeight = o.h + 'px'; }
    if (o.bg) st.background = o.bg;
    if (o.radius != null) st.borderRadius = o.radius + 'px';
    if (o.size) st.fontSize = o.size + 'px';
    if (o.weight) st.fontWeight = o.weight;
    st.color = o.color || C.ink;
    const align = o.align || 'left', pad = o.pad || 0;
    st.textAlign = align;
    if (align === 'left') st.paddingLeft = pad + 'px';
    if (align === 'right') st.paddingRight = pad + 'px';
    if (o.text != null) { el.t = document.createElement('span'); el.t.textContent = o.text; el.appendChild(el.t); }
    const layer = b => { const d = document.createElement('div'); d.className = 'k-bd'; d.style.border = b; el.appendChild(d); return d; };
    if (o.border) el.bd = layer(o.border);
    if (o.border2) { el.bd2 = layer(o.border2); el.bd2.style.opacity = 0; }
    el._b = { x: o.x, y: o.y, w: o.w || 0, h: o.h || 0 };
    root.appendChild(el);
    return el;
  }

  // ---- 부품 ----
  const row = (root, o) => box(root, { h: 72, size: 30, weight: 600, ...o, font: 'mono', bg: C.card, radius: 12, pad: o.pad ?? 24, border: BD.line, border2: BD.blue });
  const file = (root, o) => box(root, { size: 30, weight: 600, ...o, font: 'mono', bg: C.card, radius: 12, pad: o.pad ?? 24, border: BD[o.state || 'line'], border2: BD.blue });
  const card = (root, o) => box(root, { size: 28, weight: 600, ...o, font: 'sans', bg: C.card, radius: 12, pad: o.pad ?? 24, border: BD.gray2, border2: BD.blue });
  const slot = (root, o) => box(root, { ...o, radius: o.radius ?? 12, border: BD.dash });
  const panel = (root, o) => box(root, { ...o, bg: o.bg ?? C.card, radius: o.radius ?? 12, border: o.border ?? BD.line });
  const bar = (root, o) => box(root, { h: 20, ...o, bg: o.color || C.sub, radius: (o.h || 20) / 2 });
  const label = (root, o) => box(root, { font: 'sans', size: 28, weight: 500, color: C.sub, ...o });
  const count = (root, o) => box(root, { size: 72, weight: 800, color: C.blue, ...o, font: 'sans', num: true });
  const pr = (root, o) => box(root, { text: 'PR', size: 34, weight: 700, ...o, font: 'sans', bg: C.blue, color: C.card, radius: 12, align: 'center' });
  // 태그: 폭은 글에 맞춘다(o.w 를 쓰지 않음). tone 'blue' = 파랑 글 · 파랑 2px, 'gray' = 회색 글 · 선 1px. bg 기본 흰색
  // o.right(무대 x)를 주면 x 대신 오른쪽 끝을 그 x 에 맞춘다(root 가 무대 전체 1920 폭일 때)
  function tag(root, o) {
    const h = o.h || 48, blue = (o.tone || 'blue') === 'blue';
    const el = box(root, { ...o, w: null, h, font: 'sans', size: 28, weight: 500, color: blue ? C.blue : C.sub, bg: o.bg || C.card, radius: h / 2, border: blue ? BD.blue : BD.line });
    el.style.padding = '0 16px';
    if (o.right != null) { el.style.left = 'auto'; el.style.right = (1920 - o.right) + 'px'; }
    return el;
  }
  // 배지: 흰 바탕 · 파랑 2px · 파랑 고정폭 글, 모서리 10. 글 오른쪽 끝을 o.right(무대 x)에 맞춘다
  const badge = (root, o) => box(root, { size: 32, weight: 600, ...o, font: 'mono', bg: C.card, color: C.blue, radius: 10, border: BD.blue, align: 'right', pad: o.right != null ? o.x + o.w - o.right : 12 });
  // 경로: 카드 없는 고정폭 글, 오른쪽 끝을 x + w 에 맞춘다(글이 길어도 왼쪽으로 늘어남)
  function path(root, o) {
    const el = box(root, { size: 32, weight: 500, color: C.sub, ...o, font: 'mono', w: null });
    el.style.left = 'auto'; el.style.right = (1920 - (o.x + o.w)) + 'px';
    el._b = { x: o.x, y: o.y, w: o.w, h: o.h };
    return el;
  }
  // 원본 카드 150x100: 회색 바탕, 안쪽 막대 2개(el.bars 의 불투명도로 흐리게)
  function srccard(root, o) {
    const el = box(root, { x: o.x, y: o.y, w: 150, h: 100, bg: C.line, radius: 12, border: BD.line });
    el.bars = document.createElement('div'); el.bars.className = 'k-bd'; el.insertBefore(el.bars, el.firstChild);
    bar(el.bars, { x: 24, y: 30, w: 102, h: 12 }); bar(el.bars, { x: 24, y: 58, w: 66, h: 12 });
    return el;
  }
  // 직선 화살표(SVG, 무대 좌표). el.draw(p): 시작점에서 끝점 쪽으로 0~1 만큼 자란다(p 0 이면 숨김). 화살촉은 선 끝을 따른다
  function arrow(root, { x1, y1, x2, y2, color = C.blue, width = 3, head = 14 }) {
    const NS = 'http://www.w3.org/2000/svg', el = document.createElementNS(NS, 'svg');
    el.setAttribute('width', 1920); el.setAttribute('height', 1080);
    el.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    const line = document.createElementNS(NS, 'line'), tip = document.createElementNS(NS, 'polygon');
    line.setAttribute('stroke', color); line.setAttribute('stroke-width', width); line.setAttribute('stroke-linecap', 'butt');
    tip.setAttribute('fill', color);
    el.append(line, tip); root.appendChild(el);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    el.draw = p => {
      if (p <= 0.001) { el.style.display = 'none'; return; }
      el.style.display = '';
      const d = len * clamp(p), tx = x1 + ux * d, ty = y1 + uy * d, base = Math.min(head, d), bx = tx - ux * base, by = ty - uy * base, hw = head * 0.45;
      line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', bx); line.setAttribute('y2', by);
      tip.setAttribute('points', `${tx},${ty} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`);
    };
    el.draw(0);
    return el;
  }
  // 코드 한 줄(고정폭, ink). hl 조각(첫 번째 일치)은 el.hl span 으로 따로 둔다. 글은 textContent 로만 넣는다
  function code(root, { x, y, h, text, hl, size = 26, weight = 500 }) {
    const el = box(root, { x, y, h, text: '', font: 'mono', size, weight, color: C.ink }), i = hl ? text.indexOf(hl) : -1;
    if (i < 0) { el.t.textContent = text; return el; }
    el.hl = document.createElement('span'); el.hl.textContent = hl;
    el.t.append(document.createTextNode(text.slice(0, i)), el.hl, document.createTextNode(text.slice(i + hl.length)));
    return el;
  }
  // 문장 자리: line 1 = 위 문장(y 114, 40px 700), 2 = 아래 문장(y 166, 34px 600)
  const sentence = (root, text, line = 1) => box(root, { x: SENT.x, ...SENT[line], text, font: 'sans', color: C.ink });
  // 구도: 장면 안에서 통째로 바꾸는 묶음(1920x1080). 장면 안 구도 교체에 쓴다
  function view(root) { const el = document.createElement('div'); el.className = 'k-view'; root.appendChild(el); return el; }

  // ---- 그리기 ----
  function show(el, o) { el.style.opacity = o; el.style.display = o <= 0.001 ? 'none' : ''; }
  // 만든 위치에서 dx, dy 만큼 옮기고 가운데 기준으로 s 배, 불투명도 o
  function pose(el, { dx = 0, dy = 0, s = 1, o = 1 } = {}) {
    show(el, o);
    el.style.transform = dx || dy || s !== 1 ? `translate(${dx}px,${dy}px) scale(${s})` : '';
  }
  // 나타남: p 0~1 → 불투명도 0→1, 16px 위로 이동 (p 는 보통 sub(ctx, id, 0, 300))
  function appear(el, p) { const e = ioC(p); pose(el, { dy: 16 * (1 - e), o: e }); }
  const center = el => [el._b.x + el._b.w / 2, el._b.y + el._b.h / 2];
  // 곡선 조절점: 직선 경로 가운데에서 dir 방향으로 2n px. dir: 'down' 'up' 'left' 'right' 또는 [ux, uy]
  function ctrl(a, b, dir, n) {
    const u = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir] || dir;
    return [(a[0] + b[0]) / 2 + u[0] * 2 * n, (a[1] + b[1]) / 2 + u[1] * 2 * n];
  }
  // 2차 베지어 위 점 (c 가 없으면 직선)
  function curve(p, a, b, c) {
    if (!c) return [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
    const u = 1 - p; return [u * u * a[0] + 2 * u * p * c[0] + p * p * b[0], u * u * a[1] + 2 * u * p * c[1] + p * p * b[1]];
  }
  // 곡선 이동: el 의 가운데를 from → to(무대 좌표 가운데 점)로. p 는 시간 진행값 0~1, 위치는 ease(p)(도착할 때 감속)
  function moveAlong(el, p, from, to, c, { s = 1, o = 1 } = {}) {
    const [x, y] = curve(ease(p), from, to, c), [cx, cy] = center(el);
    pose(el, { dx: x - cx, dy: y - cy, s, o });
  }
  // 선 바꾸기: border → border2 로 p 만큼 (두 선 층의 불투명도를 바꿈)
  function borderTo(el, p) { if (el.bd) el.bd.style.opacity = 1 - p; if (el.bd2) el.bd2.style.opacity = p; }

  // ---- 전환 슬라이드 (장면 사이 · 장면 안 구도 교체 공용) ----
  // st = ctx.T[id] (trans · loop 단계). 나가는 쪽은 out 동안 왼쪽 160px 이동하며 사라지고,
  // 들어오는 쪽은 inDelay 뒤 in 동안 오른쪽 160px 에서 제자리로 오며 나타난다(inDelay ≥ out 이라 겹치지 않음)
  function slide(t, st) {
    const v = st.v, po = ioC(seg(t, st.s, st.s + v.out / 1000)), pi = ioC(seg(t, st.s + v.inDelay / 1000, st.s + (v.inDelay + v.in) / 1000));
    return { out: { dx: -160 * po, o: 1 - po }, in: { dx: 160 * (1 - pi), o: pi } };
  }
  // 장면 안 구도 교체: id 단계 전에는 outView 만, 뒤에는 inView 만 보인다
  function swap(ctx, id, outView, inView) {
    const k = slide(ctx.t, ctx.T[id]);
    pose(outView, { dx: k.out.dx, o: k.out.o }); pose(inView, { dx: k.in.dx, o: k.in.o });
  }

  // ---- 재기 (measure 안에서만. 글꼴을 불러온 뒤 무대 배율 1) ----
  // 상자 위 끝에서 글 기준선까지 거리(px)
  function baselineOf(el) {
    const cs = getComputedStyle(el), p = document.createElement('div');
    p.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};line-height:${cs.lineHeight};font-variant-numeric:${cs.fontVariantNumeric}`;
    p.textContent = el.textContent || '가';
    const m = document.createElement('span'); m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    p.appendChild(m); document.getElementById('stage').appendChild(p);
    const b = m.offsetTop; p.remove(); return b;
  }
  // el 의 기준선을 ref 의 기준선에 맞춰 el 의 top 을 고친다
  function alignBaseline(ref, el) {
    const y = ref._b.y + baselineOf(ref) - baselineOf(el);
    el.style.top = y + 'px'; el._b.y = y; return y;
  }


  // ======================= 부품 추가 (리액트 설명 모션) =======================
  // 글 폭 재기: 숨은 요소를 #stage 에 만들어 잰다. measure 안(무대 배율 1)에서만 쓴다. pre 면 공백을 그대로 센다
  function textWidth(text, { font = 'sans', size = 28, weight = 500, pre = false } = {}) {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;white-space:${pre ? 'pre' : 'nowrap'};font-family:${F[font]};font-size:${size}px;font-weight:${weight}`;
    p.textContent = text;
    document.getElementById('stage').appendChild(p);
    const w = p.getBoundingClientRect().width; p.remove(); return w;
  }

  // 코드 여러 줄(고정폭, 공백 그대로). lines: 글 또는 {text, hl: [강조할 조각(각각 첫 번째 일치)]}. 글은 textContent 로만 넣는다
  // 돌려주는 줄 요소: el.hls(강조 조각 span 목록), el.hlRect(i)(measure 안에서 그 조각의 무대 좌표 사각형), el.endX()(글 오른쪽 끝 x)
  function codeLines(root, { x, y, lineH = 42, size = 22, weight = 500, lines }) {
    return lines.map((ln, n) => {
      const o = typeof ln === 'string' ? { text: ln } : ln;
      const el = box(root, { x, y: y + n * lineH, h: lineH, text: '', font: 'mono', size, weight, color: C.ink });
      el.style.whiteSpace = 'pre';
      const marks = [];
      (o.hl || []).forEach(h => { const i = o.text.indexOf(h); if (i >= 0) marks.push([i, h]); });
      marks.sort((a, b) => a[0] - b[0]);
      el.hls = []; let at = 0;
      marks.forEach(([i, h]) => {
        el.t.appendChild(document.createTextNode(o.text.slice(at, i)));
        const s = document.createElement('span'); s.textContent = h; el.t.appendChild(s); el.hls.push(s); at = i + h.length;
      });
      el.t.appendChild(document.createTextNode(o.text.slice(at)));
      const wid = s => textWidth(s, { font: 'mono', size, weight, pre: true });
      el.hlRect = i => { const h = el.hls[i].textContent, k = o.text.indexOf(h); return { x: x + wid(o.text.slice(0, k)), y: el._b.y, w: wid(h), h: lineH }; };
      el.endX = () => x + wid(o.text);
      return el;
    });
  }

  // 파랑 테두리 사각형(속이 빈 강조). el.at(사각형, 바깥 여백, 모서리)로 자리를 정한다
  function outline(root, { radius = 10, width = 2 } = {}) {
    const el = box(root, { x: 0, y: 0, w: 0, h: 0, radius, border: `${width}px solid ${C.blue}` });
    el.at = (r, pad = 0, rad) => {
      Object.assign(el.style, { left: (r.x - pad) + 'px', top: (r.y - pad) + 'px', width: (r.w + 2 * pad) + 'px', height: (r.h + 2 * pad) + 'px' });
      if (rad != null) el.style.borderRadius = rad + 'px';
    };
    return el;
  }

  // 꺾은선 화살표(SVG, 무대 좌표). el.draw(p): 시작점에서 p(0~1) 만큼 자란다. el.setPoints(점 목록)으로 점을 다시 정한다. head 0 이면 화살촉 없음
  function poly(root, { points, color = C.blue, width = 3, head = 14 }) {
    const NS = 'http://www.w3.org/2000/svg', el = document.createElementNS(NS, 'svg');
    el.setAttribute('width', 1920); el.setAttribute('height', 1080);
    el.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    const path = document.createElementNS(NS, 'path'), tip = document.createElementNS(NS, 'polygon');
    path.setAttribute('stroke', color); path.setAttribute('stroke-width', width); path.setAttribute('fill', 'none'); path.setAttribute('stroke-linejoin', 'round');
    tip.setAttribute('fill', color);
    el.append(path, tip); root.appendChild(el);
    let pts = points, segs = [], total = 1;
    el.setPoints = list => {
      pts = list; segs = []; total = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
      total = total || 1;
    };
    // 시작점에서 d 만큼 간 곳의 점과 방향
    const at = d => {
      let rest = d;
      for (let i = 0; i < segs.length; i++) {
        if (rest <= segs[i] || i === segs.length - 1) {
          const u = segs[i] ? clamp(rest / segs[i]) : 1, a = pts[i], b = pts[i + 1];
          return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), ux: (b[0] - a[0]) / (segs[i] || 1), uy: (b[1] - a[1]) / (segs[i] || 1), i, u };
        }
        rest -= segs[i];
      }
    };
    el.draw = p => {
      if (p <= 0.001) { el.style.display = 'none'; return; }
      el.style.display = '';
      const d = total * clamp(p), base = head ? Math.min(head, d) : 0, end = at(d), line = at(d - base);
      let dstr = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i <= line.i; i++) dstr += ` L ${pts[i][0]} ${pts[i][1]}`;
      dstr += ` L ${line.x} ${line.y}`;
      path.setAttribute('d', dstr);
      if (head) {
        const hw = head * 0.45;
        tip.setAttribute('points', `${end.x},${end.y} ${end.x - end.ux * base - end.uy * hw},${end.y - end.uy * base + end.ux * hw} ${end.x - end.ux * base + end.uy * hw},${end.y - end.uy * base - end.ux * hw}`);
      }
    };
    el.setPoints(points); el.draw(0);
    return el;
  }

  // ======================= UI 부품 (플러그인의 ui.css 로 그림) =======================
  // 버튼, 배너, 입력 필드 같은 화면 조각은 ui.css 의 작은 CSS 변수와 클래스(mx-)로 그린다. CSS 주소는 index.html 기준 상대 경로다.
  const UI_CSS = 'ui.css';
  const uiLoads = [], uiEls = [];
  // link 하나를 붙이고 불러오기 완료 약속을 모은다. 못 불러오면 window.ready 가 실패한다(맨 글자 프레임을 저장하지 않게)
  function uiLink(parent) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = UI_CSS;
    uiLoads.push(new Promise((ok, fail) => { l.onload = ok; l.onerror = () => fail(new Error('ui.css 를 불러오지 못함: ' + l.href)); }));
    parent.appendChild(l);
  }
  const UI_HOST_CSS = `
:host{display:block;}
.kw{position:absolute;left:0;top:0;transform-origin:0 0;font-family:var(--mx-font-family);font-size:14px;
  line-height:1.5;color:var(--mx-text);font-weight:400;white-space:normal;text-align:left;
  letter-spacing:normal;-webkit-font-smoothing:antialiased;}
.kw *,.kw *::before,.kw *::after{transition:none!important;animation:none!important;}
`;
  // kit.ui(root, { x, y, w, h, s = 1, html }): 무대 좌표 (x, y)에 ui.css 클래스로 쓴 마크업 html 을 그린 요소를 만든다.
  //   w, h 는 확대 전 실제 크기(px), s 는 확대 배율(왼쪽 위 기준). el._b = { x, y, w: w*s, h: h*s }. kit.pose, kit.moveAlong, kit.show 로 움직인다.
  //   el.setHtml(html) = 마크업 교체. el.inner = 마크업을 담은 요소(shadow root 안, scale(s) 적용).
  //   el.resize(w, h) = 확대 전 크기 변경, el.moveTo(x, y) = 자리 변경, el.natural() = 마크업의 확대 전 내용 크기 {w, h}(measure 안에서만).
  //   el 에 직접 붙인 자식(돌기, 테두리, 막대)은 slot 으로 마크업 위에 보인다(좌표는 el 왼쪽 위 기준, 확대하지 않음).
  // 마크업은 shadow root 안에 넣는다. 무대의 「#stage div 는 모두 position:absolute」 규칙이 마크업에 들어가지 않게 하기 위해서다.
  // 상태 전환(transition)은 끈다. 같은 t 면 같은 그림이어야 하기 때문이다.
  function ui(root, { x, y, w, h, s = 1, html }) {
    const el = document.createElement('div');
    el.className = 'k-uiHost';
    const sh = el.attachShadow({ mode: 'open' });
    uiLink(sh);
    const style = document.createElement('style'); style.textContent = UI_HOST_CSS;
    const box = document.createElement('div'); box.className = 'kw';
    box.style.transform = s !== 1 ? `scale(${s})` : '';
    sh.append(style, box, document.createElement('slot'));
    el.inner = box; el.s = s;
    el.setHtml = markup => { box.innerHTML = markup; };
    el.resize = (nw, nh) => {
      Object.assign(box.style, { width: nw + 'px', height: nh + 'px' });
      Object.assign(el.style, { width: nw * s + 'px', height: nh * s + 'px' });
      el._b.w = nw * s; el._b.h = nh * s;
      if (el.layoutStuds) el.layoutStuds();
    };
    el.moveTo = (nx, ny) => { el._b.x = nx; el._b.y = ny; el.style.left = nx + 'px'; el.style.top = ny + 'px'; };
    el.natural = () => {
      const hidden = [];
      for (let a = el; a && a.id !== 'stage'; a = a.parentElement) if (a.style.display === 'none') { hidden.push(a); a.style.display = ''; }
      const old = box.style.width; box.style.width = 'max-content';
      // getComputedStyle 의 폭과 높이는 transform 앞의 레이아웃 크기라서 자기 scale(s)과 조상의 kit.pose 확대, 축소가 들어가지 않는다
      const cs = getComputedStyle(box), out = { w: Math.ceil(parseFloat(cs.width)), h: parseFloat(cs.height) };
      box.style.width = old; hidden.forEach(a => { a.style.display = 'none'; });
      return out;
    };
    el._b = { x, y, w: w * s, h: h * s };
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.resize(w, h); el.setHtml(html);
    root.appendChild(el); uiEls.push(el);
    return el;
  }
  // ui.css 를 모두 불러오고 글꼴(Pretendard)까지 불러오면 끝나는 약속. index.html 의 window.ready 가 기다린다
  function uiReady() {
    return Promise.all(uiLoads).then(() => {
      const text = uiEls.map(e => e.inner.textContent).join('') + '0123456789';
      return Promise.all([400, 500, 600, 700].map(wt => document.fonts.load(`${wt} 16px "Pretendard Variable"`, text)));
    });
  }
  // 작은 아이콘(info, check, warn). 색은 부모의 color 를 따른다. 문서 안 kit 그림에 쓸 때는 display:block 으로 둔다
  const ICONS = {
    info: '<circle cx="10" cy="10" r="8.5" fill="currentColor"/><path d="M10 9v5M10 6v.01" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    check: '<circle cx="10" cy="10" r="8.5" fill="currentColor"/><path d="M 6.2 10.2 l 2.5 2.5 5 -5.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    warn: '<path d="M10 2.2 18.4 17H1.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 7.8v4M10 14.3v.01" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  };
  const icon = (name, size) => `<svg style="display:block" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">${ICONS[name]}</svg>`;
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // 배너: ui.css 의 mx-Banner 마크업(data-tone, mx-Banner__icon, mx-Banner__body)을 kit.ui 로 그린다. s = 1 이 실제 크기(높이 49)
  // o: x y(왼쪽 위) 또는 cx y(가로 가운데), s(2.4), tone('warning'), text, strong(true 면 문구를 <strong> 강조어로), w(무대 px 폭을 정해 줌. 없으면 글 폭에 맞춤)
  // 폭은 measure 에서 el.fit() 으로 정한다. el.setStyle({ radius }) = 모서리 배율(1 = 12px)
  const BANNER_TEXT = '아직 처리하지 않은 항목이 있습니다.';
  // tone 별 아이콘 이름. error 도 경고 삼각형이다
  const TONES = {
    info: { icon: 'info' }, neutral: { icon: 'info' }, success: { icon: 'check' },
    warning: { icon: 'warn' }, error: { icon: 'warn' },
  };
  const bannerHtml = (tone, text, strong) => `<div class="mx-Banner" data-tone="${tone}"><span class="mx-Banner__icon">${icon(TONES[tone].icon, 20)}</span><div class="mx-Banner__body">${text ? (strong ? `<strong>${esc(text)}</strong>` : esc(text)) : '&nbsp;'}</div></div>`;
  function banner(root, o) {
    const s = o.s || 2.4, tone = o.tone || 'warning', text = o.text != null ? o.text : BANNER_TEXT, H = 49;
    const w0 = o.w ? o.w / s : 68 + [...text].length * 14 * 0.85;
    const el = ui(root, { x: o.x || 0, y: o.y, w: w0, h: H, s, html: bannerHtml(tone, text, o.strong) });
    el.tone = tone;
    el.setStyle = v => { if (v.radius != null) el.inner.firstElementChild.style.borderRadius = `calc(12px * ${v.radius})`; };
    const center = () => { if (o.cx != null) el.moveTo(o.cx - el._b.w / 2, el._b.y); };
    el.fit = () => { el.resize(o.w ? o.w / s : el.natural().w, H); center(); };
    center();
    return el;
  }

  // ======================= 공용 요소 추가 (레고 블록 그림) =======================
  // kit 이 직접 그리는 모양(레고 블록, 화면 판, 이름 태그, 선)은 kit.W 와 kit.C 값만 쓴다. 돌기(스터드) 44x14 모서리 6 은 k 배로 줄여 쓴다.
  // kit.W = 색 팔레트. ui.css 의 --mx-* 변수와 같은 값이다(둘을 함께 바꾼다).
  const W = {
    y50: '#FFFBEB',    // 노랑 50
    y100: '#FEF3C7',   // 노랑 100
    y200: '#FDE68A',   // 노랑 200 = 경고 테두리
    y300: '#FCD34D',   // 노랑 300
    y500: '#F59E0B',   // 노랑 500 = 경고 아이콘
    y800: '#92400E',   // 노랑 800 = 경고 글자
    line: '#E2E8F0',   // 기본 테두리
    strong: '#CBD5E1', // 진한 테두리
    muted: '#F1F5F9',  // 옅은 배경, 보조 버튼 배경
    g200: '#D4D4D8',   // 옅은 회색(막대)
    blue: '#2563EB',   // 파랑 = 정보 아이콘, 강조
    black: '#000000',  // 기본 버튼 배경
    hover: '#1F2937',  // 기본 버튼 호버
    white: '#FFFFFF',  // 바탕
    text: '#0F172A',   // 기본 글자
    blue50: '#EFF6FF',  // 정보 배경
    blue100: '#DBEAFE',
    blue200: '#BFDBFE', // 정보 테두리
    n300: '#94A3B8',
    subtle: '#64748B',  // 보조 글자
  };
  // tone 의 아이콘 그림(경고, 정보, 체크). 색은 부모의 color 를 따른다
  const iconSvg = (tone, size) => icon(TONES[tone || 'warning'].icon, size);
  // 블록 윗면 돌기: el 폭에 맞춰 같은 간격으로 놓는다. el.layoutStuds() 로 폭이 바뀐 뒤 다시 놓는다
  function studs(el, { fill, edge, k = 1 }) {
    el.studs = [];
    el.layoutStuds = () => {
      el.studs.forEach(d => d.remove()); el.studs = [];
      const w = el._b.w, sw = 44 * k, sh = 14 * k, n = Math.max(1, Math.round(w / (96 * k)));
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div'); d.className = 'k';
        Object.assign(d.style, {
          left: ((i + 0.5) * w / n - sw / 2) + 'px', top: (-sh) + 'px', width: sw + 'px', height: sh + 'px',
          background: fill, border: '1.5px solid ' + edge, borderBottom: 'none', borderRadius: (6 * k) + 'px ' + (6 * k) + 'px 0 0',
        });
        el.appendChild(d); el.studs.push(d);
      }
    };
    el.layoutStuds();
    return el;
  }
  // 레고 블록: 둥근 몸통 + 윗면 돌기. o: x y w h color edge stud(돌기 색) radius k text size weight textColor align pad font
  function brick(root, o) {
    const edge = o.edge || W.line;
    const el = box(root, {
      x: o.x, y: o.y, w: o.w, h: o.h, bg: o.color, radius: o.radius != null ? o.radius : 10, border: '1.5px solid ' + edge,
      text: o.text, font: o.font || 'sans', size: o.size || 26, weight: o.weight || 700, color: o.textColor || C.ink, align: o.align || 'center', pad: o.pad || 0,
    });
    el.style.boxShadow = 'inset 0 -6px 0 rgba(0,0,0,.07)';
    studs(el, { fill: o.stud || o.color, edge, k: o.k || 1 });
    el.resize = (w, h) => {
      el._b.w = w; el._b.h = h; Object.assign(el.style, { width: w + 'px', height: h + 'px', lineHeight: h + 'px' });
      el.layoutStuds(); if (el.onResize) el.onResize(w, h);
    };
    el.moveTo = (x, y) => { el._b.x = x; el._b.y = y; el.style.left = x + 'px'; el.style.top = y + 'px'; };
    return el;
  }
  // 배너 블록: 배너(mx-Banner) 위에 돌기. 폭은 el.fit() 에서 정해지고 돌기도 다시 놓인다(el.resize 가 돌기를 다시 놓음)
  function bannerBlock(root, o) {
    const el = banner(root, o);
    studs(el, { fill: o.stud || W.y100, edge: o.edge || W.y200, k: o.k || 1 });
    return el;
  }
  // 작은 배너 블록: 배너(문구 없음) 위에 문구 대신 막대(색 = warning 글자색 kit.W.y800). o: x y w(무대 px) s k
  function miniBanner(root, o) {
    const s = o.s || 1;
    const el = bannerBlock(root, { ...o, text: '', w: o.w, s });
    el.bar = bar(el, { x: 48 * s, y: (49 * s - 10 * s) / 2, w: (o.w - 68 * s) * 0.85, h: 10 * s, color: W.y800 });
    return el;
  }
  // 버튼 블록: mx-Button(solid, sm 높이 40)을 높이 h(무대 px)에 맞춰 확대하고 돌기를 얹는다. variant 'primary'(저장) | 'secondary'(취소)
  // o: x y w h(무대 px) text variant k. text 가 null 이면 문구 없는 버튼(작은 그림용, 막대는 장면이 얹는다)
  function buttonBlock(root, o) {
    const sec = o.variant === 'secondary', s = o.h / 40;
    const html = `<button class="mx-Button" type="button" tabindex="-1" data-style="solid" data-color="${sec ? 'secondary' : 'primary'}" data-size="sm" style="width:100%">${o.text != null ? esc(o.text) : '&nbsp;'}</button>`;
    const el = ui(root, { x: o.x, y: o.y, w: o.w / s, h: 40, s, html });
    studs(el, { fill: sec ? W.muted : W.black, edge: sec ? W.strong : W.hover, k: o.k || 1 });
    return el;
  }
  // 선택(Radio) 블록: 블록 몸통(kit) 안에 mx-Radio(md 20px, 1.5 배) 3개와 막대 3개. 첫 번째가 선택(data-value="on")
  function radioBlock(root, o) {
    const el = brick(root, { ...o, color: W.muted, edge: W.strong, stud: W.white, text: null });
    const R = 1.5, parts = [];
    for (let i = 0; i < 3; i++) {
      const radio = ui(el, { x: 0, y: 0, w: 20, h: 20, s: R, html: `<label class="mx-Radio" data-size="md" data-value="${i === 0 ? 'on' : 'off'}" style="display:flex"><span class="mx-Radio__box"><span class="mx-Radio__dot"></span></span></label>` });
      const line = bar(el, { x: 0, y: 0, w: 100, h: 14, color: W.g200 });
      parts.push({ radio, line });
    }
    el.onResize = (w, h) => {
      const cell = (w - 40) / 3;
      parts.forEach((p, i) => {
        const x = 20 + i * cell;
        p.radio.moveTo(x, (h - 20 * R) / 2);
        Object.assign(p.line.style, { left: x + 44 + 'px', top: (h - 14) / 2 + 'px', width: Math.max(20, cell - 44 - 24) + 'px' });
      });
    };
    el.onResize(o.w, o.h);
    return el;
  }
  // 입력(Textarea) 블록: 블록 몸통(kit) 안에 mx-Textarea 필드(높이 89 를 블록 높이 - 32 에 맞춰 줄임)와 옅은 막대 2개
  function inputBlock(root, o) {
    const el = brick(root, { ...o, color: W.muted, edge: W.strong, stud: W.white, text: null });
    const FS = (o.h - 32) / 89;
    const field = ui(el, { x: 18, y: 16, w: (o.w - 36) / FS, h: 89, s: FS, html: '<div class="mx-Field mx-Textarea" data-state="default"><label class="mx-Field__box"><textarea class="mx-Field__value" tabindex="-1" readonly></textarea></label></div>' });
    const l1 = bar(el, { x: 36, y: 34, w: 0, h: 14, color: W.g200 }), l2 = bar(el, { x: 36, y: 64, w: 0, h: 14, color: W.g200 });
    el.onResize = w => {
      field.resize((w - 36) / FS, 89);
      l1.style.width = (w - 36) * 0.7 + 'px'; l2.style.width = (w - 36) * 0.45 + 'px';
    };
    el.onResize(o.w, o.h);
    return el;
  }
  // 이름 태그: 한글 이름 + 작은 영문 이름. tone 'gray' | 'blue'. el.put(기준 x, y)로 놓는다(anchor 'c' 가운데 | 'l' 왼쪽 | 'r' 오른쪽). 폭은 글 폭을 재어 정하므로 measure 안에서 다시 put 한다
  function nameTag(root, { text, en, tone = 'gray', size = 28, enSize = 24, h = 46, anchor = 'c' }) {
    const blue = tone === 'blue';
    const el = box(root, { x: 0, y: 0, h, text, font: 'sans', size, weight: 700, color: blue ? C.blue : C.ink, bg: C.card, radius: h / 2, border: blue ? BD.blue : '1.5px solid ' + W.strong });
    el.style.padding = '0 18px';
    if (en) { el.en = document.createElement('span'); el.en.textContent = en; el.en.style.cssText = 'font-size:' + enSize + 'px;font-weight:500;color:' + C.sub + ';margin-left:10px'; el.appendChild(el.en); }
    el.put = (a, y) => {
      el.pa = a; el.py = y;
      const w = textWidth(text, { size, weight: 700 }) + (en ? 10 + textWidth(en, { size: enSize, weight: 500 }) : 0) + 36;
      const x = anchor === 'c' ? a - w / 2 : anchor === 'l' ? a : a - w;
      Object.assign(el.style, { left: x + 'px', top: y + 'px' }); el._b = { x, y, w, h };
      return el._b;
    };
    el.refit = () => el.put(el.pa, el.py);
    return el;
  }
  // 화면 판: 옅은 점 격자가 있는 흰 판 + 위쪽 화면 이름. el.setRect(x, y, w, h, k) 로 자리와 크기(k 배)를 정한다
  function plate(root, { x, y, w, h, title, titleSize = 28, radius = 16 }) {
    const el = box(root, { x, y, w, h, bg: C.card, radius, border: '1px solid ' + C.line });
    el.style.backgroundImage = 'radial-gradient(circle at 16px 16px, ' + W.line + ' 3px, transparent 3.5px)';
    el.style.backgroundSize = '32px 32px';
    el.heading = box(el, { x: 24, y: 14, h: 40, text: title, size: titleSize, weight: 700, color: C.ink });
    el.setRect = (rx, ry, rw, rh, kk = 1) => {
      Object.assign(el.style, { left: rx + 'px', top: ry + 'px', width: rw + 'px', height: rh + 'px' }); el._b = { x: rx, y: ry, w: rw, h: rh };
      Object.assign(el.heading.style, { left: 24 * kk + 'px', top: 14 * kk + 'px', fontSize: titleSize * kk + 'px', height: 40 * kk + 'px', lineHeight: 40 * kk + 'px' });
    };
    return el;
  }
  // 문장이 한 줄(max px)에 들어가도록 텍스트 크기를 min 까지 줄인다. 돌려주는 값 = 마지막 글 폭
  function fitSentence(el, max = 1680, min = 36) {
    let size = parseFloat(el.style.fontSize);
    const text = el.t.textContent, weight = el.style.fontWeight || 700;
    while (size > min && textWidth(text, { size, weight }) > max) size -= 1;
    el.style.fontSize = size + 'px';
    return textWidth(text, { size, weight });
  }


  // ======================= 부품 추가 (프로그램 박스, 조각 카드, 문서 묶음, 그림 카드) =======================
  // kit 이 직접 그리는 모양(프로그램 박스, 조각 카드, 문서 묶음, 점)은 kit.W 값만 쓴다. 사물이나 비유 그림은 그리지 않고 kit.img 로 놓는다
  const css2 = document.createElement('style');
  css2.textContent = '#stage .k-pbLab{position:absolute;left:0;top:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;line-height:1.25;}'
    + '#stage .k-pbLab span{display:block;}';
  document.head.appendChild(css2);

  // 프로그램 박스 tone: bg(배경) edge(테두리 색) dash(점선) color(제목) subColor(작은 글)
  const PROG_TONES = {
    main: { bg: W.white, edge: W.text, color: W.text, subColor: W.subtle },
    side: { bg: W.blue50, edge: W.blue, color: W.text, subColor: W.subtle },
    plain: { bg: W.white, edge: W.strong, color: W.text, subColor: W.subtle },
    off: { bg: W.muted, edge: W.n300, dash: true, color: W.subtle, subColor: W.subtle },
  };
  // 프로그램 박스: 모서리 20, 테두리 3px, 제목 34px 700 과 작은 글 24px 500 을 박스 가운데에. el.t = 제목 span, el.st = 작은 글 span(없으면 null)
  // el.setTone(tone) 은 값이 바뀔 때만 스타일을 바꾸므로 render 에서 매 프레임 불러도 된다
  function progBox(root, { x, y, w, h, title, sub, tone = 'main' }) {
    const el = box(root, { x, y, w, h });
    el.style.lineHeight = 'normal';
    el.body = document.createElement('div'); el.body.className = 'k-bd'; el.body.style.borderRadius = '20px';
    el.appendChild(el.body);
    const lab = document.createElement('span'); lab.className = 'k-pbLab';
    el.t = document.createElement('span'); el.t.textContent = title || ''; Object.assign(el.t.style, { fontSize: '34px', fontWeight: 700 });
    lab.appendChild(el.t);
    el.st = null;
    if (sub) { el.st = document.createElement('span'); el.st.textContent = sub; Object.assign(el.st.style, { fontSize: '24px', fontWeight: 500 }); lab.appendChild(el.st); }
    el.appendChild(lab);
    el.tone = null;
    el.setTone = t => {
      if (t === el.tone) return;
      el.tone = t; const v = PROG_TONES[t];
      el.body.style.background = v.bg; el.body.style.border = '3px ' + (v.dash ? 'dashed ' : 'solid ') + v.edge;
      el.t.style.color = v.color; if (el.st) el.st.style.color = v.subColor;
      if (el.onTone) el.onTone(v);
    };
    el.setTone(tone);
    return el;
  }
  // 사이드카 박스: 프로그램 박스 왼쪽 변에 연결 막대 2개(박스 밖 28, 두께 8), 아래 변 가운데에 바퀴 1개(지름 44, 절반이 박스 아래로 나옴)
  // 막대와 바퀴는 박스 뒤에 그린다(바퀴 위쪽 절반은 박스에 가려진다). el._b 는 박스 본체 기준
  function sidecarBox(root, o) {
    const el = progBox(root, { ...o, tone: o.tone || 'side' }), w = o.w, h = o.h;
    const mk = st => { const d = document.createElement('div'); d.className = 'k'; Object.assign(d.style, st); el.insertBefore(d, el.body); return d; };
    el.links = [0.3, 0.7].map(k => mk({ left: '-28px', top: (h * k - 4) + 'px', width: '31px', height: '8px', borderRadius: '4px' }));
    el.wheel = mk({ left: (w / 2 - 22) + 'px', top: (h - 22) + 'px', width: '44px', height: '44px', borderRadius: '50%', background: W.white });
    el.onTone = v => {
      el.links.forEach(d => { d.style.background = v.edge; });
      el.wheel.style.border = '8px solid ' + (v.dash ? W.n300 : W.text);
    };
    const t = el.tone; el.tone = null; el.setTone(t);
    return el;
  }
  // 조각 카드와 문서 묶음의 색 띠: blue 파랑, amber 노랑
  const CHUNK = { blue: W.blue, amber: W.y300 };
  // 조각 카드: 흰 배경, 모서리 10, 테두리 2px, 위쪽 색 띠(높이 14), 회색 막대 2개. 글자 없음
  function chunkCard(root, { x, y, w = 132, h = 88, kind = 'blue' }) {
    const el = box(root, { x, y, w, h, bg: W.white, radius: 10, border: '2px solid ' + W.strong });
    el.style.overflow = 'hidden';
    el.band = box(el, { x: 0, y: 0, w, h: 14, bg: CHUNK[kind] }); el.insertBefore(el.band, el.bd);
    const inner = h - 14;
    bar(el, { x: 16, y: 14 + inner * 0.3, w: (w - 32) * 0.82, h: 10, color: W.g200 });
    bar(el, { x: 16, y: 14 + inner * 0.62, w: (w - 32) * 0.5, h: 10, color: W.g200 });
    return el;
  }
  // 문서 묶음: 종이 3장(오른쪽 위로 12px 씩 어긋남). 맨 앞 종이에 색 띠와 회색 막대 5개. 제목(28px 700)과 작은 글(22px, 회색)은 묶음 아래 가운데
  // el._b 는 종이 부분 기준. el.papers = [맨 뒤, 가운데, 맨 앞], el.t = 제목, el.st = 작은 글
  function docStack(root, { x, y, w = 220, h = 270, title, sub, kind = 'blue' }) {
    const el = box(root, { x, y, w, h }), pw = w - 24, ph = h - 24;
    el.style.lineHeight = 'normal';
    el.papers = [[24, 0], [12, 12], [0, 24]].map(([px, py]) => box(el, { x: px, y: py, w: pw, h: ph, bg: W.white, radius: 8, border: '2px solid ' + W.strong }));
    const front = el.papers[2];
    front.style.overflow = 'hidden';
    const band = box(front, { x: 0, y: 0, w: pw, h: 18, bg: CHUNK[kind] }); front.insertBefore(band, front.bd);
    const step = (ph - 18 - 44) / 5;
    [0.8, 0.62, 0.8, 0.45, 0.7].forEach((k, i) => bar(front, { x: 20, y: 18 + 28 + i * step, w: (pw - 40) * k, h: 10, color: W.g200 }));
    const lab = (text, top, size, weight, color) => {
      const d = box(el, { x: w / 2, y: top, text, size, weight, color });
      d.style.transform = 'translateX(-50%)'; d.style.lineHeight = 'normal'; return d;
    };
    el.t = title ? lab(title, h + 14, 28, 700, W.text) : null;
    el.st = sub ? lab(sub, h + 54, 22, 500, W.subtle) : null;
    return el;
  }
  // 그림 카드: codex 이미지 생성으로 만든 그림(assets/)을 흰 카드(테두리 2px W.line, 모서리 radius, 안쪽 여백 pad) 위에 놓는다. card 가 false 면 카드 없이 그림만(여백 0)
  // w, h 는 카드 전체 크기(무대 px). 그림은 카드 안에서 비율을 유지하고(object-fit: contain) 가운데에 둔다. el.image = img 요소
  // src 는 index.html 기준 상대 경로. 스크립트와 같은 ASSET_V 를 붙여 브라우저 캐시를 피한다
  // el.at(fx, fy) = 그림 안 비율 좌표(0~1)의 무대 좌표 [x, y](kit.pose 로 움직이기 전 자리 기준, 그림 크기를 알아야 하므로 measure 안에서 부른다)
  const imgLoads = [];
  function img(root, { x, y, w, h, src, card = true, pad = 24, radius = 20 }) {
    const bw = card ? 2 : 0, p = card ? pad : 0, iw = w - 2 * (bw + p), ih = h - 2 * (bw + p);
    const el = box(root, card ? { x, y, w, h, bg: W.white, radius, border: bw + 'px solid ' + W.line } : { x, y, w, h });
    el.style.lineHeight = 'normal';
    const im = document.createElement('img');
    im.alt = '';
    im.style.cssText = 'position:absolute;left:' + (bw + p) + 'px;top:' + (bw + p) + 'px;width:' + iw + 'px;height:' + ih + 'px;object-fit:contain;display:block';
    const url = src + (typeof ASSET_V !== 'undefined' ? (src.includes('?') ? '&' : '?') + 'v=' + ASSET_V : '');
    im.src = url;
    el.appendChild(im);
    el.image = im;
    // 불러오기와 decode 가 끝나면 끝나는 약속. 실패하면 콘솔 오류를 남기고 실패를 그대로 넘긴다(window.ready 가 멈춰 그림 없는 프레임을 저장하지 않게)
    imgLoads.push(im.decode().catch(e => { console.error('kit.img: 그림을 불러오지 못했습니다 ' + url, e); throw e; }));
    el.at = (fx, fy) => {
      const nw = im.naturalWidth || iw, nh = im.naturalHeight || ih, k = Math.min(iw / nw, ih / nh), dw = nw * k, dh = nh * k;
      return [x + bw + p + (iw - dw) / 2 + fx * dw, y + bw + p + (ih - dh) / 2 + fy * dh];
    };
    return el;
  }
  // kit.img 로 만든 그림을 모두 불러오고 decode 하면 끝나는 약속. index.html 의 window.ready 가 기다린다
  const imgReady = () => Promise.all(imgLoads);
  // 이동하는 점(요청과 응답 표시): 원, 흰 테두리 4px. 처음에는 숨어 있다(kit.show, kit.moveAlong 으로 보인다)
  function packet(root, { x = 0, y = 0, size = 26, color = W.blue } = {}) {
    const el = box(root, { x, y, w: size, h: size, bg: color, radius: size / 2 });
    el.style.boxShadow = '0 0 0 4px ' + W.white;
    show(el, 0);
    return el;
  }

  // ---- ui.css 로 그리는 UI 조각 (기본 배율 1.8: 가장 작은 글자 12px 가 무대 21.6px) ----
  // 단계 행의 경고 배지 문구
  const WARN_TEXT = '확인이 필요합니다';
  // 고정 폭 w0 에서 마크업 높이를 재어 el.resize 한다(measure 안에서만, 숨은 장면에서도 동작)
  function fitHeight(el, w0) {
    const hidden = [];
    for (let a = el; a && a.id !== 'stage'; a = a.parentElement) if (a.style.display === 'none') { hidden.push(a); a.style.display = ''; }
    el.inner.style.height = 'auto';
    const h = parseFloat(getComputedStyle(el.inner).height);
    hidden.forEach(a => { a.style.display = 'none'; });
    el.resize(w0, h);
    return el._b;
  }
  const badgeHtml = (text, tone = 'info', size) => '<span class="mx-Badge" data-variant="subtle" data-color="' + tone + '"' + (size ? ' data-size="' + size + '"' : '') + '>' + esc(text) + '</span>';
  // 질문 입력: mx-Field mx-TextInput(sm 40)과 [보내기] mx-Button(solid primary sm). w 는 무대 px 폭. el.setText(text) = 입력된 질문 바꾸기
  function uiAsk(root, { x, y, w = 760, s = 1.8, text = '', send = '보내기' }) {
    const html = '<div style="display:flex;align-items:center;gap:8px">'
      + '<div class="mx-Field mx-TextInput" data-size="sm" data-state="default" style="flex:1;min-width:0"><label class="mx-Field__box"><input class="mx-Field__value" type="text" tabindex="-1" readonly value="' + esc(text) + '"></label></div>'
      + '<button class="mx-Button" type="button" tabindex="-1" data-style="solid" data-color="primary" data-size="sm">' + esc(send) + '</button></div>';
    const el = ui(root, { x, y, w: w / s, h: 40, s, html });
    el.text = text;
    el.setText = t => { if (t === el.text) return; el.text = t; el.inner.querySelector('input').value = t; };
    el.fit = () => fitHeight(el, w / s);
    return el;
  }
  // 답변 카드: mx-Card 안에 mx-Card__title(title), 본문 자리 mx-Skeleton 막대 3개, 근거 배지 mx-Badge(badges: 글 또는 { text, tone }, tone 기본 'info')
  function uiAnswer(root, { x, y, w = 760, s = 1.8, title = '', badges = [] }) {
    const bars = '<span class="mx-Skeleton" data-preset="text" style="width:100%"><span class="mx-Skeleton__bar"></span><span class="mx-Skeleton__bar"></span><span class="mx-Skeleton__bar"></span></span>';
    const tags = badges.map(b => (typeof b === 'string' ? badgeHtml(b) : badgeHtml(b.text, b.tone))).join('');
    const html = '<div class="mx-Card" style="box-sizing:border-box;width:100%"><span class="mx-Card__title">' + esc(title) + '</span>' + bars
      + (tags ? '<span style="display:flex;flex-wrap:wrap;gap:6px">' + tags + '</span>' : '') + '</div>';
    const el = ui(root, { x, y, w: w / s, h: 170, s, html });
    el.fit = () => fitHeight(el, w / s);
    return el;
  }
  // 단계 한 행: mx-Card(가로 배치)에 상태 표시, 제목(mx-Card__title), state 'warn' 이면 오른쪽 mx-Badge(negative, xs) warnText
  // 상태 표시: 'wait' = 회색 점 12px(span 에 --mx-strong 색), 'done' 과 'warn' = 체크 아이콘 20(--mx-success 색)
  // el.setState(state) 는 값이 바뀔 때만 마크업을 다시 넣는다
  function uiStepRow(root, { x, y, w = 960, s = 1.8, title = '', state = 'wait', warnText = WARN_TEXT }) {
    const mark = st => st === 'wait'
      ? '<span style="display:flex;width:20px;height:20px;flex:none;align-items:center;justify-content:center"><span style="width:12px;height:12px;border-radius:9999px;background:var(--mx-strong)"></span></span>'
      : '<span style="display:flex;width:20px;height:20px;flex:none;align-items:center;justify-content:center;color:var(--mx-success)">' + icon('check', 20) + '</span>';
    const html = st => '<div class="mx-Card" style="box-sizing:border-box;width:100%;flex-direction:row;align-items:center;gap:12px;padding:16px 20px">'
      + mark(st) + '<span class="mx-Card__title" style="flex:1;min-width:0">' + esc(title) + '</span>' + (st === 'warn' ? badgeHtml(warnText, 'negative', 'xs') : '') + '</div>';
    const el = ui(root, { x, y, w: w / s, h: 56, s, html: html(state) });
    el.state = state;
    el.setState = st => { if (st === el.state) return; el.state = st; el.setHtml(html(st)); };
    el.fit = () => fitHeight(el, w / s);
    return el;
  }
  // 배지 하나: mx-Badge(subtle). tone = data-color('primary' 'secondary' 'positive' 'cautionary' 'negative' 'info'). el.fit() 은 폭과 높이를 글에 맞춘다
  function uiBadge(root, { x, y, s = 1.8, text = '', tone = 'info' }) {
    const el = ui(root, { x, y, w: 16 + [...text].length * 12, h: 24, s, html: badgeHtml(text, tone) });
    el.fit = () => { const n = el.natural(); el.resize(n.w, n.h); return el._b; };
    return el;
  }

  g.MotionKit = {
    C, F, SENT,
    clamp, seg, lerp, ioC, oC, ease, mixColor, prog, sub,
    box, row, file, card, slot, panel, bar, label, count, pr, tag, badge, path, srccard, sentence, view, arrow, code,
    show, pose, appear, center, ctrl, curve, moveAlong, borderTo, slide, swap, baselineOf, alignBaseline,
    textWidth, codeLines, outline, poly, banner, BANNER_TEXT,
    W, iconSvg, studs, brick, bannerBlock, miniBanner, buttonBlock, radioBlock, inputBlock, nameTag, plate, fitSentence, TONES,
    ui, uiReady, icon,
    progBox, sidecarBox, chunkCard, docStack, img, imgReady, packet, uiAsk, uiAnswer, uiStepRow, uiBadge, WARN_TEXT,
  };
})(window);
