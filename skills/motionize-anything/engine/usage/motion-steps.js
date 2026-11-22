// 사용법 모션 시작 틀의 단계 표. 모든 값은 ms, 기준 속도 시간이다. 실제 재생 시간 = 기준 ÷ speed.
// 단계 시작 = 앞 단계 끝. gap 을 적은 단계 앞에 wait 단계가 자동으로 생긴다.
// 문제 표시는 type 'ring' 단계(id 에 _issue)로 두고 index.html 이 주황 테두리와 문제 박스를 그린다.
(function (g) {
  // ======================= [기능마다] 채울 것 =======================
  const FEATURE_ID = 'starter';
  const TXT = {};   // type 단계가 입력하는 글: { 키: '글' }, 단계의 text 에 키를 적는다
  const SCENES = [{ id: 1, name: '01 장면 이름' }];
  const TYPE_DEF = { ms: 42, jitter: 30, space: 30, punct: 160, newline: 200 };
  const TR_DEF = { out: 400, inDelay: 400, in: 450 };   // 겹치지 않게 inDelay ≥ out
  const NAV = { out: 200, in: 300 };
  const ISSUE = hold => ({ in: 250, hold, out: 200 });   // 문제 박스 읽는 멈춤: 글자 수에 맞춰 1.6초 이상
  const STEPS_SRC = [
    { id: 's1_hold', scene: 1, type: 'hold', name: '첫 화면 정지', hint: '반복 이음매와 같은 그림', dur: 1000 },
    { id: 's1_sent1', scene: 1, type: 'hold', name: '위 문장 나타남', hint: '0.3초', dur: 300 },
    { id: 's1_read1', scene: 1, type: 'hold', name: '위 문장 읽기 정지', hint: '', dur: 2400 },
    { id: 's1_sent2', scene: 1, type: 'hold', name: '아래 문장 나타남', hint: '0.3초', dur: 300 },
    { id: 's1_read2', scene: 1, type: 'hold', name: '아래 문장 읽기 정지', hint: '', dur: 2600 },
    { id: 's1_glideBtn', scene: 1, type: 'glide', name: '[버튼]으로 커서 이동', hint: '', dur: 700 },
    { id: 's1_clickBtn', scene: 1, type: 'click', name: '[버튼] 클릭', hint: '', dur: 150 },
    { id: 's1_nav1', scene: 1, type: 'nav', name: '결과 화면으로 전환', hint: '창 안만 흰색을 거침', gap: 150, ex: NAV },
    { id: 's1_result', scene: 1, type: 'hold', name: '결과 화면 정지', hint: '', dur: 1500 },
    { id: 's1_loop', scene: 1, type: 'loop', name: '처음으로 돌아가기', hint: '창 안이 흰색을 거쳐 첫 화면으로', gap: 150, ex: { out: 300, inDelay: 300, in: 400 } },
    { id: 's1_endHold', scene: 1, type: 'hold', name: '이음매 정지', hint: '첫 화면과 같은 상태로 멈춤', dur: 300 },
  ];
  const REPLY_LINES = 1;   // reply 단계(터미널 응답 줄)를 쓸 때 index.html 의 응답 줄 수와 같게
  // 문구 묶음(칩). n = 장면 번호. 칩은 「역할, 질문」(role = 역할, title = 질문)
  const CAPTIONS = { 1: { num: '1', role: '역할', title: '질문 형태의 제목', kind: 'chip' } };
  // 장면마다 칩 띠 아래 문장 2개(위 문장, 아래 문장). s<n>_sent1, s<n>_sent2 단계에서 0.3초 동안 나타난다
  const SENTENCES = { 1: ['사용자가 할 동작을 한 줄로 씁니다', '그 동작의 결과를 한 줄로 씁니다'] };
  const CAPTION_OF = { 1: 1 };
  const CAPTION_SCENES = { 1: [1] };
  const ELEMENTS = Object.keys(CAPTIONS).map(n => ({ id: `cap${n}.title`, n: +n, part: 'title' }));
  const WAIT_NAME = s => `${s.name} 전 멈춤`;
  function featureT(S, E, V, by) {
    const T = {};
    for (const id in by) T[id] = { s: S(id), e: E(id), v: V(id), ts: by[id].ts || null, press: by[id].press != null ? by[id].press / 1000 : null };
    return T;
  }
  const CAP_GAP = 0.32;
  // 장면이 늘면 장면마다 tin(나타남), tout(사라짐)을 더한다. 첫 칩은 loop 단계에서 다시 나타나 첫 화면과 이어진다
  function captionTimes(T) {
    return { 1: { tin: -1, tout: T.s1_loop.s, reenter: T.s1_loop.s + CAP_GAP } };
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
    FEATURE_ID, TXT, SCENES, SENTENCES, STEPS, EXTRA, DERIVED, CAPTIONS, CAPTION_OF, CAPTION_SCENES, ELEMENTS, REPLY_LINES,
    exSpec, exDefaults, defaults, merge, diff, compute, keyMoment, typeSched, captionTimes,
    KEY: 'motionEditor.v1.' + FEATURE_ID, CHANNEL: 'motionEditor.' + FEATURE_ID,
  };
})(window);
