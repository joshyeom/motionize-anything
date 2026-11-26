// 장면 2 하는 일: 첫 컷은 박스 3개 흐름(문서 변경은 회색 윤곽, 색인과 검색 화면이 차례로 파랑 채움이 초점). 둘째 컷은 흐름이 사라지고 화면 2장(파랑 테두리 초점)과 보고서 박스(파랑 채움)가 나타난다.
// 그림 출처: codex 로 만든 assets/s2-screen.png. 직접 그린 것: 박스, 화살표, 이름표, 테두리, 텍스트. 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '문서가 바뀌면 에이전트가 색인과 검색 화면을 차례로 고칩니다',
    sentence2: '고친 검색 화면을 기준 화면과 비교해 차이를 보고합니다',
    flow: ['문서 변경', '색인 갱신', '검색 화면'],
    tags: ['기준 화면', '검색 화면'],
    report: '보고서',
  };
  const BW = 440, BH = 220, BG = 120, BX = (1920 - (3 * BW + 2 * BG)) / 2, BY = 600;
  const IMG = { x: 140, y: 190, w: 900, h: 680, src: 'assets/s2-screen.png' }, EDGE = 6;
  const REP = { x: 1260, y: 400, w: 440, h: 220 };
  let sent1, sent2, boxes = [], arrows = [], img, frame, tags = [], report, repArrow, ready = false;

  MotionScenes.register(2, {
    build(root, kit) {
      const W = kit.W, F = kit.FOCUS.blue;
      TEXT.flow.forEach((t, i) => {
        const x = BX + i * (BW + BG);
        // 꺼진 상태(회색 윤곽) 위에 켜진 상태(파랑 채움)를 겹쳐 둔다
        const off = kit.box(root, { x, y: BY, w: BW, h: BH, radius: 24, bg: W.white, border: `3px solid ${W.strong}`, text: t, size: 48, weight: 800, color: W.subtle, align: 'center' });
        boxes.push({ off, on: i ? kit.box(off, { x: 0, y: 0, w: BW, h: BH, radius: 24, bg: F.bg, border: `4px solid ${F.edge}`, text: t, size: 48, weight: 800, color: F.ink, align: 'center' }) : null });
        if (i) arrows.push(kit.arrow(root, { x1: x - BG + 10, y1: BY + BH / 2, x2: x - 10, y2: BY + BH / 2, color: W.subtle, width: 5, head: 16 }));
      });
      img = kit.img(root, Object.assign({ card: false }, IMG));
      frame = kit.box(root, { x: IMG.x - 10, y: IMG.y - 10, w: IMG.w + 20, h: IMG.h + 20, radius: 28, border: `${EDGE}px solid ${F.edge}` });
      TEXT.tags.forEach((t, i) => tags.push(kit.box(root, { x: IMG.x + IMG.w * (i ? 0.75 : 0.25) - 150, y: IMG.y - 56, w: 300, h: 44, text: t, size: 36, weight: 700, color: W.subtle, align: 'center' })));
      report = kit.box(root, { ...REP, radius: 24, bg: F.bg, border: `4px solid ${F.edge}`, text: TEXT.report, size: 48, weight: 800, color: F.ink, align: 'center' });
      repArrow = kit.arrow(root, { x1: IMG.x + IMG.w + 30, y1: REP.y + REP.h / 2, x2: REP.x - 20, y2: REP.y + REP.h / 2, color: F.edge, width: 5, head: 16 });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['차례로 고칩니다', 'blue']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['비교해 차이를 보고합니다', 'blue']]);
    },
    measure(kit) {
      kit.fitSentence(sent1); kit.fitSentence(sent2);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.captions(ctx, sent1, 's2_sentence1', sent2, 's2_sentence2');
      const out = 1 - k.ioC(sub('s2_compare', 0, 300));   // 둘째 컷: 흐름 박스가 먼저 사라진 뒤 화면 2장과 보고서 박스가 나타남
      const inn = (a, b = 300) => sub('s2_compare', a, b);
      boxes.forEach((b, i) => {
        k.appear(b.off, sub('s2_hold', i * 150, 300)); b.off.style.opacity *= out; k.show(b.off, +b.off.style.opacity);
        if (b.on) k.show(b.on, k.ioC(sub('s2_flow', (i - 1) * 700, 300)));
      });
      arrows.forEach((a, i) => { a.draw(k.ioC(sub('s2_hold', 200 + i * 150, 300)) * (out > 0.001 ? 1 : 0)); a.style.opacity = out; });
      k.appear(img, inn(300, 400)); k.appear(frame, inn(300, 400));
      tags.forEach(t => k.appear(t, inn(300, 400)));
      repArrow.draw(k.ioC(inn(700, 300)));
      k.appear(report, inn(900, 300));
    },
    rings: [],
  });
})();
