// 장면 3 실제 실행: 첫 컷의 초점은 초록 체크 칸 14개와 큰 14 / 15 다(빈 점선 칸 1개는 회색 윤곽). 둘째 컷은 칸과 숫자가 위로 올라가 DIM 이 되고, 단계 동그라미 4개 가운데 셋째가 노랑 느낌표로 커진 초점이다.
// 직접 그린 것: 칸, 숫자, 동그라미, 이름표. 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '문서 변경 1건으로 끝까지 돌려 대조 대상 15쌍 중 14쌍이 반영됐습니다',
    sentence2: '검사에서 모바일 앱 테스트를 제외한 1곳 때문에 완료 판단을 다시 해야 합니다',
    num: '14 / 15',
    unknown: '?',
    warn: '!',
    steps: ['변경 감지', '색인 반영', '검색 구현과 검사', '화면 대조와 보고'],
  };
  const TOTAL = 15, DONE = 14, COLS = 5, CS = 130, CG = 24, GW = COLS * CS + (COLS - 1) * CG;
  const NUM_W = 800, GX = (1920 - (GW + 120 + NUM_W)) / 2, GY = 400, NX = GX + GW + 120;
  const LIFT = 300, SC = 4, SD = 140, SGAP = 400, SX = (1920 - (SC - 1) * SGAP) / 2, SY = 640;
  let sent1, sent2, grp, num, cells = [], conns = [], circles = [], labels = [], ready = false;

  MotionScenes.register(3, {
    build(root, kit) {
      const W = kit.W, G = kit.FOCUS.green, Y = kit.FOCUS.yellow;
      grp = kit.box(root, { x: 0, y: 0, w: 1920, h: 1080 });
      for (let i = 0; i < TOTAL; i++) {
        const cell = kit.box(grp, { x: GX + (i % COLS) * (CS + CG), y: GY + Math.floor(i / COLS) * (CS + CG), w: CS, h: CS });
        cell.base = kit.box(cell, { x: 0, y: 0, w: CS, h: CS, radius: 16, bg: W.white, border: '3px dashed ' + W.n300 });
        if (i < DONE) {
          cell.green = kit.box(cell, { x: 0, y: 0, w: CS, h: CS, radius: 16, bg: G.bg, border: '3px solid ' + G.edge });
          const tick = kit.box(cell.green, { x: (CS - 76) / 2, y: (CS - 76) / 2, w: 76, h: 76, color: G.ink });
          tick.innerHTML = kit.icon('tick', 76);
          cell.order = i;
        } else {
          kit.box(cell.base, { x: 0, y: 0, w: CS, h: CS, text: TEXT.unknown, size: 64, weight: 800, color: W.subtle, align: 'center' });
        }
        cells.push(cell);
      }
      num = kit.box(grp, { x: NX, y: GY + (3 * CS + 2 * CG - 240) / 2, w: NUM_W, h: 240, text: TEXT.num, size: 200, weight: 800, color: G.text, align: 'center', num: true });
      for (let i = 0; i < SC - 1; i++) conns.push(kit.box(root, { x: SX + i * SGAP + SD / 2 + 16, y: SY + SD / 2 - 2, w: SGAP - SD - 32, h: 4, radius: 2, bg: W.n300 }));
      TEXT.steps.forEach((text, i) => {
        const hot = i === 2;
        circles.push(kit.box(root, { x: SX + i * SGAP - SD / 2, y: SY, w: SD, h: SD, radius: SD / 2, bg: W.white, border: '4px solid ' + W.n300 }));
        if (hot) {
          circles[i].hot = kit.box(circles[i], { x: 0, y: 0, w: SD, h: SD, radius: SD / 2, bg: Y.bg, border: '5px solid ' + Y.edge, text: TEXT.warn, size: 88, weight: 800, color: Y.ink, align: 'center' });
        }
        labels.push(kit.box(root, { x: SX + i * SGAP - 200, y: SY + SD + 40, w: 400, h: 48, text, size: 34, weight: 700, color: hot ? Y.text : W.subtle, align: 'center' }));
      });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['14쌍', 'green']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['모바일 앱 테스트를 제외한 1곳', 'yellow']]);
    },
    measure(kit) {
      kit.fitSentence(sent1); kit.fitSentence(sent2);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.captions(ctx, sent1, 's3_sentence1', sent2, 's3_sentence2');
      const ap = (el, p, o = 1) => { const e = k.ioC(p); k.pose(el, { dy: 16 * (1 - e), o: e * o }); };
      // 첫 컷: 칸 15개가 나타나고 14개가 차례로 초록 체크, 이어 14 / 15
      cells.forEach((c, i) => {
        ap(c, sub('s3_hold', i * 30, 300));
        if (c.green) k.show(c.green, k.ioC(sub('s3_fill', c.order * 70, 250)));
      });
      ap(num, sub('s3_fill', 1000, 400));
      // 둘째 컷: 칸과 숫자가 위로 올라가 DIM, 동그라미 4개가 나타나고 셋째가 노랑 느낌표로 커짐
      const up = k.ioC(sub('s3_warn', 0, 500));
      k.pose(grp, { dy: -LIFT * up, o: 1 - (1 - k.DIM) * up });
      circles.forEach((c, i) => {
        const p = sub('s3_warn', 500 + i * 60, 300), e = k.ioC(p);
        const grow = i === 2 ? k.ioC(sub('s3_warn', 860, 340)) : 0;
        k.pose(c, { dy: 16 * (1 - e), s: 1 + 0.25 * grow, o: e });
        if (c.hot) k.show(c.hot, grow);
        k.pose(labels[i], { dy: 16 * (1 - e), o: e });
      });
      conns.forEach((c, i) => ap(c, sub('s3_warn', 560 + i * 60, 300)));
    },
    rings: [],
  });
})();
