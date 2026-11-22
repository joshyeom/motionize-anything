// 설명 모션 시작 틀의 단계 표. index.html 이 읽는다.
// 모든 값은 ms, "기준 속도" 시간이다. 실제 재생 시간 = 기준 ÷ speed(1.0).
// 단계 시작 = 앞 단계 끝.
(function (g) {
  // ======================= [기능마다] 채울 것 =======================
  const FEATURE_ID = 'explainer-starter';
  const TXT = {};   // 입력 단계가 없다
  const SCENES = [{ id: 1, name: '01 블록 조합' }, { id: 2, name: '02 재사용' }];
  const TYPE_DEF = { ms: 42, jitter: 30, space: 30, punct: 160, newline: 200 };
  const TR_DEF = { out: 400, inDelay: 400, in: 450 };   // 겹치지 않게 inDelay ≥ out
  // 길이만 받는 움직임(나타남, 이동, 합침)은 scroll 종류로 둔다. 그리는 일은 scenes/s<n>.js 가 한다.
  const STEPS_SRC = [
    // 1 블록 조합
    { id: 's1_hold', scene: 1, type: 'scroll', name: '블록 3개 나타남', dur: 600, gap: 0 },
    { id: 's1_combine', scene: 1, type: 'scroll', name: '블록이 모여 배너가 됨', dur: 1800, gap: 0 },
    { id: 's1_sentence1', scene: 1, type: 'scroll', name: '위 문장 나타남', dur: 300, gap: 0 },
    { id: 's1_read1', scene: 1, type: 'hold', name: '위 문장 읽기 정지', dur: 2800, gap: 0 },
    { id: 's1_sentence2', scene: 1, type: 'scroll', name: '아래 문장 나타남', dur: 300, gap: 0 },
    { id: 's1_read2', scene: 1, type: 'hold', name: '아래 문장 읽기 정지', dur: 3000, gap: 0 },
    // 2 재사용
    { id: 's2_in', scene: 2, type: 'trans', name: '장면 2 전환', gap: 0, ex: { out: 400, inDelay: 400, in: 450 } },
    { id: 's2_hold', scene: 2, type: 'scroll', name: '화면 판 2개 나타남', dur: 500, gap: 0 },
    { id: 's2_place', scene: 2, type: 'scroll', name: '같은 배너가 두 판에 놓임', dur: 1400, gap: 0 },
    { id: 's2_sentence1', scene: 2, type: 'scroll', name: '위 문장 나타남', dur: 300, gap: 0 },
    { id: 's2_read1', scene: 2, type: 'hold', name: '위 문장 읽기 정지', dur: 2800, gap: 0 },
    { id: 's2_sentence2', scene: 2, type: 'scroll', name: '아래 문장 나타남', dur: 300, gap: 0 },
    { id: 's2_read2', scene: 2, type: 'hold', name: '아래 문장 읽기 정지', dur: 3000, gap: 0 },
    { id: 's2_tail', scene: 2, type: 'scroll', name: '끝', dur: 100, gap: 0 },
  ];
  const REPLY_LINES = 0;   // 터미널 응답 단계가 없다
  // 문구 묶음(칩). n = 장면 번호
  const CAPTIONS = {
    1: { num: '1', role: '블록 조합', title: '배너는 어떻게 만드나요', kind: 'chip' },
    2: { num: '2', role: '재사용', title: '만든 블록은 어디에 쓰나요', kind: 'chip' },
  };
  const CAPTION_OF = { 1: 1, 2: 2 };          // 장면 → 문구 묶음
  const CAPTION_SCENES = { 1: [1], 2: [2] };   // 문구 묶음 → 장면
  const ELEMENTS = Object.keys(CAPTIONS).map(n => ({ id: `cap${n}.title`, n: +n, part: 'title' }));
  const WAIT_NAME = s => `${s.name} 전 멈춤`;
  // index.html 이 쓰는 시점(기준 초): 단계마다 {s, e, v, ts, press}
  function featureT(S, E, V, by) {
    const T = {};
    for (const id in by) T[id] = { s: S(id), e: E(id), v: V(id), ts: by[id].ts || null, press: by[id].press != null ? by[id].press / 1000 : null };
    return T;
  }
  // 문구 묶음마다 나타남 tin · 사라짐 tout(기준 초). 다음 칩은 앞 칩이 다 사라진 뒤 나타난다(같은 자리라 겹치지 않게)
  // 장면 안 구도 교체는 칩 시각에 쓰지 않는다. loop 단계가 있으면 칩 1번은 그 단계에서 다시 나타나 0초 화면과 이어진다.
  const CAP_GAP = 0.32;
  // 장면 수와 loop 단계 유무에 상관없이 계산한다. 마지막 장면의 tout 은 loop 단계가 있으면 그 시작, 없으면 1e9
  function captionTimes(T) {
    const ids = SCENES.map(s => s.id), loop = STEPS.find(s => s.type === 'loop'), out = {};
    ids.forEach((n, i) => {
      const nx = ids[i + 1];
      out[n] = {
        tin: i === 0 ? -1 : T[`s${n}_in`].s + Math.max(CAP_GAP, T[`s${n}_in`].v.inDelay / 1000),
        tout: nx != null ? T[`s${nx}_in`].s : loop ? T[loop.id].s : 1e9,
      };
    });
    if (loop) out[ids[0]].reenter = T[loop.id].s + CAP_GAP;
    return out;
  }

  // ======================= 공용 엔진 =======================
  // gap 이 있는 단계 앞에 wait 단계를 만든다(편집기 타임라인에 빈칸이 생기지 않게)
  const STEPS = [];
  STEPS_SRC.forEach(s => {
    if (s.gap > 0) STEPS.push({ id: s.id + '_w', scene: s.scene, type: 'wait', name: WAIT_NAME(s), hint: '', dur: s.gap });
    const { gap, ...rest } = s; STEPS.push(rest);
  });
  // 단계 종류별 덧붙는 값: [이름, 최소, 최대, 단위]
  const EXTRA = {
    type: { ms: ['글자당 시간', 10, 400, 'ms'], jitter: ['글자 간격 흔들림', 0, 80, '%'], space: ['띄어쓰기 뒤 쉼', 0, 300, 'ms'], punct: ['문장부호 뒤 쉼', 0, 800, 'ms'], newline: ['줄바꿈 뒤 쉼', 0, 1000, 'ms'] },
    glide: { curve: ['곡선 정도', 0, 40, '%'] },
    trans: { out: ['나가기 시간', 0, 1500, 'ms'], inDelay: ['들어오기 시작', 0, 1500, 'ms'], in: ['들어오기 시간', 0, 1500, 'ms'] },
    loop: { out: ['나가기 시간', 0, 1500, 'ms'], inDelay: ['들어오기 시작', 0, 1500, 'ms'], in: ['들어오기 시간', 0, 1500, 'ms'] },
    nav: { out: ['흰색으로 사라짐', 0, 1000, 'ms'], in: ['새 화면 나타남', 0, 1000, 'ms'] },
    ring: { in: ['나타남', 0, 1000, 'ms'], hold: ['유지', 0, 4000, 'ms'], out: ['사라짐', 0, 1000, 'ms'] },
    click: { ring: ['대상 테두리(0 끔 · 1 켬)', 0, 1, ''] },
    notify: { in: ['미끄러져 들어옴', 0, 1500, 'ms'] },
    reply: { first: ['첫 줄까지', 0, 2000, 'ms'], each: ['줄 사이', 0, 2000, 'ms'] },
  };
  const DERIVED = { type: 1, trans: 1, loop: 1, nav: 1, ring: 1, notify: 1, reply: 1 };
  function exDefaults(s) {
    const base = s.type === 'type' ? TYPE_DEF : s.type === 'trans' || s.type === 'loop' ? TR_DEF : s.type === 'nav' ? { out: 120, in: 180 }
      : s.type === 'glide' ? { curve: 14 } : s.type === 'click' ? { ring: 0 } : s.type === 'notify' ? { in: 450 }
      : s.type === 'reply' ? { first: 400, each: 650 } : s.type === 'ring' ? { in: 150, hold: 1000, out: 200 } : {};
    return { ...base, ...(s.ex || {}) };
  }
  const exSpec = s => EXTRA[s.type] || {};
  function defaults() {
    const steps = {}, scenes = {}, elements = {};
    STEPS.forEach(s => { steps[s.id] = { ...(DERIVED[s.type] ? {} : { dur: s.dur }), ...exDefaults(s) }; });
    for (const n in CAPTIONS) scenes[n] = { role: '', title: '' };
    ELEMENTS.forEach(e => { elements[e.id] = { dx: 0, dy: 0, in: 0, out: 0 }; });
    return { version: 1, speed: 1.0, clickVariant: 'A', steps, scenes, elements, caption: { in: 300, move: 16 } };
  }
  // 저장 값과 기본값 합치기 (모르는 키는 버리고 숫자만 받음). 옛 모양: 단계 gap → 앞 wait 단계 길이
  function merge(saved) {
    const d = defaults();
    if (!saved || typeof saved !== 'object') return d;
    const num = x => typeof x === 'number' && isFinite(x);
    if (num(saved.speed) && saved.speed > 0) d.speed = saved.speed;
    if (/^[A-F]$/.test(saved.clickVariant || '')) d.clickVariant = saved.clickVariant;
    if (saved.steps) for (const id in d.steps) {
      const v = saved.steps[id]; if (!v) continue;
      for (const k in d.steps[id]) if (num(v[k])) d.steps[id][k] = v[k];
      if (num(v.gap) && v.gap > 0 && d.steps[id + '_w'] && !(saved.steps[id + '_w'] && num(saved.steps[id + '_w'].dur))) d.steps[id + '_w'].dur = v.gap;
      if (v.fx && /^[A-F]$/.test(v.fx)) { d.steps[id].fx = v.fx; if (v.fxParams && typeof v.fxParams === 'object') d.steps[id].fxParams = v.fxParams; }
    }
    if (saved.scenes) for (const n in d.scenes) { const c = saved.scenes[n]; if (c) { if (typeof c.role === 'string') d.scenes[n].role = c.role; if (typeof c.title === 'string') d.scenes[n].title = c.title; } }
    if (saved.elements) for (const id in d.elements) { const e = saved.elements[id]; if (e) for (const k in d.elements[id]) if (num(e[k])) d.elements[id][k] = e[k]; }
    if (saved.caption) for (const k in d.caption) if (num(saved.caption[k])) d.caption[k] = saved.caption[k];
    if (saved.clickParams) d.clickParams = saved.clickParams;
    if (saved.preview) d.preview = saved.preview;
    return d;
  }
  // 기본값과 다른 값만
  function diff(P) {
    const d = defaults(), out = { version: 1, speed: P.speed, clickVariant: P.clickVariant, steps: {}, scenes: {}, elements: {} };
    for (const id in P.steps) for (const k in P.steps[id]) if (P.steps[id][k] !== d.steps[id][k]) (out.steps[id] = out.steps[id] || {})[k] = P.steps[id][k];
    for (const n in P.scenes) if (P.scenes[n].role || P.scenes[n].title) out.scenes[n] = P.scenes[n];
    for (const id in P.elements) for (const k in P.elements[id]) if (P.elements[id][k]) (out.elements[id] = out.elements[id] || {})[k] = P.elements[id][k];
    if (P.caption.in !== d.caption.in || P.caption.move !== d.caption.move) out.caption = P.caption;
    return out;
  }

  const fract = x => x - Math.floor(x);
  // 타이핑 일정(초): 글자마다 정해진 흔들림 + 띄어쓰기 · 문장부호 · 줄바꿈 뒤 쉼 (난수 없음)
  function typeSched(text, t0, seed, e) {
    const ts = [], j = e.jitter / 100; let t = t0;
    for (let i = 0; i < text.length; i++) {
      const p = text[i - 1];
      let d = e.ms / 1000 * (1 - j + 2 * j * fract(Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453));
      if (p === ' ') d += e.space / 1000; if (p === '.' || p === ',') d += e.punct / 1000; if (p === '\n') d += e.newline / 1000;
      t += d; ts.push(t);
    }
    return ts;
  }
  function durOf(s, v, t0) {
    switch (s.type) {
      case 'type': { const ts = typeSched(TXT[s.text], t0 / 1000, s.seed, v); return { dur: ts[ts.length - 1] * 1000 - t0, ts }; }
      case 'trans': case 'loop': return { dur: Math.max(v.out, v.inDelay + v.in) };
      case 'nav': return { dur: v.out + v.in };
      case 'ring': return { dur: v.in + v.hold + v.out };
      case 'notify': return { dur: v.in };
      case 'reply': return { dur: v.first + (REPLY_LINES - 1) * v.each };
      default: return { dur: Math.max(0, v.dur || 0) };
    }
  }
  // 시간표 계산: 단계별 [start, end] (ms) 와 index.html 이 쓰는 T(초)
  function compute(P) {
    const list = []; let t = 0;
    STEPS.forEach(s => {
      const v = P.steps[s.id], start = t, r = durOf(s, v, start), end = start + r.dur;
      list.push({ id: s.id, scene: s.scene, type: s.type, name: s.name, start, end, v, ts: r.ts, press: (s.type === 'tap' || s.type === 'click' || s.type === 'key') ? end : null });
      t = end;
    });
    const by = {}; list.forEach(x => by[x.id] = x);
    const S = id => by[id].start / 1000, E = id => by[id].end / 1000, V = id => by[id].v;
    const BASE = t / 1000;
    return { list, by, T: featureT(S, E, V, by), BASE, DURATION: BASE / P.speed };
  }
  // 편집기가 「대표 장면」으로 보여 줄 순간(ms, 기준 시간)
  function keyMoment(x) {
    const v = x.v, L = x.end - x.start;
    switch (x.type) {
      case 'tap': case 'click': case 'key': return x.end + 105;   // 누름 직후(실제 0.15초)
      case 'type': return x.start + L * 0.6;
      case 'glide': return x.start + L * 0.7;
      case 'trans': case 'loop': return x.start + v.out;
      case 'nav': return x.start + v.out * 0.9;
      case 'ring': return x.start + v.in + v.hold / 2;
      case 'notify': return x.start + v.in * 0.6;
      case 'paste': return x.start + Math.min(100, L);
      case 'reply': return x.end;
      default: return x.start + L / 2;
    }
  }
  g.MotionSteps = {
    FEATURE_ID, TXT, SCENES, STEPS, EXTRA, DERIVED, CAPTIONS, CAPTION_OF, CAPTION_SCENES, ELEMENTS, REPLY_LINES,
    exSpec, exDefaults, defaults, merge, diff, compute, keyMoment, typeSched, captionTimes,
    KEY: 'motionEditor.v1.' + FEATURE_ID, CHANNEL: 'motionEditor.' + FEATURE_ID,
  };
})(window);
