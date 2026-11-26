// 장면 1 블록 조합: 첫 컷의 초점은 가운데 모인 블록 3개(파랑 채움), 둘째 컷은 블록이 사라지고 배너 하나가 초점(파랑 테두리와 이름표), 셋째 컷은 같은 배너의 아이콘과 문구가 바뀐 노랑 배너가 초점이다.
// 직접 그린 그림: 블록(kit.brick). daisyUI 로 그린 것: 배너(kit.banner). 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '박스, 아이콘, 텍스트 블록을 끼워 배너 하나를 만듭니다',
    sentence2: '이렇게 만든 블록 하나가 컴포넌트입니다',
    sentence3: '아이콘과 텍스트만 바꿔도 같은 틀로 다른 배너가 됩니다',
    b1: '박스', b2: '아이콘', b3: '텍스트', banner: '배너', banner2: '다른 배너', tag: '컴포넌트',
  };
  const BW = 380, BH = 220, GAP = 40, Y = 600;
  const X0 = 960 - (3 * BW + 2 * GAP) / 2;   // 모인 뒤 첫 블록 왼쪽 x
  const FROM = [-420, 0, 420];                // 처음 흩어진 위치(모인 자리에서 가로로 벗어난 거리)
  const BAN = { cx: 960, w: 900, s: 3, h: 147 }, PAD = 20;
  let sent1, sent2, sent3, bricks = [], banA, banB, frameA, frameB, tag, ready = false;

  MotionScenes.register(1, {
    build(root, kit) {
      const B = kit.FOCUS.blue, Y2 = kit.FOCUS.yellow, y = Y + (BH - BAN.h) / 2;
      [TEXT.b1, TEXT.b2, TEXT.b3].forEach((t, i) => bricks.push(kit.brick(root, { x: X0 + i * (BW + GAP), y: Y, w: BW, h: BH, color: B.bg, edge: B.edge, text: t, size: 44, weight: 800, textColor: B.ink })));
      // 배너 둘(파랑과 노랑)을 같은 자리에 겹쳐 두고 셋째 컷에서 바꾼다. 테두리는 배너보다 먼저 만들어 아래에 깐다
      const fr = (c) => kit.box(root, { x: BAN.cx - BAN.w / 2 - PAD, y: y - PAD, w: BAN.w + 2 * PAD, h: BAN.h + 2 * PAD, radius: 28, bg: c.bg, border: '6px solid ' + c.edge });
      frameA = fr(B); frameB = fr(Y2);
      banA = kit.banner(root, { cx: BAN.cx, y, w: BAN.w, s: BAN.s, tone: 'info', text: TEXT.banner });
      banB = kit.banner(root, { cx: BAN.cx, y, w: BAN.w, s: BAN.s, tone: 'warning', text: TEXT.banner2 });
      tag = kit.nameTag(root, { text: TEXT.tag, size: 36, h: 56, anchor: 'l' });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['끼워 배너 하나를 만듭니다', 'blue']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['컴포넌트', 'blue']]);
      sent3 = kit.sentence(root, TEXT.sentence3, 3, [['같은 틀로 다른 배너', 'yellow']]);
    },
    measure(kit) {
      banA.fit(); banB.fit();
      tag.put(BAN.cx - BAN.w / 2 - PAD, Y + (BH - BAN.h) / 2 - PAD - 70);   // 테두리 왼쪽 위 바로 위
      kit.fitSentence(sent1); kit.fitSentence(sent2); kit.fitSentence(sent3);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.captions(ctx, sent1, 's1_sentence1', sent2, 's1_sentence2', sent3, 's1_sentence3');
      // 첫 컷: 블록 3개가 나타나 가운데로 모인다
      const show = k.ioC(sub('s1_hold', 0, 500)), come = k.ioC(sub('s1_combine', 0, 1100));
      // 둘째 컷: 블록이 사라지고 파랑 테두리 배너와 이름표가 나타난다
      const gone = k.ioC(sub('s1_swap', 0, 400)), inB = k.ioC(sub('s1_swap', 400, 500));
      // 셋째 컷: 파랑 배너가 노랑 배너로 바뀐다
      const chg = k.ioC(sub('s1_change', 0, 700));
      bricks.forEach((b, i) => k.pose(b, { dx: FROM[i] * (1 - come), o: show * (1 - gone) }));
      k.pose(frameA, { dy: 16 * (1 - inB), o: inB * (1 - chg) }); k.pose(banA, { dy: 16 * (1 - inB), o: inB * (1 - chg) });
      k.pose(frameB, { o: chg }); k.pose(banB, { o: chg });
      k.pose(tag, { dy: 16 * (1 - inB), o: inB });
    },
    rings: [],
  });
})();
