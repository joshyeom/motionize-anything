// 장면 4 검색 화면: 컷 7 은 원인 칸 17개 중 15개가 초록 체크로 바뀌고 15 / 17 이 초점, 컷 8 은 17칸이 사라지고 화면 칸 50개와 빈 초록 박스 0 이 초점, 컷 9 는 노랑 2칸과 노랑 박스 2 가 초점이고 0 박스는 DIM 이다.
// 모든 그림은 daisyUI 로 그린다: 칸과 박스(kit.tile = alert), 화면 칸(kit.skeleton), 큰 숫자(kit.stat), 이름표(kit.text). 화면 글은 모두 TEXT 에 있다.
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
      total = kit.stat(root, { cx: 960, cy: TY + 150, s: 8.125, value: TEXT.total, tone: 'green' });
      for (let i = 0; i < N; i++) {
        const c = kit.tile(root, { x: LX + i * (LS + LG), y: LY, w: LS, h: LS, base: true, tone: 'yellow', variant: 'outline' });
        if (!KEEP.includes(i)) c.green = kit.tile(c, { x: 0, y: 0, w: LS, h: LS, tone: 'green', icon: 'tick', iconSize: 28 });
        lcells.push(c);
      }
      for (let i = 0; i < 50; i++) cells.push(kit.skeleton(root, { x: GX + (i % 10) * (CS + CG), y: GY + Math.floor(i / 10) * (CS + CG), w: CS, h: CS }));
      YELLOW.forEach(i => hits.push(kit.tile(root, { x: GX + (i % 10) * (CS + CG), y: GY + Math.floor(i / 10) * (CS + CG), w: CS, h: CS, s: 2, tone: 'yellow' })));
      // 큰 숫자 박스: 배율 작은 테두리 박스(모서리가 둥글어지지 않게) 위에 큰 숫자(kit.stat)를 얹는다
      const numBox = (y, tn, variant, value, base) => {
        const b = kit.tile(root, { x: BX, y, w: BOX, h: BOX, s: 3, tone: tn, variant, base });
        b.num = kit.stat(b, { cx: BOX / 2, cy: BOX / 2, s: 4, value, tone: tn === 'green' ? tn : '' });   // 0 은 초록 글자, 2 는 기본 글자색
        return b;
      };
      same = numBox(B1Y, 'green', 'outline', TEXT.same, true);
      sameLabel = kit.text(root, { x: BX + BOX + 24, y: B1Y + BOX / 2 - 36, size: 48, tone: 'green', text: TEXT.sameLabel });
      alert = numBox(B2Y, 'yellow', '', TEXT.alert, false);
      alertLabel = kit.text(root, { x: BX + BOX + 24, y: B2Y + BOX / 2 - 36, size: 48, tone: 'yellow', text: TEXT.alertLabel });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['15종류', 'green']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['아직 0개', 'green']]);
      sent3 = kit.sentence(root, TEXT.sentence3, 3, [['2개', 'yellow']]);
    },
    measure(kit) {
      total.fit(); same.num.fit(); alert.num.fit(); sameLabel.fit(); alertLabel.fit();
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
      const dim = 1 - (1 - k.DIM) * k.ioC(sub('s4_two', 0, 300)), si = k.ioC(sub('s4_grid', 800, 300));
      k.pose(same, { dy: 16 * (1 - si), o: si * dim });
      k.pose(sameLabel, { dy: 16 * (1 - si), o: si * dim });
      k.appear(alert, sub('s4_two', 300, 300)); k.appear(alertLabel, sub('s4_two', 300, 300));
    },
    rings: [],
  });
})();
