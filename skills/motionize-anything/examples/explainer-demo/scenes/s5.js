// 장면 5 남은 것: 첫 컷은 마친 단계 카드가 초록으로 채워지고, 둘째 컷은 남은 단계 카드가 노랑이 되며, 셋째 컷은 카드가 사라지고 다음 일 박스 3개가 나온다.
// 모든 그림은 daisyUI 로 그린다: 단계 카드(kit.tile = alert 와 card 모양 base), 체크(kit.icon), 박스(kit.tile), 화살표(kit.arrow). 화면 글은 모두 TEXT 에 있다.
(function () {
  const TEXT = {
    sentence1: '화면 50개를 3번 측정하고 판정까지 마쳤습니다',
    sentence2: '전체 보고서는 남은 단계 7개 중 6개를 마쳐야 나옵니다',
    sentence3: '보고서가 나오면 완료 확인 2개를 하고 단계 밖 판단 2개를 정합니다',
    // state: done 마침, skip 건너뜀(글자 없는 점선 박스), left 남음
    steps: [
      { name: '기준 화면 측정', state: 'done' },
      { name: '수정 전 캡처', state: 'done' },
      { name: '값 차이', state: 'done' },
      { name: '판정', state: 'done' },
      { name: '단계 집계', state: 'done' },
      { name: '원인 명세', state: 'left' },
      { name: '구현', state: 'skip' },
      { name: '수정 후 캡처', state: 'done' },
      { name: '대상 비교', state: 'left' },
      { name: '재판정', state: 'left' },
      { name: '반복 판단', state: 'left' },
      { name: '보고서 입력', state: 'left' },
      { name: '보고서 렌더', state: 'left' },
      { name: '정리', state: 'left' },
    ],
    next: ['보고서 받기', '완료 확인 2개', '단계 밖 판단 2개'],
  };
  const X0 = 162, BW = 216, BG = 14, BH = 190, ROW_Y = [450, 660], SZ = 30;
  const NX = 160, NY = 620, NW = 460, NH = 220, NGAP = 110;
  let sent1, sent2, sent3, boxes = [], next = [], arrows = [], ready = false;

  MotionScenes.register(5, {
    build(root, kit) {
      let doneN = 0, leftN = 0;
      TEXT.steps.forEach((st, i) => {
        const x = X0 + (i % 7) * (BW + BG), y = ROW_Y[Math.floor(i / 7)];
        const skip = st.state === 'skip';
        const card = skip ? kit.tile(root, { x, y, w: BW, h: BH, variant: 'dash' }) : kit.tile(root, { x, y, w: BW, h: BH, size: SZ, text: st.name, base: true });
        const b = { card, state: st.state, doneOrder: -1, leftOrder: -1 };
        if (!skip) {
          b.yellow = kit.tile(card, { x: 0, y: 0, w: BW, h: BH, size: SZ, text: st.name, tone: 'yellow' });
          if (st.state === 'done') b.green = kit.tile(card, { x: 0, y: 0, w: BW, h: BH, size: SZ, text: st.name, tone: 'green', icon: 'tick', iconSize: 30 });
        }
        if (st.state === 'done') {
          b.doneOrder = doneN++;
          b.mark = kit.ui(card, { x: BW / 2 - 24, y: 24, w: 24, h: 24, s: 2, html: '<span' + kit.textAttr('green') + '>' + kit.icon('check', 24) + '</span>' });
        } else if (st.state === 'left') b.leftOrder = leftN++;
        boxes.push(b);
      });
      TEXT.next.forEach((title, i) => next.push(kit.tile(root, {
        x: NX + i * (NW + NGAP), y: NY, w: NW, h: NH, size: 48, text: title,
        tone: i === 0 ? 'blue' : 'yellow', variant: i === 0 ? 'outline' : '', base: i === 0,
      })));
      for (let i = 0; i < 2; i++) arrows.push(kit.arrow(root, { x1: NX + i * (NW + NGAP) + NW + 12, y1: NY + NH / 2, x2: NX + (i + 1) * (NW + NGAP) - 12, y2: NY + NH / 2, tone: 'blue', width: 6, head: 20 }));
      sent1 = kit.sentence(root, TEXT.sentence1, 1, [['판정까지 마쳤습니다', 'green']]);
      sent2 = kit.sentence(root, TEXT.sentence2, 2, [['남은 단계 7개', 'yellow']]);
      sent3 = kit.sentence(root, TEXT.sentence3, 3, [['완료 확인 2개', 'yellow'], ['단계 밖 판단 2개', 'yellow']]);
    },
    measure(kit) {
      kit.fitSentence(sent1); kit.fitSentence(sent2); kit.fitSentence(sent3);
      ready = true;
    },
    render(ctx) {
      if (!ready) return;
      const k = ctx.kit, sub = (id, a, b) => k.sub(ctx, id, a, b), DIM = k.DIM;
      k.captions(ctx, sent1, 's5_sentence1', sent2, 's5_sentence2', sent3, 's5_sentence3');
      const out = k.ioC(sub('s5_next', 0, 300));   // 박스 14개가 위로 사라짐
      const dimN = k.ioC(sub('s5_left', 0, 300));  // 마친 박스가 DIM 으로 내려감
      boxes.forEach((b, i) => {
        const e = k.ioC(sub('s5_hold', i * 25, 300));
        const y = b.state === 'left' ? k.ioC(sub('s5_left', 300 + b.leftOrder * 60, 300)) : 0;
        // 첫 컷 마친 박스는 초록이 되며 1, 그 밖의 박스 DIM. 둘째 컷 마친 박스와 건너뛴 박스 DIM, 남은 박스는 노랑이 되며 1
        const on = b.state === 'done' ? k.ioC(sub('s5_done', b.doneOrder * 250, 250)) : 0;
        const base = b.state === 'done' ? DIM + (1 - DIM) * on * (1 - dimN) : b.state === 'skip' ? DIM : DIM + (1 - DIM) * y;
        k.pose(b.card, { dy: 16 * (1 - e) - 20 * out, o: e * base * (1 - out) });
        if (b.state === 'skip') return;
        if (b.state === 'done') {
          k.show(b.mark, on * dimN);   // 작은 체크는 초록 층이 사라진 뒤에만 보임
          k.show(b.yellow, 0); k.show(b.green, on * (1 - dimN));
        } else {
          k.show(b.yellow, y);
        }
      });
      next.forEach((b, i) => k.appear(b, sub('s5_next', 300 + i * 350, 300)));
      arrows.forEach((a, i) => a.draw(k.ioC(sub('s5_next', 550 + i * 350, 300))));
    },
    rings: [],
  });
})();
