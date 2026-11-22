// 장면 1 블록 조합: 박스, 아이콘, 텍스트 블록 3개가 모여 배너 하나가 된다. 화면 글은 모두 TEXT 에 있다.
// 직접 그린 그림: 블록(kit.brick). ui.css 로 그린 것: 배너(kit.banner).
(function () {
  const TEXT = {
    sentence1: '박스, 아이콘, 텍스트 블록을 끼워 배너 하나를 만듭니다',
    sentence2: '이렇게 만든 블록 하나가 컴포넌트입니다',
    b1: '박스', b2: '아이콘', b3: '텍스트', banner: '블록 3개가 모여 만든 배너',
  };
  const BW = 200, BH = 90, GAP = 20, Y = 380;
  const X0 = 960 - (3 * BW + 2 * GAP) / 2;   // 모인 뒤 첫 블록 왼쪽 x
  const FROM = [-360, 0, 360];                // 처음 흩어진 위치(모인 자리에서 가로로 벗어난 거리)
  let sent1, sent2, bricks = [], banner, ready = false;

  MotionScenes.register(1, {
    build(root, kit) {
      const W = kit.W, fill = [W.blue100, W.y100, W.muted], edge = [W.blue200, W.y200, W.strong];
      [TEXT.b1, TEXT.b2, TEXT.b3].forEach((t, i) => bricks.push(kit.brick(root, { x: X0 + i * (BW + GAP), y: Y, w: BW, h: BH, color: fill[i], edge: edge[i], text: t, size: 30 })));
      banner = kit.banner(root, { cx: 960, y: 620, s: 2, tone: 'info', text: TEXT.banner });
      sent1 = kit.sentence(root, TEXT.sentence1, 1);
      sent2 = kit.sentence(root, TEXT.sentence2, 2);
    },
    measure(kit) {
      banner.fit();   // 글 폭에 맞춰 배너 폭을 정한다(글꼴을 불러온 뒤)
      kit.fitSentence(sent1); kit.fitSentence(sent2, 1680, 30);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.appear(sent1, sub('s1_sentence1', 0, 300)); k.appear(sent2, sub('s1_sentence2', 0, 300));
      // 블록 3개가 나타나 가운데로 모이고, 이어서 배너가 나타난다
      const show = k.ioC(sub('s1_hold', 0, 500)), come = k.ioC(sub('s1_combine', 0, 1100));
      bricks.forEach((b, i) => k.pose(b, { dx: FROM[i] * (1 - come), o: show }));
      k.appear(banner, sub('s1_combine', 1100, 500));
    },
    rings: [],
  });
})();
