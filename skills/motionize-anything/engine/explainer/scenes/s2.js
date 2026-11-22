// 장면 2 재사용: 같은 배너를 화면 판 2개에 놓는다. 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '만들어 둔 블록은 여러 화면에서 다시 씁니다',
    sentence2: '같은 배너를 화면 A 와 화면 B 에 그대로 놓았습니다',
    plateA: '화면 A', plateB: '화면 B', banner: '같은 배너', save: '저장',
  };
  const PA = { x: 160, y: 270, w: 720, h: 640 }, PB = { x: 1040, y: 270, w: 720, h: 640 };
  let sent1, sent2, plateA, plateB, bannerA, bannerB, btnA, btnB, ready = false;

  MotionScenes.register(2, {
    build(root, kit) {
      plateA = kit.plate(root, { ...PA, title: TEXT.plateA });
      plateB = kit.plate(root, { ...PB, title: TEXT.plateB });
      bannerA = kit.banner(root, { x: PA.x + 40, y: PA.y + 110, s: 1.6, tone: 'info', text: TEXT.banner });
      bannerB = kit.banner(root, { x: PB.x + 40, y: PB.y + 110, s: 1.6, tone: 'info', text: TEXT.banner });
      btnA = kit.buttonBlock(root, { x: PA.x + 40, y: PA.y + 480, w: 160, h: 64, text: TEXT.save, variant: 'primary' });
      btnB = kit.buttonBlock(root, { x: PB.x + 40, y: PB.y + 480, w: 160, h: 64, text: TEXT.save, variant: 'primary' });
      sent1 = kit.sentence(root, TEXT.sentence1, 1);
      sent2 = kit.sentence(root, TEXT.sentence2, 2);
    },
    measure(kit) {
      bannerA.fit(); bannerB.fit();
      kit.fitSentence(sent1); kit.fitSentence(sent2, 1680, 30);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b);
      k.appear(sent1, sub('s2_sentence1', 0, 300)); k.appear(sent2, sub('s2_sentence2', 0, 300));
      k.show(plateA, k.ioC(sub('s2_hold', 0, 500))); k.show(plateB, k.ioC(sub('s2_hold', 0, 500)));
      // 판 A 의 배너와 버튼이 먼저, 같은 것이 판 B 에 이어서 나타난다
      k.appear(bannerA, sub('s2_place', 0, 400)); k.appear(btnA, sub('s2_place', 150, 400));
      k.appear(bannerB, sub('s2_place', 700, 400)); k.appear(btnB, sub('s2_place', 850, 400));
    },
    rings: [],
  });
})();
