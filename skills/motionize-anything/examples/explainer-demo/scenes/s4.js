// 장면 4 검색 화면: 컷 7 은 원인 칸 17개 중 15개가 초록 체크로 바뀌고 15 / 17 이 초점, 컷 8 은 17칸이 사라지고 화면 칸 50개와 빈 초록 박스 0 이 초점, 컷 9 는 노랑 2칸과 노랑 박스 2 가 초점이고 0 박스는 DIM 이다.
// 직접 그린 것: 칸, 체크, 박스, 텍스트. 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '최신 빌드에서 다시 측정해도 같은 원인의 차이 17종류 중 15종류가 사라진 상태입니다',
    sentence2: '그래도 기준 화면과 같은 화면은 측정한 화면 50개 중 아직 0개입니다',
    sentence3: '50개 중 2개는 안내 배너 하나만 걸린 화면입니다',
  };
  TEXT.total = '15 / 17'; TEXT.same = '0'; TEXT.sameLabel = '같음'; TEXT.alert = '2'; TEXT.alertLabel = '배너 하나';
  const N = 17, LS = 92, LG = 12, LX = (1920 - (N * LS + (N - 1) * LG)) / 2, LY = 740, KEEP = [3, 5], TY = 300;
  const GX = 170, GY = 290, CS = 100, CG = 14, YELLOW = [13, 36];
  const BX = 1400, BOX = 220, B1Y = 310, B2Y = 590;
  let sent1, sent2, sent3, lcells = [], total, cells = [], hits = [], same, sameLabel, alert, alertLabel, ready = false;

  MotionScenes.register(4, {
    build(root, kit) {
      const W = kit.W, Gr = kit.FOCUS.green, Y = kit.FOCUS.yellow;
      total = kit.box(root, { x: 0, y: TY, w: 1920, h: 300, text: TEXT.total, size: 260, weight: 800, color: Gr.text, align: 'center', num: true });
      for (let i = 0; i < N; i++) {
        const c = kit.box(root, { x: LX + i * (LS + LG), y: LY, w: LS, h: LS });
        kit.box(c, { x: 0, y: 0, w: LS, h: LS, radius: 14, bg: W.white, border: '4px solid ' + Y.edge });
        if (!KEEP.includes(i)) {
          c.green = kit.box(c, { x: 0, y: 0, w: LS, h: LS, radius: 14, bg: Gr.bg, border: '4px solid ' + Gr.edge });
          const mk = kit.box(c.green, { x: 11, y: 11, w: 70, h: 70, color: Gr.ink }); mk.innerHTML = kit.icon('tick', 70);
        }
        lcells.push(c);
      }
      for (let i = 0; i < 50; i++) cells.push(kit.box(root, { x: GX + (i % 10) * (CS + CG), y: GY + Math.floor(i / 10) * (CS + CG), w: CS, h: CS, radius: 14, bg: W.line }));
      YELLOW.forEach(i => hits.push(kit.box(root, { x: GX + (i % 10) * (CS + CG), y: GY + Math.floor(i / 10) * (CS + CG), w: CS, h: CS, radius: 14, bg: Y.bg, border: '5px solid ' + Y.edge })));
      same = kit.box(root, { x: BX, y: B1Y, w: BOX, h: BOX, radius: 32, bg: W.white, border: '8px solid ' + Gr.edge, text: TEXT.same, size: 130, weight: 800, color: Gr.text, align: 'center', num: true });
      sameLabel = kit.box(root, { x: BX + BOX + 24, y: B1Y, h: BOX, text: TEXT.sameLabel, size: 48, weight: 800, color: Gr.text });
      alert = kit.box(root, { x: BX, y: B2Y, w: BOX, h: BOX, radius: 32, bg: Y.bg, border: '6px solid ' + Y.edge, text: TEXT.alert, size: 130, weight: 800, color: Y.ink, align: 'center', num: true });
      alertLabel = kit.box(root, { x: BX + BOX + 24, y: B2Y, h: BOX, text: TEXT.alertLabel, size: 48, weight: 800, color: Y.text });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['15종류', 'green']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['아직 0개', 'green']]);
      sent3 = kit.sentence(root, TEXT.sentence3, 3, [['2개', 'yellow']]);
    },
    measure(kit) {
      kit.fitSentence(sent1); kit.fitSentence(sent2); kit.fitSentence(sent3);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.captions(ctx, sent1, 's4_sentence1', sent2, 's4_sentence2', sent3, 's4_sentence3');
      const out = k.ioC(sub('s4_grid', 0, 300)), keep = 1 - out;   // 컷 8: 17칸과 15 / 17 이 사라짐
      let n = 0;
      lcells.forEach((c, i) => {
        const a = k.ioC(sub('s4_hold', i * 20, 300));
        k.pose(c, { dy: 16 * (1 - a) - 20 * out, o: a * keep });
        if (c.green) { k.show(c.green, k.ioC(sub('s4_fill', n * 60, 250))); n++; }
      });
      const tn = k.ioC(sub('s4_fill', 1100, 300));
      k.pose(total, { dy: 16 * (1 - tn) - 20 * out, o: tn * keep });
      cells.forEach((c, i) => { const a = k.ioC(sub('s4_grid', 300 + i * 6, 300)); k.pose(c, { dy: 16 * (1 - a), o: a }); });
      const two = sub('s4_two', 0, 500), sc = two >= 1 ? 1 : 1 + 0.12 * Math.sin(Math.PI * two);   // 컷 9: 노랑 2칸과 2 박스, 0 박스는 DIM
      hits.forEach(h => k.pose(h, { s: sc, o: k.ioC(sub('s4_two', 0, 200)) }));
      const ao = k.ioC(sub('s4_two', 300, 300)), dim = 1 - (1 - k.DIM) * k.ioC(sub('s4_two', 0, 300));
      k.pose(same, { dy: 16 * (1 - k.ioC(sub('s4_grid', 800, 300))), o: k.ioC(sub('s4_grid', 800, 300)) * dim });
      k.pose(sameLabel, { dy: 16 * (1 - k.ioC(sub('s4_grid', 800, 300))), o: k.ioC(sub('s4_grid', 800, 300)) * dim });
      k.appear(alert, sub('s4_two', 300, 300)); k.appear(alertLabel, sub('s4_two', 300, 300));
    },
    rings: [],
  });
})();
