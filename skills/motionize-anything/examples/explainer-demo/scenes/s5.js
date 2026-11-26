// 장면 5 남은 것: 자막(컷 문장과 하이라이트)만 있는 최소 파일. 그림은 다음 작업자가 render 에 그린다. 화면 글은 모두 TEXT 에 있다.
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
  const X0 = 162, BW = 216, BG = 14, BH = 190, ROW_Y = [450, 660], D = 48;
  const NX = 160, NY = 620, NW = 460, NH = 220, NGAP = 110;
  let sent1, sent2, sent3, boxes = [], next = [], arrows = [], ready = false;

  MotionScenes.register(5, {
    build(root, kit) {
      const W = kit.W, G = kit.FOCUS.green, B = kit.FOCUS.blue, Y = kit.FOCUS.yellow;
      let doneN = 0, leftN = 0;
      TEXT.steps.forEach((st, i) => {
        const x = X0 + (i % 7) * (BW + BG), y = ROW_Y[Math.floor(i / 7)];
        const skip = st.state === 'skip';
        const card = kit.box(root, { x, y, w: BW, h: BH, radius: 14, bg: skip ? W.muted : W.white, border: skip ? `2px dashed ${W.n300}` : `2px solid ${W.strong}` });
        const b = { card, state: st.state, doneOrder: -1, leftOrder: -1 };
        if (!skip) {
          b.yellow = kit.box(card, { x: 0, y: 0, w: BW, h: BH, radius: 14, bg: Y.bg, border: `3px solid ${Y.edge}` });
          if (st.state === 'done') {
            b.green = kit.box(card, { x: 0, y: 0, w: BW, h: BH, radius: 14, bg: G.bg, border: `3px solid ${G.edge}` });
            b.big = kit.box(b.green, { x: (BW - 6) / 2 - 36, y: 22, w: 72, h: 72, color: G.text });
            b.big.innerHTML = kit.icon('tick', 72);
          }
          b.ring = kit.box(card, { x: BW / 2 - D / 2, y: 36, w: D, h: D, radius: D / 2, border: `3px solid ${W.n300}` });
          b.name = kit.box(card, { x: 0, y: 118, w: BW, h: 40, text: st.name, size: 30, weight: 800, color: st.state === 'done' ? G.ink : Y.ink, align: 'center' });
        }
        if (st.state === 'done') {
          b.doneOrder = doneN++;
          b.mark = kit.box(card, { x: BW / 2 - D / 2, y: 36, w: D, h: D, color: G.text });
          b.mark.innerHTML = kit.icon('check', D);
        } else if (st.state === 'left') b.leftOrder = leftN++;
        boxes.push(b);
      });
      TEXT.next.forEach((title, i) => next.push(kit.box(root, {
        x: NX + i * (NW + NGAP), y: NY, w: NW, h: NH, radius: 20, bg: i === 0 ? W.white : Y.bg,
        border: i === 0 ? `6px solid ${B.edge}` : `6px solid ${Y.edge}`, text: title, size: 48, weight: 800, color: i === 0 ? W.text : Y.ink, align: 'center',
      })));
      for (let i = 0; i < 2; i++) arrows.push(kit.arrow(root, { x1: NX + i * (NW + NGAP) + NW + 12, y1: NY + NH / 2, x2: NX + (i + 1) * (NW + NGAP) - 12, y2: NY + NH / 2, color: B.edge, width: 6, head: 20 }));
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
          k.show(b.mark, on * dimN); k.show(b.ring, 1 - on);   // 작은 체크는 초록 층이 사라진 뒤에만 보임
          k.pose(b.name, { dy: 16 * (1 - on) - 20 * dimN, o: on * (1 - dimN) });
          k.show(b.yellow, 0); k.show(b.green, on * (1 - dimN));
        } else {
          k.show(b.yellow, y); k.show(b.ring, 1 - y);
          k.pose(b.name, { dy: 16 * (1 - y), o: y });
        }
      });
      next.forEach((b, i) => k.appear(b, sub('s5_next', 300 + i * 350, 300)));
      arrows.forEach((a, i) => a.draw(k.ioC(sub('s5_next', 550 + i * 350, 300))));
    },
    rings: [],
  });
})();
