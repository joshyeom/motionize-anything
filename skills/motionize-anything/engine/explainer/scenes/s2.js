// 장면 2 재사용: 첫 컷의 초점은 화면 A 의 배너(파랑 테두리), 둘째 컷은 화면 A 와 B 의 같은 배너 둘(파랑), 셋째 컷은 두 배너가 함께 바뀐 초록 배너 둘이 초점이다. 화면 판은 회색 윤곽이다.
// 직접 그린 그림: 화면 판(kit.plate). ui.css 로 그린 것: 배너(kit.banner). 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '만들어 둔 블록은 여러 화면에서 다시 씁니다',
    sentence2: '같은 배너를 화면 A 와 화면 B 에 그대로 놓았습니다',
    sentence3: '한 곳에서 블록을 고치면 놓인 모든 화면에 같이 반영됩니다',
    plateA: '화면 A', plateB: '화면 B', banner: '같은 배너',
  };
  const PA = { x: 160, y: 280, w: 720, h: 560 }, PB = { x: 1040, y: 280, w: 720, h: 560 };
  const BAN = { w: 600, s: 2.4, h: 118 }, PAD = 16;
  let sent1, sent2, sent3, plateA, plateB, frames = [], blue = [], green = [], ready = false;

  MotionScenes.register(2, {
    build(root, kit) {
      const B = kit.FOCUS.blue, G = kit.FOCUS.green;
      plateA = kit.plate(root, { ...PA, title: TEXT.plateA, titleSize: 36 });
      plateB = kit.plate(root, { ...PB, title: TEXT.plateB, titleSize: 36 });
      // 판마다 배너 둘(파랑과 초록)을 같은 자리에 겹쳐 두고 셋째 컷에서 바꾼다. 테두리는 배너 아래에 깐다
      [PA, PB].forEach(P => {
        const x = P.x + (P.w - BAN.w) / 2, y = P.y + 200;
        const fr = c => kit.box(root, { x: x - PAD, y: y - PAD, w: BAN.w + 2 * PAD, h: BAN.h + 2 * PAD, radius: 28, bg: c.bg, border: '6px solid ' + c.edge });
        frames.push({ b: fr(B), g: fr(G) });
        blue.push(kit.banner(root, { x, y, w: BAN.w, s: BAN.s, tone: 'info', text: TEXT.banner }));
        green.push(kit.banner(root, { x, y, w: BAN.w, s: BAN.s, tone: 'success', text: TEXT.banner }));
      });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['다시 씁니다', 'blue']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['같은 배너', 'blue']]);
      sent3 = kit.sentence(root, TEXT.sentence3, 3, [['같이 반영됩니다', 'green']]);
    },
    measure(kit) {
      blue.forEach(b => b.fit()); green.forEach(b => b.fit());
      kit.fitSentence(sent1); kit.fitSentence(sent2); kit.fitSentence(sent3);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.captions(ctx, sent1, 's2_sentence1', sent2, 's2_sentence2', sent3, 's2_sentence3');
      k.show(plateA, k.ioC(sub('s2_hold', 0, 500))); k.show(plateB, k.ioC(sub('s2_hold', 0, 500)));
      // 첫 컷: 화면 A 에 배너가 놓인다. 둘째 컷: 화면 B 에도 놓인다. 셋째 컷: 둘 다 초록 배너로 바뀐다
      const put = [k.ioC(sub('s2_first', 0, 500)), k.ioC(sub('s2_second', 0, 500))], chg = k.ioC(sub('s2_sync', 0, 700));
      [0, 1].forEach(i => {
        k.pose(frames[i].b, { dy: 16 * (1 - put[i]), o: put[i] * (1 - chg) }); k.pose(blue[i], { dy: 16 * (1 - put[i]), o: put[i] * (1 - chg) });
        k.pose(frames[i].g, { o: put[i] * chg }); k.pose(green[i], { o: put[i] * chg });
      });
    },
    rings: [],
  });
})();
