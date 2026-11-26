// 공용 도구 (장면 파일이 쓰는 부품 · 진행값 · 움직임). 사용법은 CONTRACT.md.
// 좌표와 크기는 모두 무대 좌표 px(1920x1080, 왼쪽 위 0,0)다. 시간은 기준 초(ctx.t)다.
// CSS 애니메이션, CSS transition, 난수, 현재 시각을 쓰지 않는다. 같은 t 면 같은 그림이다.
// 모든 화면 요소는 daisyUI 5 컴포넌트 클래스(alert, badge, btn, card, stat, steps, mockup-window, skeleton 등)로 그린다.
// 색은 ui.css 의 daisyUI 테마(data-theme="motionize") 하나가 정한다. 이 파일에는 색, 테두리, 둥근 정도, 그림자, 글자 크기 값을 쓰지 않는다.
// 위치와 크기(left, top, width, height)와 확대 배율(s), 움직임(transform, opacity, display)만 직접 정한다.
(function (g) {
  // 초점이 아닌 것의 불투명도
  const DIM = 0.45;
  // 문장 자리: 무대 아래 가운데 한 자리(문장 한 줄의 위 끝 y 920, 확대 배율 2.5). 두 문장이 같은 자리에 차례로 나옴(kit.captions). x 는 fitSentence 가 글 폭으로 정함
  const SENT = { x: 120, y: 920, s: 2.5, max: 1640 };
  // 초점 색 이름: blue 흐름과 단위, green 마침과 반영, yellow 남음과 주의. 색 값은 ui.css 테마의 --color-focus-<이름>(테두리), -bg(채움), -text(글자), --color-mark-<이름>(자막 하이라이트)다.
  // 초점 색은 아래 도우미가 그 테마 변수를 daisyUI 컴포넌트 변수(--alert-color, --alert-border-color, --badge-color, --color-info 등)에 연결한다.
  // 의미 색 info, success, warning, error 와 neutral 은 daisyUI 색 클래스를 그대로 쓴다.
  const FOCUS = ['blue', 'green', 'yellow'];
  const isFocus = t => FOCUS.includes(t);
  const SLOT = { blue: 'info', green: 'success', yellow: 'warning' };   // 초점 색이 글자와 선 색을 빌려 쓰는 daisyUI 색 이름
  // 글자 색 속성: 초점 색은 text-<자리> 클래스에 그 자리 색을 글자색(-text)으로 연결하고, 그 밖은 text-<tone> 클래스. extra 는 같은 style 에 붙는 배치용 값
  const textAttr = (t, extra = '', cls = '') => {
    const c = (cls ? cls + ' ' : '') + (t ? 'text-' + (isFocus(t) ? SLOT[t] : t) : '');
    const st = (isFocus(t) ? '--color-' + SLOT[t] + ':var(--color-focus-' + t + '-text);' : '') + extra;
    return (c ? ' class="' + c + '"' : '') + (st ? ' style="' + st + '"' : '');
  };
  // SVG 선 색(currentColor): 초점 색은 테두리색(--color-focus-<이름>)을 연결한 text-<자리> 클래스
  const colorize = (el, t) => {
    if (isFocus(t)) { el.setAttribute('class', 'text-' + SLOT[t]); el.style.setProperty('--color-' + SLOT[t], 'var(--color-focus-' + t + ')'); } else el.setAttribute('class', 'text-' + t);
  };

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

  // ---- 단계 진행값 (ctx = render 가 받는 값) ----
  const prog = (ctx, id) => seg(ctx.t, ctx.T[id].s, ctx.T[id].e);                                   // 단계 전체 0~1
  const sub = (ctx, id, ms0, ms) => seg(ctx.t, ctx.T[id].s + ms0 / 1000, ctx.T[id].s + (ms0 + ms) / 1000);   // 단계 시작 ms0 뒤부터 ms 동안 0~1 (ms 0 이면 그 순간부터 1)

  // ======================= 기본 틀: daisyUI 마크업을 무대 좌표에 놓는다 =======================
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const uiLoads = [], uiEls = [];
  // kit.ui(root, { x, y, w, h, s = 1, html }): 무대 좌표 (x, y)에 daisyUI 클래스로 쓴 마크업 html 을 그린 요소를 만든다.
  //   w, h 는 확대 전 실제 크기(px), s 는 확대 배율(왼쪽 위 기준). el._b = { x, y, w: w*s, h: h*s }. kit.pose, kit.moveAlong, kit.show 로 움직인다.
  //   el.setHtml(html) = 마크업 교체. el.inner = 마크업을 담은 요소(.kw, scale(s) 적용).
  //   el.resize(w, h) = 확대 전 크기 변경, el.setScale(s) = 배율 변경, el.moveTo(x, y) = 자리 변경, el.natural() = 마크업의 확대 전 내용 크기 {w, h}(measure 안에서만).
  //   el 에 직접 붙인 자식(다른 kit.ui 요소, 돌기)은 마크업 위에 보인다(좌표는 el 왼쪽 위 기준, 확대하지 않음).
  // 마크업은 .kw 안에 넣는다. 무대의 「#stage div 는 모두 position:absolute」 규칙이 .kw 안쪽에는 적용되지 않는다(index.html 의 배치용 규칙).
  function ui(root, { x, y, w, h, s = 1, html }) {
    const el = document.createElement('div');
    el.className = 'k-ui';
    const inner = document.createElement('div'); inner.className = 'kw';
    inner.style.transformOrigin = '0 0';   // 배치용
    el.appendChild(inner);
    el.inner = inner; el.s = s; el._w = w; el._h = h;
    el.setHtml = markup => { inner.innerHTML = markup; };
    el.resize = (nw, nh) => {
      el._w = nw; el._h = nh;
      inner.style.transform = el.s !== 1 ? 'scale(' + el.s + ')' : '';
      Object.assign(inner.style, { width: nw + 'px', height: nh + 'px' });
      Object.assign(el.style, { width: nw * el.s + 'px', height: nh * el.s + 'px' });
      el._b.w = nw * el.s; el._b.h = nh * el.s;
      if (el.layoutStuds) el.layoutStuds();
    };
    el.setScale = ns => { el.s = ns; el.resize(el._w, el._h); };
    el.moveTo = (nx, ny) => { el._b.x = nx; el._b.y = ny; el.style.left = nx + 'px'; el.style.top = ny + 'px'; };
    el.natural = () => {
      const hidden = [];
      for (let a = el; a && a.id !== 'stage'; a = a.parentElement) if (a.style.display === 'none') { hidden.push(a); a.style.display = ''; }
      const old = inner.style.width, oh = inner.style.height; inner.style.width = 'max-content'; inner.style.height = 'auto';
      // getComputedStyle 의 폭과 높이는 transform 앞의 레이아웃 크기라서 자기 scale(s)과 조상의 kit.pose 확대, 축소가 들어가지 않는다
      const cs = getComputedStyle(inner), out = { w: Math.ceil(parseFloat(cs.width)), h: parseFloat(cs.height) };
      inner.style.width = old; inner.style.height = oh; hidden.forEach(a => { a.style.display = 'none'; });
      return out;
    };
    el._b = { x, y, w: w * s, h: h * s };
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.resize(w, h); el.setHtml(html);
    root.appendChild(el); uiEls.push(el);
    return el;
  }
  // 글 폭과 높이에 맞춰 el.resize 한다(measure 안에서만). 돌려주는 값 = el._b
  function fit(el) { const n = el.natural(); el.resize(n.w, n.h); return el._b; }
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
  // daisyUI CSS 와 ui.css(index.html 의 link)를 다 불러오고 글꼴(Pretendard)까지 불러오면 끝나는 약속. index.html 의 window.ready 가 기다린다.
  // link 를 못 불러왔으면 실패한다(스타일 없는 맨 글자 프레임을 저장하지 않게)
  function uiReady() {
    const bad = [...document.querySelectorAll('link[rel=stylesheet]')].filter(l => !l.sheet).map(l => l.href);
    if (bad.length) return Promise.reject(new Error('CSS 를 불러오지 못함: ' + bad.join(' ')));
    const text = uiEls.map(e => e.inner.textContent).join('') + '0123456789';
    return Promise.all([400, 500, 600, 700, 800].map(wt => document.fonts.load(wt + ' 16px "Pretendard Variable"', text)));
  }

  // ---- 아이콘: 색은 부모의 text-* 색(currentColor)을 따르고, 원 안의 기호는 바탕색(base-100)이다 ----
  const ICONS = {
    info: '<circle cx="10" cy="10" r="8.5" fill="currentColor"/><path d="M10 9v5M10 6v.01" stroke="var(--color-base-100)" stroke-width="1.8" stroke-linecap="round"/>',
    check: '<circle cx="10" cy="10" r="8.5" fill="currentColor"/><path d="M 6.2 10.2 l 2.5 2.5 5 -5.2" fill="none" stroke="var(--color-base-100)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    tick: '<path d="M 5.2 10.4 l 3.2 3.2 6.4 -6.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    warn: '<path d="M10 2.2 18.4 17H1.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 7.8v4M10 14.3v.01" stroke="var(--color-base-100)" stroke-width="1.8" stroke-linecap="round"/>',
  };
  const icon = (name, size) => '<svg style="display:block" width="' + size + '" height="' + size + '" viewBox="0 0 20 20" aria-hidden="true">' + ICONS[name] + '</svg>';

  // ======================= 부품 (모두 daisyUI 컴포넌트) =======================
  // 타일: 글이 가운데 든 사각형. daisyUI alert(alert-vertical)를 모양 틀로 쓴다. o: x y w h(무대 px), size(글자 무대 px, 기본 28) 또는 s(배율),
  //   text, sub(작은 글), icon('tick' 'check' 'info' 'warn'), tone, variant, base, muted
  //   tone: 초점 색 'blue' 'green' 'yellow'(채움과 테두리는 테마의 초점 색, 글자는 기본 글자색) 또는 의미 색 'info' 'success' 'warning' 'error'(daisyUI 색 클래스)
  //   variant: '' 이나 'soft' 는 채움, 'outline' 은 테두리, 'dash' 는 점선 테두리. base(true)는 흰 바탕과 진한 테두리(점선은 --color-n300)이고 outline, dash 에서는 흰 채움이 된다
  //   tone 이 없고 base 도 아니면 옅은 회색 바탕(dash 는 점선만). muted(true)는 보조 글자색. edge 를 주면 테두리 색을 그 daisyUI 색 이름으로 정한다(base-content 등)
  //   el.setTone(tone, variant) 은 값이 바뀔 때만 마크업을 다시 넣는다
  function tile(root, o) {
    const s = o.s || (o.size || 28) / 14;
    const html = (t, v) => {
      const line = v === 'outline' || v === 'dash', cls = ['alert alert-vertical'];
      let st = 'width:100%;height:100%;white-space:nowrap';
      if (line) cls.push('alert-' + v);
      if (isFocus(t)) {
        st += ';--alert-color:' + (line ? 'var(--color-base-content)' : 'var(--color-focus-' + t + '-bg)') + ';--alert-border-color:var(--color-focus-' + t + ')';
        if (line && o.base) cls.push('bg-base-100');
      } else if (t) {
        cls.push('alert-' + t);
        if (line && o.base) cls.push('bg-base-100');
      } else if (o.base) {
        st += ';--alert-color:' + (line ? 'var(--color-base-content)' : 'var(--color-base-100)') + ';--alert-border-color:var(--color-' + (v === 'dash' ? 'n300' : 'strong') + ')';
        if (line) cls.push('bg-base-100');
      } else if (line) st += ';--alert-color:var(--color-base-content);--alert-border-color:var(--color-n300)';
      if (o.edge) st += ';--alert-border-color:var(--color-' + o.edge + ')';
      if (o.muted) cls.push('text-neutral');
      return '<div class="' + cls.join(' ') + '" role="none" style="' + st + '">' + (o.icon ? icon(o.icon, o.iconSize || 24) : '')
        + (o.text != null && o.text !== '' ? '<b>' + esc(o.text) + '</b>' : '') + (o.sub ? '<span>' + esc(o.sub) + '</span>' : '') + '</div>';
    };
    const el = ui(root, { x: o.x, y: o.y, w: o.w / s, h: o.h / s, s, html: html(o.tone, o.variant) });
    el.cur = (o.tone || '') + '|' + (o.variant || '');
    el.setTone = (t, v) => { const kk = (t || '') + '|' + (v || ''); if (kk === el.cur) return; el.cur = kk; el.setHtml(html(t, v)); };
    return el;
  }
  // 글: 배경 없는 글 한 줄. o: x y(또는 cx, cy 로 가운데), size(글자 무대 px, 기본 28), text, tone('' 이면 기본 글자색, 'neutral' 보조 글자색, 초점 색 'blue' 'green' 'yellow'(글자색), 의미 색), weight(false 면 보통 굵기)
  function text(root, o) {
    const s = (o.size || 28) / 16;
    const el = ui(root, { x: o.x || 0, y: o.y, w: 40, h: 24, s, html: '<div' + textAttr(o.tone, 'white-space:nowrap') + '>' + (o.weight === false ? esc(o.text) : '<b>' + esc(o.text) + '</b>') + '</div>' });
    el.fit = () => { fit(el); el.moveTo(o.cx != null ? o.cx - el._b.w / 2 : el._b.x, o.cy != null ? o.cy - el._b.h / 2 : el._b.y); return el._b; };
    return el;
  }
  // 큰 숫자: daisyUI stat(stat-value 2rem 800 굵기)와 stat-title(작은 설명). o: cx(가로 가운데) 또는 x, cy(숫자 세로 가운데) 또는 y, s(배율), value, title, tone
  //   폭과 높이는 measure 안에서 el.fit() 으로 정하고 cx, cy 에 맞춘다
  function stat(root, o) {
    const s = o.s || 7.5;
    const html = '<div class="stat" style="padding:0">' + (o.title ? '<div class="stat-title">' + esc(o.title) + '</div>' : '')
      + '<div' + textAttr(o.tone, '', 'stat-value') + '>' + esc(o.value) + '</div></div>';
    const el = ui(root, { x: o.x || 0, y: o.y || 0, w: 100, h: 40, s, html });
    el.fit = () => {
      fit(el);
      const x = o.cx != null ? o.cx - el._b.w / 2 : el._b.x, y = o.cy != null ? o.cy - el._b.h / 2 : el._b.y;
      el.moveTo(x, y); return el._b;
    };
    return el;
  }
  // 막대: daisyUI skeleton(옅은 회색 막대 또는 칸). o: x y w h, s(배율, 모서리와 같이 커진다)
  function skeleton(root, o) {
    const s = o.s || 1;
    return ui(root, { x: o.x, y: o.y, w: o.w / s, h: o.h / s, s, html: '<div class="skeleton" style="width:100%;height:100%"></div>' });
  }
  // 묶음: 장면 안에서 같이 움직이는 요소를 담는 빈 요소(좌표만 있다). o: x y w h
  function group(root, o) {
    const el = document.createElement('div'); el.className = 'k-group';
    Object.assign(el.style, { left: (o.x || 0) + 'px', top: (o.y || 0) + 'px', width: (o.w || 1920) + 'px', height: (o.h || 1080) + 'px' });
    el._b = { x: o.x || 0, y: o.y || 0, w: o.w || 1920, h: o.h || 1080 };
    root.appendChild(el);
    return el;
  }
  // 구도: 장면 안에서 통째로 바꾸는 묶음(1920x1080). 장면 안 구도 교체에 쓴다
  const view = root => group(root, {});

  // 직선 화살표(SVG, 무대 좌표). el.draw(p): 시작점에서 끝점 쪽으로 0~1 만큼 자란다(p 0 이면 숨김). 화살촉은 선 끝을 따른다. 색은 tone 의 text-* 색
  function arrow(root, { x1, y1, x2, y2, tone: tn = 'info', width = 3, head = 14 }) {
    const NS = 'http://www.w3.org/2000/svg', el = document.createElementNS(NS, 'svg');
    el.setAttribute('width', 1920); el.setAttribute('height', 1080);
    el.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';   // 배치용
    colorize(el, tn);
    const line = document.createElementNS(NS, 'line'), tip = document.createElementNS(NS, 'polygon');
    line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-width', width); line.setAttribute('stroke-linecap', 'butt');
    tip.setAttribute('fill', 'currentColor');
    el.append(line, tip); root.appendChild(el);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    el.draw = p => {
      if (p <= 0.001) { el.style.display = 'none'; return; }
      el.style.display = '';
      const d = len * clamp(p), tx = x1 + ux * d, ty = y1 + uy * d, base = Math.min(head, d), bx = tx - ux * base, by = ty - uy * base, hw = head * 0.45;
      line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', bx); line.setAttribute('y2', by);
      tip.setAttribute('points', tx + ',' + ty + ' ' + (bx - uy * hw) + ',' + (by + ux * hw) + ' ' + (bx + uy * hw) + ',' + (by - ux * hw));
    };
    el.draw(0);
    return el;
  }
  // 꺾은선 화살표(SVG, 무대 좌표). el.draw(p): 시작점에서 p(0~1) 만큼 자란다. el.setPoints(점 목록)으로 점을 다시 정한다. head 0 이면 화살촉 없음
  function poly(root, { points, tone: tn = 'info', width = 3, head = 14 }) {
    const NS = 'http://www.w3.org/2000/svg', el = document.createElementNS(NS, 'svg');
    el.setAttribute('width', 1920); el.setAttribute('height', 1080);
    el.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';   // 배치용
    colorize(el, tn);
    const path = document.createElementNS(NS, 'path'), tip = document.createElementNS(NS, 'polygon');
    path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', width); path.setAttribute('fill', 'none'); path.setAttribute('stroke-linejoin', 'round');
    tip.setAttribute('fill', 'currentColor');
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
      let dstr = 'M ' + pts[0][0] + ' ' + pts[0][1];
      for (let i = 1; i <= line.i; i++) dstr += ' L ' + pts[i][0] + ' ' + pts[i][1];
      dstr += ' L ' + line.x + ' ' + line.y;
      path.setAttribute('d', dstr);
      if (head) {
        const hw = head * 0.45;
        tip.setAttribute('points', end.x + ',' + end.y + ' ' + (end.x - end.ux * base - end.uy * hw) + ',' + (end.y - end.uy * base + end.ux * hw) + ' ' + (end.x - end.ux * base + end.uy * hw) + ',' + (end.y - end.uy * base - end.ux * hw));
      }
    };
    el.setPoints(points); el.draw(0);
    return el;
  }

  // 자막 한 줄: 아래 가운데 한 자리. line 1, 2, 3 모두 같은 자리다. 첫 컷은 1, 둘째 컷은 2 가 나옴
  // marks: [부분 문자열, 'blue' | 'green' | 'yellow'] 목록. 앞에서부터 찾아 daisyUI badge(채움은 테마의 --color-mark-*)로 감싼다. el.text 는 원문 그대로다
  function sentence(root, text, line = 1, marks = []) {
    let at = 0, body = '';
    marks.forEach(([part, tn]) => {
      const i = text.indexOf(part, at);
      if (i < 0) { console.error('자막에 없는 하이라이트: ' + part); return; }
      body += esc(text.slice(at, i)) + '<span class="badge badge-lg" style="--badge-color:var(--color-mark-' + tn + ');--badge-fg:var(--color-base-content)">' + esc(part) + '</span>'; at = i + part.length;
    });
    body += esc(text.slice(at));
    const el = ui(root, { x: SENT.x, y: SENT.y, w: 200, h: 24, s: SENT.s, html: '<div style="white-space:pre"><b>' + body + '</b></div>' });
    el.classList.add('k-sent');
    el.text = text;
    return el;
  }
  // 문장이 한 줄(max px)에 들어가도록 배율을 min 배(기본 문장 배율의 80%)까지 줄이고 가로 가운데에 놓는다(measure 안에서만). 돌려주는 값 = 글 폭
  function fitSentence(el, max = SENT.max, min = SENT.s * 0.8) {
    const n = el.natural(), s = Math.max(min, Math.min(SENT.s, max / n.w));
    el.setScale(s); el.resize(n.w, n.h);
    const x = (1920 - el._b.w) / 2;
    el.moveTo(x, SENT.y);
    return el._b.w;
  }

  // ---- 그리기 ----
  function show(el, o) { el.style.opacity = o; el.style.display = o <= 0.001 ? 'none' : ''; }
  // 만든 위치에서 dx, dy 만큼 옮기고 가운데 기준으로 s 배, 불투명도 o
  function pose(el, { dx = 0, dy = 0, s = 1, o = 1 } = {}) {
    show(el, o);
    el.style.transform = dx || dy || s !== 1 ? 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' : '';
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

  // 자막: 첫 문장 s1 이 나타나고, 둘째 컷 움직임이 시작되면 DIM 까지 흐려진 뒤, 둘째 컷에서 위로 12px 움직이며 0~150ms 에 사라진 뒤 150~300ms 에 s2 가 같은 자리에 나타남.
  // s3(셋째 컷)이 있으면 s2 도 같은 규칙으로 s3 에 자리를 내준다. s2, s3 가 없으면 있는 문장만 나옴
  function captions(ctx, s1, id1, s2, id2, s3, id3) {
    const list = [[s1, id1], [s2, id2], [s3, id3]].filter(x => x[0]);
    list.forEach(([el, id], i) => {
      const nx = list[i + 1];
      const a = i ? ioC(sub(ctx, id, 150, 150)) : ioC(sub(ctx, id, 0, 300)), out = nx ? ioC(sub(ctx, nx[1], 0, 150)) : 0;
      // 읽는 멈춤이 끝나 다음 컷 움직임이 시작되면 이 자막은 0~300ms 에 DIM 까지 흐려진다
      const read = ctx.T[id.replace('sentence', 'read')], d = nx && read ? ioC(seg(ctx.t, read.e, read.e + 0.3)) : 0;
      pose(el, { dy: 16 * (1 - a) - 12 * out, o: a * (1 - (1 - DIM) * d) * (1 - out) });
    });
  }

  // ======================= 배너, 배지, 입력 같은 화면 조각 =======================
  // 배너: daisyUI alert(alert-soft 와 tone 클래스, 아이콘과 문구 span)를 kit.ui 로 그린다. s = 1 이 daisyUI 기본 크기다.
  // o: x y(왼쪽 위) 또는 cx y(가로 가운데), s(2.4), tone('warning'), text, strong(true 면 문구를 <strong> 강조어로), w(무대 px 폭을 정해 줌. 없으면 글 폭에 맞춤)
  // 폭과 높이는 measure 에서 el.fit() 으로 정한다
  const BANNER_TEXT = '아직 처리하지 않은 항목이 있습니다.';
  // tone 별 아이콘 이름과 daisyUI alert 색 클래스. error 도 경고 삼각형이다. neutral 은 색 클래스 없이 alert-soft 만 쓴다
  const TONES = {
    info: { icon: 'info', alert: 'alert-info' }, neutral: { icon: 'info', alert: '' }, success: { icon: 'check', alert: 'alert-success' },
    warning: { icon: 'warn', alert: 'alert-warning' }, error: { icon: 'warn', alert: 'alert-error' },
  };
  const bannerHtml = (tn, txt, strong) => '<div class="alert alert-soft ' + TONES[tn].alert + '" role="alert" style="white-space:nowrap">' + icon(TONES[tn].icon, 20) + '<span>' + (txt ? (strong ? '<strong>' + esc(txt) + '</strong>' : esc(txt)) : '&nbsp;') + '</span></div>';
  function banner(root, o) {
    const s = o.s || 2.4, tn = o.tone || 'warning', txt = o.text != null ? o.text : BANNER_TEXT;
    const w0 = o.w ? o.w / s : 68 + [...txt].length * 14 * 0.85;
    const el = ui(root, { x: o.x || 0, y: o.y, w: w0, h: 44, s, html: bannerHtml(tn, txt, o.strong) });
    el.tone = tn;
    const centerX = () => { if (o.cx != null) el.moveTo(o.cx - el._b.w / 2, el._b.y); };
    el.fit = () => { const n = el.natural(); el.resize(o.w ? o.w / s : n.w, n.h); centerX(); return el._b; };
    centerX();
    return el;
  }

  // 레고 블록: 타일 위에 돌기(daisyUI badge) 여러 개. o: x y w h, tone, variant, text, size(글자 무대 px), k(돌기 배율)
  // 돌기 개수는 폭 96*k 마다 1개다. el.resize 를 쓰면 돌기가 다시 놓인다
  function studs(el, { tone: tn = 'info', k = 1 }) {
    el.studs = [];
    el.layoutStuds = () => {
      el.studs.forEach(d => d.remove()); el.studs = [];
      const w = el._b.w, n = Math.max(1, Math.round(w / (96 * k)));
      for (let i = 0; i < n; i++) {
        const d = ui(el, { x: 0, y: 0, w: 44, h: 16, s: k, html: '<span class="badge' + (isFocus(tn) ? '" style="--badge-color:var(--color-focus-' + tn + '-bg);' : ' badge-' + tn + '" style="') + 'width:100%;height:100%;padding:0"></span>' });
        d.moveTo((i + 0.5) * w / n - 22 * k, -14 * k);
        el.studs.push(d);
      }
    };
    el.layoutStuds();
    return el;
  }
  function brick(root, o) {
    const el = tile(root, { ...o, size: o.size || 26 });
    studs(el, { tone: o.tone, k: o.k || 1 });
    return el;
  }
  // 배너 블록: 배너(alert) 위에 돌기. 폭은 el.fit() 에서 정해지고 돌기도 다시 놓인다
  function bannerBlock(root, o) {
    const el = banner(root, o);
    studs(el, { tone: o.tone || 'warning', k: o.k || 1 });
    return el;
  }
  // 작은 배너 블록: 배너(문구 없음) 위에 문구 대신 막대(skeleton). o: x y w(무대 px) s k
  function miniBanner(root, o) {
    const s = o.s || 1;
    const el = bannerBlock(root, { ...o, text: '', w: o.w, s });
    el.bar = skeleton(el, { x: 48 * s, y: (44 * s - 10 * s) / 2, w: (o.w - 68 * s) * 0.85, h: 10 * s });
    return el;
  }
  // 버튼 블록: daisyUI btn 을 높이 h(무대 px)에 맞춰 확대하고 돌기를 얹는다. variant 'primary'(저장) | 'secondary'(취소)
  // o: x y w h(무대 px) text variant k. text 가 null 이면 문구 없는 버튼(작은 그림용, 막대는 장면이 얹는다)
  function buttonBlock(root, o) {
    const sec = o.variant === 'secondary', s = o.h / 40;
    const html = '<button class="btn ' + (sec ? 'btn-secondary' : 'btn-primary') + '" type="button" tabindex="-1" style="width:100%;white-space:nowrap">' + (o.text != null ? esc(o.text) : '&nbsp;') + '</button>';
    const el = ui(root, { x: o.x, y: o.y, w: o.w / s, h: 40, s, html });
    studs(el, { tone: sec ? 'neutral' : 'info', k: o.k || 1 });
    return el;
  }
  // 선택(Radio) 블록: 블록 몸통(타일) 안에 daisyUI radio 3개와 막대(skeleton) 3개. 첫 번째가 선택(checked)
  function radioBlock(root, o) {
    const el = brick(root, { ...o, text: null, variant: '', tone: '' });
    const R = 1.5, parts = [];
    for (let i = 0; i < 3; i++) {
      const radio = ui(el, { x: 0, y: 0, w: 24, h: 24, s: R, html: '<input type="radio" class="radio' + (i === 0 ? ' radio-primary' : '') + '" tabindex="-1"' + (i === 0 ? ' checked' : '') + ' style="display:block;pointer-events:none">' });
      const line = skeleton(el, { x: 0, y: 0, w: 100, h: 14 });
      parts.push({ radio, line });
    }
    el.onResize = (w, h) => {
      const cell = (w - 40) / 3;
      parts.forEach((p, i) => {
        const x = 20 + i * cell;
        p.radio.moveTo(x, (h - 24 * R) / 2);
        p.line.moveTo(x + 48, (h - 14) / 2); p.line.resize(Math.max(20, cell - 48 - 24), 14);
      });
    };
    const rz = el.resize; el.resize = (w, h) => { rz(w, h); el.onResize(el._b.w, el._b.h); };
    el.onResize(o.w, o.h);
    return el;
  }
  // 입력(Textarea) 블록: 블록 몸통(타일) 안에 daisyUI textarea 와 옅은 막대 2개
  function inputBlock(root, o) {
    const el = brick(root, { ...o, text: null, variant: '', tone: '' });
    const field = ui(el, { x: 18, y: 16, w: o.w - 36, h: o.h - 32, s: 1, html: '<textarea class="textarea" tabindex="-1" readonly style="display:block;width:100%;height:100%;resize:none"></textarea>' });
    const l1 = skeleton(el, { x: 36, y: 34, w: 100, h: 14 }), l2 = skeleton(el, { x: 36, y: 64, w: 100, h: 14 });
    el.onResize = (w, h) => {
      field.resize(w - 36, h - 32);
      l1.resize((w - 36) * 0.7, 14); l2.resize((w - 36) * 0.45, 14);
    };
    const rz = el.resize; el.resize = (w, h) => { rz(w, h); el.onResize(el._b.w, el._b.h); };
    el.onResize(o.w, o.h);
    return el;
  }
  // 이름 태그: 한글 이름 + 작은 영문 이름(daisyUI badge). tone 'gray' | 'blue'. el.put(기준 x, y)로 놓는다(anchor 'c' 가운데 | 'l' 왼쪽 | 'r' 오른쪽). 폭은 글 폭을 재어 정하므로 measure 안에서 다시 put 한다
  function nameTag(root, { text: tx, en, tone: tn = 'gray', size = 28, anchor = 'c' }) {
    const blue = tn === 'blue', s = size / 16;
    const html = '<span class="badge badge-lg badge-outline ' + (blue ? 'badge-info' : 'badge-neutral') + '" style="white-space:nowrap"><b>' + esc(tx) + '</b>' + (en ? '<span class="text-neutral">' + esc(en) + '</span>' : '') + '</span>';
    const el = ui(root, { x: 0, y: 0, w: 100, h: 28, s, html });
    el.put = (a, y) => {
      el.pa = a; el.py = y;
      const b = fit(el), x = anchor === 'c' ? a - b.w / 2 : anchor === 'l' ? a : a - b.w;
      el.moveTo(x, y);
      return el._b;
    };
    el.refit = () => el.put(el.pa, el.py);
    return el;
  }
  // 화면 판: daisyUI mockup-window(창 모양 판)와 위쪽 화면 이름. el.setRect(x, y, w, h, k) 로 자리와 크기(k 배 확대)를 정한다
  function plate(root, { x, y, w, h, title, s = 2 }) {
    const html = '<div class="mockup-window bg-base-100" style="width:100%;height:100%"><div style="padding:0 20px"><b>' + esc(title) + '</b></div></div>';
    const el = ui(root, { x, y, w: w / s, h: h / s, s, html });
    el.setRect = (rx, ry, rw, rh, kk = 1) => { el.setScale(s * kk); el.resize(rw / (s * kk), rh / (s * kk)); el.moveTo(rx, ry); };
    return el;
  }

  // ---- daisyUI 로 그리는 UI 조각 (기본 배율 1.8: 가장 작은 글자 12px 가 무대 21.6px) ----
  // 단계 행의 경고 배지 문구
  const WARN_TEXT = '확인이 필요합니다';
  // 배지 색 클래스. xs(높이 20)는 daisyUI badge-sm, 기본(높이 24)은 badge. primary 는 검정 채움, 나머지는 옅은 배경(badge-soft)이다. secondary 는 neutral(보조 글자색)을 쓴다
  const BADGE_TONES = { info: 'badge-soft badge-info', primary: 'badge-primary', secondary: 'badge-soft badge-neutral', positive: 'badge-soft badge-success', cautionary: 'badge-soft badge-warning', negative: 'badge-soft badge-error' };
  const badgeHtml = (txt, tn = 'info', size) => '<span class="badge ' + BADGE_TONES[tn] + (size === 'xs' ? ' badge-sm' : '') + '" style="white-space:nowrap">' + esc(txt) + '</span>';
  // 질문 입력: daisyUI input 과 [보내기] btn btn-primary. w 는 무대 px 폭. el.setText(text) = 입력된 질문 바꾸기
  function uiAsk(root, { x, y, w = 760, s = 1.8, text: tx = '', send = '보내기' }) {
    const html = '<div style="display:flex;align-items:center;gap:8px">'
      + '<label class="input" style="flex:1;min-width:0;width:auto"><input type="text" tabindex="-1" readonly value="' + esc(tx) + '"></label>'
      + '<button class="btn btn-primary" type="button" tabindex="-1" style="white-space:nowrap">' + esc(send) + '</button></div>';
    const el = ui(root, { x, y, w: w / s, h: 40, s, html });
    el.text = tx;
    el.setText = t => { if (t === el.text) return; el.text = t; el.inner.querySelector('input').value = t; };
    el.fit = () => fitHeight(el, w / s);
    return el;
  }
  // 답변 카드: daisyUI card 안에 card-title(title), 본문 자리 skeleton 막대 3개, 근거 배지 badge(badges: 글 또는 { text, tone }, tone 기본 'info')
  function uiAnswer(root, { x, y, w = 760, s = 1.8, title = '', badges = [] }) {
    const bars = '<span style="display:flex;flex-direction:column;gap:8px;width:100%">' + '<span class="skeleton" style="display:block;height:12px"></span>'.repeat(3) + '</span>';
    const tags = badges.map(b => (typeof b === 'string' ? badgeHtml(b) : badgeHtml(b.text, b.tone))).join('');
    const html = '<div class="card bg-base-100 card-border border-base-300" style="width:100%"><div class="card-body"><span class="card-title">' + esc(title) + '</span>' + bars
      + (tags ? '<span style="display:flex;flex-wrap:wrap;gap:6px">' + tags + '</span>' : '') + '</div></div>';
    const el = ui(root, { x, y, w: w / s, h: 170, s, html });
    el.fit = () => fitHeight(el, w / s);
    return el;
  }
  // 단계 한 행: card(가로 배치)에 상태 표시, 제목(card-title), state 'warn' 이면 오른쪽 badge(negative, xs) warnText
  // 상태 표시: 'wait' = 회색 점(daisyUI status), 'done' 과 'warn' = 체크 아이콘(text-success)
  // el.setState(state) 는 값이 바뀔 때만 마크업을 다시 넣는다
  function uiStepRow(root, { x, y, w = 960, s = 1.8, title = '', state = 'wait', warnText = WARN_TEXT }) {
    const mark = st => st === 'wait'
      ? '<span style="display:flex;width:20px;height:20px;flex:none;align-items:center;justify-content:center"><span class="status status-neutral"></span></span>'
      : '<span class="text-success" style="display:flex;width:20px;height:20px;flex:none;align-items:center;justify-content:center">' + icon('check', 20) + '</span>';
    const html = st => '<div class="card bg-base-100 card-border border-base-300" style="width:100%"><div class="card-body" style="flex-direction:row;align-items:center">'
      + mark(st) + '<span class="card-title" style="flex:1;min-width:0">' + esc(title) + '</span>' + (st === 'warn' ? badgeHtml(warnText, 'negative', 'xs') : '') + '</div></div>';
    const el = ui(root, { x, y, w: w / s, h: 56, s, html: html(state) });
    el.state = state;
    el.setState = st => { if (st === el.state) return; el.state = st; el.setHtml(html(st)); };
    el.fit = () => fitHeight(el, w / s);
    return el;
  }
  // 배지 하나: daisyUI badge. tone = 'primary' 'secondary' 'positive' 'cautionary' 'negative' 'info'. el.fit() 은 폭과 높이를 글에 맞춘다
  function uiBadge(root, { x, y, s = 1.8, text: tx = '', tone: tn = 'info' }) {
    const el = ui(root, { x, y, w: 16 + [...tx].length * 12, h: 24, s, html: badgeHtml(tx, tn) });
    el.fit = () => fit(el);
    return el;
  }

  // ======================= 부품 추가 (프로그램 박스, 조각 카드, 문서 묶음, 그림 카드) =======================
  // 프로그램 박스 tone: dark(흰 바탕, 기본 글자색 테두리), side(옅은 파랑 채움), plain(흰 바탕, 진한 테두리), off(점선, 꺼진 것, 보조 글자색)
  const PROG_TONES = { dark: { base: true, edge: 'base-content' }, side: { variant: 'soft', tone: 'info' }, plain: { base: true }, off: { variant: 'dash', muted: true } };
  // 프로그램 박스: 제목(큰 글)과 작은 글이 박스 가운데에. el.setTone(tone) 은 값이 바뀔 때만 마크업을 다시 넣으므로 render 에서 매 프레임 불러도 된다
  function progBox(root, { x, y, w, h, title, sub: sb, tone: tn = 'dark', s = 2 }) {
    const html = t => {
      const v = PROG_TONES[t], line = v.variant === 'dash', cls = ['alert alert-vertical'];
      let st = 'width:100%;height:100%;white-space:nowrap';
      if (line) cls.push('alert-dash');
      if (v.tone) { cls.push('alert-' + v.tone); if (v.variant === 'soft') cls.push('alert-soft'); }
      else if (v.base) st += ';--alert-color:var(--color-base-100);--alert-border-color:var(--color-' + (v.edge || 'strong') + ')';
      else if (line) st += ';--alert-color:var(--color-neutral);--alert-border-color:var(--color-n300)';
      return '<div class="' + cls.join(' ') + '" role="none" style="' + st + '"><b>' + esc(title || '') + '</b>' + (sb ? '<span>' + esc(sb) + '</span>' : '') + '</div>';
    };
    const el = ui(root, { x, y, w: w / s, h: h / s, s, html: html(tn) });
    el.tone = tn;
    el.setTone = t => { if (t === el.tone) return; el.tone = t; el.setHtml(html(t)); if (el.onTone) el.onTone(t); };
    return el;
  }
  // 사이드카 박스: 프로그램 박스 왼쪽 변에 연결 막대 2개(skeleton), 아래 변 가운데에 바퀴 1개(daisyUI status). el._b 는 박스 본체 기준
  function sidecarBox(root, o) {
    const el = progBox(root, { ...o, tone: o.tone || 'side' }), w = o.w, h = o.h;
    el.links = [0.3, 0.7].map(k => skeleton(el, { x: -28, y: h * k - 4, w: 31, h: 8 }));
    el.wheel = ui(el, { x: w / 2 - 22, y: h - 22, w: 16, h: 16, s: 2.75, html: '<span class="status status-neutral" style="width:100%;height:100%"></span>' });
    return el;
  }
  const bandHtml = kind => '<span class="badge' + (kind === 'amber' ? '' : ' badge-info') + '" style="' + (kind === 'amber' ? '--badge-color:var(--color-amber);' : '') + 'width:100%;height:100%"></span>';
  // 조각 카드: 흰 카드(daisyUI card)에 위쪽 색 띠(badge)와 회색 막대(skeleton) 2개. kind: 'blue'(info) | 'amber'(테마의 --color-amber). 글자 없음
  function chunkCard(root, { x, y, w = 132, h = 88, kind = 'blue' }) {
    const band = bandHtml(kind);
    const el = ui(root, { x, y, w, h, s: 1, html: '<div class="card bg-base-100 card-border border-base-300" style="width:100%;height:100%;overflow:hidden"></div>' });
    ui(el, { x: 0, y: 0, w, h: 14, s: 1, html: band });
    const inner = h - 14;
    skeleton(el, { x: 16, y: 14 + inner * 0.3, w: (w - 32) * 0.82, h: 10 });
    skeleton(el, { x: 16, y: 14 + inner * 0.62, w: (w - 32) * 0.5, h: 10 });
    return el;
  }
  // 문서 묶음: 종이 3장(오른쪽 위로 12px 씩 어긋남). 맨 앞 종이에 색 띠와 회색 막대 5개. 제목과 작은 글은 묶음 아래 가운데
  // el._b 는 종이 부분 기준. el.papers = [맨 뒤, 가운데, 맨 앞], el.t = 제목, el.st = 작은 글
  function docStack(root, { x, y, w = 220, h = 270, title, sub: sb, kind = 'blue' }) {
    const el = group(root, { x, y, w, h }), pw = w - 24, ph = h - 24, band = bandHtml(kind);
    el.papers = [[24, 0], [12, 12], [0, 24]].map(([px, py]) => ui(el, { x: px, y: py, w: pw, h: ph, s: 1, html: '<div class="card bg-base-100 card-border border-base-300" style="width:100%;height:100%;overflow:hidden"></div>' }));
    const front = el.papers[2];
    ui(front, { x: 0, y: 0, w: pw, h: 18, s: 1, html: band });
    const step = (ph - 18 - 44) / 5;
    [0.8, 0.62, 0.8, 0.45, 0.7].forEach((k, i) => skeleton(front, { x: 20, y: 18 + 28 + i * step, w: (pw - 40) * k, h: 10 }));
    const lab = (txt, top, size, tn2) => { const d = text(el, { x: 0, y: top, size, tone: tn2, text: txt }); d.fit(); d.moveTo(w / 2 - d._b.w / 2, top); return d; };
    el.t = title ? lab(title, h + 14, 28) : null;
    el.st = sb ? lab(sb, h + 54, 22, 'neutral') : null;
    return el;
  }
  // 그림 카드: codex 이미지 생성으로 만든 그림(assets/)을 흰 카드(daisyUI card, 안쪽 여백 pad) 위에 놓는다. card 가 false 면 카드 없이 그림만(여백 0)
  // w, h 는 카드 전체 크기(무대 px). 그림은 카드 안에서 비율을 유지하고(object-fit: contain) 가운데에 둔다. el.image = img 요소
  // src 는 index.html 기준 상대 경로. 스크립트와 같은 ASSET_V 를 붙여 브라우저 캐시를 피한다
  // el.at(fx, fy) = 그림 안 비율 좌표(0~1)의 무대 좌표 [x, y](kit.pose 로 움직이기 전 자리 기준, 그림 크기를 알아야 하므로 measure 안에서 부른다)
  const imgLoads = [];
  function img(root, { x, y, w, h, src, card = true, pad = 24 }) {
    const p = card ? pad : 0, iw = w - 2 * p, ih = h - 2 * p;
    const url = src + (typeof ASSET_V !== 'undefined' ? (src.includes('?') ? '&' : '?') + 'v=' + ASSET_V : '');
    const html = '<div class="' + (card ? 'card bg-base-100 card-border border-base-300' : '') + '" style="width:100%;height:100%"><figure style="width:100%;height:100%;padding:' + p + 'px"><img alt="" src="' + esc(url) + '" style="width:100%;height:100%;object-fit:contain;display:block"></figure></div>';
    const el = ui(root, { x, y, w, h, s: 1, html });
    const im = el.inner.querySelector('img');
    el.image = im;
    // 불러오기와 decode 가 끝나면 끝나는 약속. 실패하면 콘솔 오류를 남기고 실패를 그대로 넘긴다(window.ready 가 멈춰 그림 없는 프레임을 저장하지 않게)
    imgLoads.push(im.decode().catch(e => { console.error('kit.img: 그림을 불러오지 못했습니다 ' + url, e); throw e; }));
    el.at = (fx, fy) => {
      const nw = im.naturalWidth || iw, nh = im.naturalHeight || ih, k = Math.min(iw / nw, ih / nh), dw = nw * k, dh = nh * k;
      return [x + p + (iw - dw) / 2 + fx * dw, y + p + (ih - dh) / 2 + fy * dh];
    };
    return el;
  }
  // kit.img 로 만든 그림을 모두 불러오고 decode 하면 끝나는 약속. index.html 의 window.ready 가 기다린다
  const imgReady = () => Promise.all(imgLoads);
  // 이동하는 점(요청과 응답 표시): daisyUI status 원. 처음에는 숨어 있다(kit.show, kit.moveAlong 으로 보인다)
  function packet(root, { x = 0, y = 0, size = 26, tone: tn = 'info' } = {}) {
    const el = ui(root, { x, y, w: 8, h: 8, s: size / 8, html: '<span class="status status-' + tn + '" style="width:100%;height:100%"></span>' });
    show(el, 0);
    return el;
  }
  // 코드 블록: daisyUI mockup-code. lines: 글 또는 { text, hl: true }(hl 이면 그 줄을 강조 줄로). 글은 textContent 로만 넣는다. 폭은 w(무대 px), 배율 s
  function code(root, { x, y, w, s = 1.5, lines }) {
    const html = '<div class="mockup-code" style="width:100%">' + lines.map(ln => { const o = typeof ln === 'string' ? { text: ln } : ln; return '<pre' + (o.hl ? ' class="bg-warning text-warning-content"' : '') + ' data-prefix=">"><code>' + esc(o.text) + '</code></pre>'; }).join('') + '</div>';
    const el = ui(root, { x, y, w: w / s, h: 100, s, html });
    el.fit = () => fitHeight(el, w / s);
    return el;
  }

  g.MotionKit = {
    DIM, SENT, FOCUS, textAttr,
    clamp, seg, lerp, ioC, oC, ease, prog, sub,
    ui, uiReady, fit, fitHeight, esc, icon, ICONS,
    tile, text, stat, skeleton, group, view, arrow, poly,
    sentence, fitSentence, captions,
    show, pose, appear, center, ctrl, curve, moveAlong, slide, swap,
    banner, BANNER_TEXT, TONES, brick, studs, bannerBlock, miniBanner, buttonBlock, radioBlock, inputBlock, nameTag, plate,
    uiAsk, uiAnswer, uiStepRow, uiBadge, WARN_TEXT,
    progBox, sidecarBox, chunkCard, docStack, img, imgReady, packet, code,
  };
})(window);
