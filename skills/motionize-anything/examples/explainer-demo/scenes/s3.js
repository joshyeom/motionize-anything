// 장면 3 실제 실행: 첫 컷의 초점은 초록 체크 칸 14개와 큰 14 / 15 다(빈 점선 칸 1개는 회색 윤곽). 둘째 컷은 칸과 숫자가 위로 올라가 DIM 이 되고, 단계 4개(daisyUI steps) 가운데 셋째가 노랑 느낌표로 커진 초점이다.
// 모든 그림은 daisyUI 로 그린다: 칸(kit.tile = alert), 큰 숫자(kit.stat), 단계(steps 와 step-warning). 화면 글은 모두 TEXT 에 있다.
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
  const LIFT = 300, SC = 4, SGAP = 400, SX = (1920 - SC * SGAP) / 2, SY = 610, SS = 2.8;   // 단계: 칸 폭 SGAP, 배율 SS
  let sent1, sent2, grp, num, cells = [], steps, hot, ready = false;

  MotionScenes.register(3, {
    build(root, kit) {
      grp = kit.group(root, {});
      for (let i = 0; i < TOTAL; i++) {
        const x = GX + (i % COLS) * (CS + CG), y = GY + Math.floor(i / COLS) * (CS + CG);
        const cell = kit.tile(grp, { x, y, w: CS, h: CS, base: true, variant: 'dash' });
        if (i < DONE) { cell.green = kit.tile(cell, { x: 0, y: 0, w: CS, h: CS, tone: 'green', icon: 'tick', iconSize: 34 }); cell.order = i; }
        else cell.q = kit.text(cell, { cx: CS / 2, cy: CS / 2, size: 64, tone: 'neutral', text: TEXT.unknown });
        cells.push(cell);
      }
      num = kit.stat(grp, { cx: NX + NUM_W / 2, cy: GY + (3 * CS + 2 * CG) / 2, s: 6.25, value: TEXT.num, tone: 'green' });
      // 단계 4개: 칸 폭 SGAP 로 놓은 daisyUI steps. 셋째 단계 동그라미는 노랑(초점 노랑 채움) 느낌표 층(hot)을 위에 겹쳐 커지게 한다
      const li = TEXT.steps.map((t, i) => '<li' + kit.textAttr(i === 2 ? 'yellow' : 'neutral', 'width:' + SGAP / SS + 'px;white-space:nowrap', 'step') + '><b>' + kit.esc(t) + '</b></li>').join('');
      steps = kit.ui(root, { x: SX, y: SY, w: SC * SGAP / SS, h: 100, s: SS, html: '<ul class="steps">' + li + '</ul>' });
      hot = kit.ui(root, { x: SX + 2 * SGAP, y: SY, w: SGAP / SS, h: 40, s: SS, html: '<ul class="steps"><li class="step" data-content="' + TEXT.warn + '" style="--step-bg:var(--color-focus-yellow-bg);--step-fg:var(--color-base-content);width:' + SGAP / SS + 'px;height:40px"></li></ul>' });
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['14쌍', 'green']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['모바일 앱 테스트를 제외한 1곳', 'yellow']]);
    },
    measure(kit) {
      num.fit(); cells.forEach(c => { if (c.q) c.q.fit(); });
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
      // 둘째 컷: 칸과 숫자가 위로 올라가 DIM, 단계 4개가 나타나고 셋째가 노랑 느낌표로 커짐
      const up = k.ioC(sub('s3_warn', 0, 500));
      k.pose(grp, { dy: -LIFT * up, o: 1 - (1 - k.DIM) * up });
      ap(steps, sub('s3_warn', 500, 300));
      const grow = k.ioC(sub('s3_warn', 860, 340));
      k.pose(hot, { s: 1 + 0.25 * grow, o: grow });
    },
    rings: [],
  });
})();
