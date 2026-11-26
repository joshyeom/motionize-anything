// 장면 1 지금: 첫 컷의 초점은 큰 92% 와 초록 체크가 찬 단계 칸 24개(빈 점선 칸 2개는 회색 윤곽)다. 둘째 컷은 칸과 이름표가 사라지고 92% 는 DIM 으로 남으며, 카드 4개(완료 확인 2개, 판단 2개)가 초점이다.
// 모든 그림은 daisyUI 로 그린다: 큰 숫자(kit.stat), 단계 칸과 카드(kit.tile = alert), 이름표(kit.text). 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '검색 도구는 작업 단계 수로 92%까지 왔습니다',
    sentence2: '작업 목록에서 남은 일은 완료 확인 2개와 단계 밖 판단 2개입니다',
    pct: '92%',
    name: '작업 단계 26개',
    cards: ['완료 확인', '완료 확인', '판단', '판단'],
  };
  const TOTAL = 26, DONE = 24, COLS = 13, CS = 110, CG = 20, GX = (1920 - (COLS * CS + (COLS - 1) * CG)) / 2, GY = 610;
  const CARD_W = 380, CARD_G = 40, CARD_X = (1920 - (4 * CARD_W + 3 * CARD_G)) / 2, CARD_Y = 640, CARD_H = 180;
  let sent1, sent2, pct, name, cells = [], cards = [], ready = false;

  MotionScenes.register(1, {
    build(root, kit) {
      pct = kit.stat(root, { cx: 960, cy: 270, s: 7.5, value: TEXT.pct, tone: 'green' });
      name = kit.text(root, { x: GX, y: GY - 62, size: 34, tone: 'neutral', text: TEXT.name });
      for (let i = 0; i < TOTAL; i++) {
        const x = GX + (i % COLS) * (CS + CG), y = GY + Math.floor(i / COLS) * (CS + CG);
        const cell = kit.tile(root, { x, y, w: CS, h: CS, base: true, variant: 'dash' });
        if (i < DONE) { cell.green = kit.tile(cell, { x: 0, y: 0, w: CS, h: CS, tone: 'green', icon: 'tick', iconSize: 30 }); cell.order = i; }
        cells.push(cell);
      }
      TEXT.cards.forEach((text, i) => {
        const check = i < 2;   // 완료 확인은 노랑 채움, 판단은 흰 바탕 노랑 점선 테두리
        cards.push(kit.tile(root, { x: CARD_X + i * (CARD_W + CARD_G), y: CARD_Y, w: CARD_W, h: CARD_H, size: 44, text, tone: 'yellow', variant: check ? '' : 'dash', base: !check }));
      });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['92%', 'green']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['완료 확인 2개', 'yellow'], ['단계 밖 판단 2개', 'yellow']]);
    },
    measure(kit) {
      pct.fit(); name.fit();
      kit.fitSentence(sent1); kit.fitSentence(sent2);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.captions(ctx, sent1, 's1_sentence1', sent2, 's1_sentence2');
      const ap = (el, p, o = 1) => { const e = k.ioC(p); k.pose(el, { dy: 16 * (1 - e), o: e * o }); };
      const out = k.ioC(sub('s1_cards', 0, 300));   // 둘째 컷: 칸과 이름표가 사라지고 92% 는 DIM
      ap(pct, sub('s1_hold', 0, 300), 1 - (1 - k.DIM) * out);
      ap(name, sub('s1_hold', 200, 300), 1 - out);
      cells.forEach((c, i) => {
        ap(c, sub('s1_hold', 200 + i * 20, 300), 1 - out);
        if (c.green) k.show(c.green, k.ioC(sub('s1_fill', c.order * 54, 250)));
      });
      cards.forEach((c, i) => ap(c, sub('s1_cards', 300 + i * 120, 300)));
    },
    rings: [],
  });
})();
