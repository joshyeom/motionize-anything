# 장면 파일 계약 (설명 모션 엔진)

장면 파일(`scenes/s<n>.js`)을 만드는 개발자와 에이전트가 읽는 문서입니다. 참고 구현은 이 폴더의 `scenes/s1.js`, `scenes/s2.js` 입니다.
좌표, 화면 문장, 시간의 기준은 각 장면 파일 위쪽의 `TEXT` 와 `motion-steps.js` 입니다.
장면 수와 정지 수는 [motion-steps.js](motion-steps.js)의 단계 표에 있습니다.

## 고치면 안 되는 파일

| 파일                                                           | 이유                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `index.html`                                                   | 틀(장면 컨테이너, 장면 사이 슬라이드, 칩, 처음으로 돌아가기, 강조 테두리, 발표 모드) |
| `motion-steps.js`                                              | 단계 표와 시간 계산(단계 길이는 이 파일의 단계 표에서만 바꿈)                        |
| `scenes/kit.js`, `ui.css`                                      | 공용 부품과 화면 조각 CSS(부품이 모자라면 kit 에 추가하고 이 문서 부품 표에 같이 적음) |
| `click-fx.js`, `export.mjs`, `baseline.mjs`, `tools/check.mjs` | 엔진과 확인 도구                                                                     |

- 장면 파일은 자기 파일 하나만 고칩니다.
- 엔진이나 장면 파일을 고친 뒤 브라우저가 예전 파일을 쓰면 `index.html` 의 `ASSET_V` 값을 올립니다. 확인 도구는 매번 새 브라우저를 열어서 영향이 없습니다.

## 등록

```js
// scenes/s3.js
(function () {
  const TEXT = { sentence1: '...', sentence2: '...' }; // 화면 문장은 모두 여기
  let a,
    b,
    ready = false; // 장면 요소는 이 파일 안 변수에 둔다
  MotionScenes.register(3, {
    build(root, kit) {
      /* 요소를 한 번 만든다 */
    },
    measure(kit) {
      /* 선택. 글꼴과 ui.css 를 불러온 뒤. 텍스트 폭에 따라 정하는 자리 */ ready = true;
    },
    render(ctx) {
      if (!ready) return; /* 프레임마다 움직이는 스타일을 모두 정한다 */
    },
    rings: [],
  });
})();
```

| 키                 | 받는 값                                                                                                              | 하는 일                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `build(root, kit)` | `root`: 이 장면의 컨테이너(무대 전체 1920x1080, 왼쪽 위 0,0), `kit`: 공용 도구                                       | 페이지를 열 때 한 번 불립니다. `kit` 부품 함수로 `root` 안에 요소를 만듭니다                                                                  |
| `measure(kit)`     | `kit`                                                                                                                | 선택 사항입니다. 글꼴과 `ui.css` 를 다 불러온 뒤 무대 배율 1 에서 불립니다(페이지를 열 때 2번). 텍스트 폭에 따라 정하는 자리만 여기서 정합니다 |
| `render(ctx)`      | `ctx.t`: 기준 초, `ctx.T`: 단계 id 별 `{s, e, v}`(기준 초, `v` 는 단계 값), `ctx.kit`: 공용 도구, `ctx.n`: 장면 번호 | 장면이 보이는 동안 프레임마다 불립니다                                                                                                        |
| `rings`            | `[{ step, rect() }]`                                                                                                 | 강조 테두리 대상(`step` 은 ring 단계 id, `rect()` 는 무대 좌표 `{x, y, w, h}`)                                                                |

**measure**

- `measure` 가 불릴 때 숨은 장면의 컨테이너는 `display:none` 이라 그 안 요소의 `offsetWidth` 와 `getBoundingClientRect` 가 0 입니다.
- 그래서 텍스트 폭은 `kit.textWidth` 로, `kit.ui` 마크업 크기는 `el.natural()` 로 잽니다. 둘 다 숨은 장면에서도 동작합니다.
- `measure` 가 자리를 정하기 전에는 `render` 가 아무것도 그리지 않게 `ready` 값으로 막습니다.

## render 규칙

- 속도가 1.0 이라 기준 초와 실제 초가 같습니다.
- 장면 컨테이너의 슬라이드와 불투명도는 틀이 정합니다. 장면 파일은 컨테이너 안쪽만 그립니다.
- 컨테이너가 보이지 않는 동안(불투명도 0)에는 `render` 가 불리지 않습니다. 그래서 `render` 는 앞 프레임 값을 쓰지 않습니다.
- `render` 는 그 `t` 에서 움직이는 요소마다 위치, 불투명도, 선, 텍스트를 모두 다시 정합니다. 같은 `t` 면 언제나 같은 그림이어야 합니다.
- CSS 애니메이션, CSS transition, `Math.random`, `Date`, `performance.now` 를 쓰지 않습니다. `kit.ui` 부품의 상태 전환(transition)은 `kit.ui` 가 끕니다.
- 화면 문장은 `TEXT` 에만 두고 `textContent` 로 넣습니다. `kit.ui` 마크업에 넣는 텍스트는 `kit` 부품이 HTML 특수 문자를 바꿔 넣습니다.

## 좌표와 겹침 순서

- 모든 좌표는 무대 좌표 px 입니다(1920x1080, 왼쪽 위 0,0).
- 장면 요소는 칩 영역 아래(y 90~1080)에만 둡니다.
- `#stage` 안의 `div` 는 모두 `position:absolute` 입니다. 부품 함수가 `left`, `top` 을 정합니다. `kit.ui` 마크업은 shadow root 안에 있어 이 규칙이 적용되지 않습니다.
- 겹침 순서는 만든 순서입니다. 나중에 만든 요소가 위에 보입니다. 이동해서 다른 요소 위를 지나가는 요소는 나중에 만듭니다.
- `root` 에 다른 부품 요소(예: `panel`, `brick`)를 넘기면 그 요소 안에 만들어지고, `x, y` 는 그 요소의 왼쪽 위 기준입니다. 그 요소를 `pose` 나 `moveAlong` 으로 이동하거나 줄이면 안의 요소도 같이 이동하고 줄어듭니다.
- 강조 테두리와 칩은 모든 장면보다 위에 보입니다.

## 단계 진행값

| 함수                         | 돌려주는 값                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `kit.prog(ctx, id)`          | 단계 `id` 전체 진행값 0~1                                                       |
| `kit.sub(ctx, id, ms0, ms)`  | 단계 시작 `ms0` 뒤부터 `ms` 동안 0~1. `ms` 가 0 이면 그 순간 전에는 0, 뒤에는 1 |
| `ctx.T[id].s`, `ctx.T[id].e` | 단계 시작과 끝(기준 초)                                                         |

```js
kit.captions(ctx, sent1, 's3_sentence1', sent2, 's3_sentence2', sent3, 's3_sentence3'); // 아래 자막 한 줄이 컷마다 바뀜(문장은 최대 3개)
```

## kit 값

| 이름              | 내용                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kit.C`           | 무대 색 `bg`, `card`, `ink`, `sub`, `line`, `blue`                                                                                                                          |
| `kit.W`           | 색 팔레트(`ui.css` 의 `--mx-*` 변수와 같은 값. 바꿀 때는 둘을 함께 바꿈) |
| `kit.F`           | 글꼴 `sans`(Pretendard), `mono`("SF Mono", Menlo)                                                                                                                       |
| `kit.SENT`        | 문장 자리 무대 아래 가운데 한 자리 `y 924, h 52, 40px 700`(1~3번 문장이 모두 같은 자리, 가로는 `fitSentence` 가 가운데에 맞춤). 장면마다 `#scene<n>{--fig-dy}`(그림만 옮기는 값)는 0 |
| `kit.TONES`       | 배너 tone 5가지(info, neutral, success, warning, error)와 그 아이콘 이름(info, check, warn)                                                                                |
| `kit.BANNER_TEXT` | 예시 배너 문구                                                                                                                                                              |

- kit 이 직접 그리는 모양(프로그램 박스, 조각 카드, 문서 묶음, 점, 레고 블록, 돌기, 화면 판, 이름 태그, 선, 막대)은 `kit.W` 와 `kit.C` 값만 씁니다. 장면 파일에서 색 값을 새로 적지 않습니다.
- 사물이나 비유를 그린 그림은 이미지 생성 도구(codex)로 만들어 `assets/` 에 두고 `kit.img` 로 놓습니다. 장면 파일이나 kit 에서 직접 그리지 않습니다.

## kit 부품

모든 부품은 `root` 에 요소를 만들어 돌려줍니다. `x, y` 를 받고, `h` 가 있으면 텍스트는 세로 가운데에 놓입니다(행 높이는 `h`).

- 만든 위치와 크기는 `el._b = {x, y, w, h}` 에 있습니다. 폭을 주지 않는 부품(`tag`, `label`, `count`, `sentence`)은 `el._b.w` 가 0 이라 `kit.center` 의 기준점이 왼쪽 가운데 점입니다.
- 만든 요소의 텍스트는 `el.t`(span)에 있습니다.

### 기본 부품

| 함수                                                                                                                    | 모양                                                                                    | 주요 인자(기본값)                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `kit.box(root, o)`                                                                                                      | 모든 부품의 바탕(아래 부품으로 안 되는 모양에만 씀)                                     | `x y w h bg radius border border2 text font size weight color align pad num` |
| `kit.panel(root, o)`                                                                                                    | 다른 요소를 담는 카드                                                                   | `x y w h bg(card) radius(12) border`                                         |
| `kit.label(root, o)`                                                                                                    | 카드 없는 텍스트                                                                        | `x y h text font('sans') size(28) weight(500) color(sub)`                    |
| `kit.bar(root, o)`                                                                                                      | 텍스트 대신 쓰는 막대(모서리는 높이의 절반)                                             | `x y w h(20) color(sub)`                                                     |
| `kit.sentence(root, text, line, marks)` | 아래 자막 한 줄(`line` 1~3 은 같은 자리). `marks` 는 `[부분 문자열, 'blue' 또는 'green' 또는 'yellow']` 목록이고 앞에서부터 찾아 하이라이트함(컷마다 1~2곳). `el.t.textContent` 는 원문 그대로 | `marks([])` |
| `kit.FOCUS`, `kit.MARK`, `kit.DIM` | 초점 색(`FOCUS.blue`, `green`, `yellow` 의 `bg`, `edge`, `ink`, `text`), 자막 하이라이트 색(`MARK`), 초점이 아닌 것의 불투명도(`DIM` 0.45). 채움 위 글자와 체크는 `ink`, 무대 바탕 위 색 글자와 선은 `text`. blue 는 흐름과 단위, green 은 마침과 반영, yellow 는 남음과 주의 | |
| `kit.captions(ctx, s1, id1, s2, id2, s3, id3)` | 자막 교체. 첫 문장 `s1` 이 나타나고, 다음 컷 움직임이 시작되면 DIM 까지 흐려진 뒤, 다음 문장 단계에서 위로 12px 움직이며 0~150ms 에 사라지고 150~300ms 에 다음 문장이 같은 자리에 나타남. `s2`, `s3` 는 없어도 됨. `render` 에서 매 프레임 부름. `id` 는 `s<n>_sentence<k>` 이고 같은 번호의 `s<n>_read<k>` 단계가 필요함 | `ctx, s1, id1, s2, id2, s3, id3` |
| `kit.fitSentence(el, max, min)` | 문장이 한 행(`max` px, 기본 1640)에 들어가도록 크기를 `min`(기본 32)까지 줄이고 가로 가운데에 놓음(measure 안에서만) | |
| `kit.textWidth(text, o)`                                                                                                | 텍스트 폭(px, measure 안에서만)                                                         | `font size weight pre`                                                       |
| `kit.view(root)`                                                                                                        | 구도 컨테이너(1920x1080). 장면 안 구도 교체에 씀                                        |                                                                              |
| `kit.row`, `kit.file`, `kit.card`, `kit.slot`, `kit.count`, `kit.tag`, `kit.badge`, `kit.path`, `kit.chip`, `kit.srccard` | 이전 시안에서 쓴 카드와 태그(이 시안은 쓰지 않음)                                       | `kit.js` 주석                                                                |

### 선과 코드

| 함수                     | 모양                                                                               | 주요 인자(기본값)                           |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `kit.arrow(root, o)`     | 직선 화살표(SVG). `el.draw(p)` 로 0~1 만큼 자람                                    | `x1 y1 x2 y2 color(blue) width(3) head(14)` |
| `kit.poly(root, o)`      | 꺾은선 화살표(`el.draw(p)`, `el.setPoints(점 목록)`, `head` 0 이면 화살촉 없음)    | `points color width head`                   |
| `kit.outline(root, o)`   | 속이 빈 파랑 테두리(`el.at(사각형, 바깥 여백, 모서리)` 로 자리를 정함)             | `radius(10) width(2)`                       |
| `kit.code(root, o)`      | 코드 한 행(고정폭). `hl` 조각은 `el.hl`                                            | `x y h text hl size(26)`                    |
| `kit.codeLines(root, o)` | 코드 여러 행(공백 그대로). 행마다 `el.hls`(강조 조각), `el.hlRect(i)`, `el.endX()` | `x y lineH(42) size(22) lines`              |

### 레고 블록 그림 (kit 이 직접 그림)

| 함수                      | 모양                                                                                                             | 주요 인자(기본값)                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `kit.brick(root, o)`      | 둥근 몸통과 윗면 돌기로 된 레고 블록(`el.resize(w, h)` 무대 px, `el.moveTo(x, y)`, `el.onResize` 안쪽 배치 함수) | `x y w h color edge(W.line) stud radius(10) k(1) text font size(26) weight(700) textColor align pad` |
| `kit.studs(el, o)`        | `el` 윗면에 돌기를 같은 간격으로 놓음(폭이 바뀌면 `el.layoutStuds()`)                                            | `fill edge k(1)`(돌기 44x14, 모서리 6 을 `k` 배로)                                                   |
| `kit.plate(root, o)`      | 점 격자가 있는 흰 화면 판과 위쪽 화면 이름(`el.setRect(x, y, w, h, k)`)                                          | `x y w h title titleSize(28) radius(16)`                                                             |
| `kit.nameTag(root, o)`    | 한글 이름과 작은 영문 이름이 든 이름 태그(`el.put(기준 x, y)` 로 놓음, measure 안에서 다시 put)                  | `text en tone('gray'\|'blue') size(28) enSize(24) h(46) anchor('c'\|'l'\|'r')`                       |
| `kit.iconSvg(tone, size)` | tone 의 아이콘 SVG 문자열(문서 안 kit 그림용)                                                                    |                                                                                                      |
| `kit.icon(name, size)`    | 아이콘 SVG 문자열(`info`, `check`, `tick`, `warn`, `display:block`). `tick` 은 원 없이 체크 선만 그리며 채움 위에서 `FOCUS` 의 `ink` 색으로 씀 | |

### UI 부품 (ui.css 로 그림)

| 함수                       | 모양                                                                                                                                                                                                      | 주요 인자(기본값)                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `kit.ui(root, o)`          | 마크업을 `ui.css` 로 그린 요소(아래 kit.ui 절)                                                                                                                                                             | `x y w h s(1) html`                                                |
| `kit.banner(root, o)`      | `mx-Banner`(`data-tone`, `mx-Banner__icon`, `mx-Banner__body`), 높이 49 를 `s` 배로 확대(`el.fit()` 은 measure 안에서 폭을 텍스트에 맞춤, `el.setStyle({ radius })` 는 모서리 배율이고 1 이 12px)       | `x y` 또는 `cx y`, `s(2.4) tone('warning') text strong w(무대 px)` |
| `kit.bannerBlock(root, o)` | `banner` 위에 kit 돌기                                                                                                                                                                                    | `banner` 인자와 `stud(W.y100) edge(W.y200) k`                      |
| `kit.miniBanner(root, o)`  | 문구 없는 `bannerBlock` 위에 문구 대신 막대(`el.bar`)                                                                                                                                                     | `x y w(무대 px) s(1) k`                                            |
| `kit.buttonBlock(root, o)` | `mx-Button`(solid, sm 높이 40)을 높이 `h` 에 맞춰 확대하고 돌기를 얹음(primary 는 저장, secondary 는 취소, `text` 가 null 이면 문구 없는 버튼)                                                           | `x y w h(무대 px) text variant('primary'\|'secondary') k`          |
| `kit.radioBlock(root, o)`  | kit 블록 몸통 안에 `mx-Radio`(md 20px, 1.5 배) 3개와 막대 3개(첫 번째가 선택 상태)                                                                                                                       | `x y w h`                                                          |
| `kit.inputBlock(root, o)`  | kit 블록 몸통 안에 `mx-Textarea` 필드(높이 89 를 `h - 32` 에 맞춰 줄임)와 막대 2개                                                                                                                      | `x y w h`                                                          |

### 도식 부품 (프로그램 박스, 조각 카드, 문서 묶음, 점. kit 이 직접 그림)

| 함수                      | 모양                                                                                                                                                                                                                        | 주요 인자(기본값)                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `kit.progBox(root, o)`    | 모서리 20, 테두리 3px 프로그램 박스의 가운데에 제목 34px 700(`el.t`)과 작은 글 24px 500(`el.st`, 없으면 null)을 둠, `el.setTone(tone)` 은 값이 바뀔 때만 스타일을 바꿔 render 에서 매 프레임 불러도 됨(지금 값은 `el.tone`) | `x y w h title sub tone('dark'\|'side'\|'plain'\|'off')` |
| `kit.sidecarBox(root, o)` | `progBox` 뒤에 연결 막대 2개(`el.links`, 높이의 30%와 70% 자리, 박스 밖 28, 두께 8)와 바퀴 1개(`el.wheel`, 지름 44, 박스 아래로 22 나옴)를 그림(`el._b` 는 박스 본체 기준)                                                  | `progBox` 인자, `tone('side')`                           |
| `kit.chunkCard(root, o)`  | 글자 없는 조각 카드(흰 배경, 모서리 10, 테두리 2px, 위쪽 색 띠 14 `el.band` 는 blue 파랑과 amber 노랑, 회색 막대 2개)                                                                                                        | `x y w(132) h(88) kind('blue'\|'amber')`                  |
| `kit.docStack(root, o)`   | 종이 3장(`el.papers`, 12px 씩 오른쪽 위로 어긋남)이 겹친 문서 묶음, 맨 앞 종이에 색 띠와 막대 5개, 제목 28px 700(`el.t`)과 작은 글 22px 회색(`el.st`)은 묶음 아래 가운데(아래로 약 90px 차지, `el._b` 는 종이 부분 기준)    | `x y w(220) h(270) title sub kind('blue')`                |
| `kit.packet(root, o)`     | 요청과 응답을 나타내는 원(흰 테두리 4px), 만들 때는 숨어 있고 `kit.moveAlong`, `kit.show` 로 보임                                                                                                                           | `x(0) y(0) size(26) color(W.blue)`                       |

- progBox tone: `dark` 흰 배경과 `W.text` 테두리, `side` `W.blue50` 배경과 `W.blue` 테두리, `plain` 흰 배경과 `W.strong` 테두리, `off` `W.muted` 배경과 `W.n300` 점선, 글자 `W.subtle`(응답 없음 상태).
- sidecarBox 의 막대는 tone 의 테두리 색, 바퀴는 `W.text`(off 는 `W.n300`)입니다.

### 그림 카드 (이미지 생성 도구로 만든 그림)

| 함수               | 모양                                                                                                                                                                                                                                                                                                                                                                                                                  | 주요 인자(기본값)                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `kit.img(root, o)` | `assets/` 의 그림을 흰 카드(`W.white` 배경, 테두리 2px `W.line`, 모서리 `radius`, 안쪽 여백 `pad`) 위에 놓음. `w, h` 는 카드 전체 크기이고 그림은 카드 안에서 비율을 유지해(object-fit: contain) 가운데에 둠. `card` 가 false 면 카드 없이 그림만(여백 0). `el.image` 는 img 요소. `el.at(fx, fy)` 는 그림 안 비율 좌표(0~1)를 무대 좌표 `[x, y]` 로 돌려줌(`kit.pose` 로 움직이기 전 자리 기준, measure 안에서 부름) | `x y w h src card(true) pad(24) radius(20)` |
| `kit.imgReady()`   | `kit.img` 로 만든 그림을 모두 불러오고 decode 하면 끝나는 약속(Promise). 못 불러오면 콘솔 오류를 남기고 실패                                                                                                                                                                                                                                                                                                          | 없음                                        |

- `src` 는 `index.html` 기준 상대 경로(예 `assets/example.png`)입니다. kit 이 스크립트와 같은 `ASSET_V` 를 `?v=` 로 붙입니다.
- `index.html` 의 `window.ready` 가 `kit.uiReady()` 와 함께 `kit.imgReady()` 를 기다린 뒤 `measure` 와 첫 그리기를 합니다. 그래서 `kit.img` 는 `build` 안에서만 부릅니다.
- `kit.pose(el, { dx, dy, s })` 로 움직인 뒤의 점은 `c = kit.center(el)`, `q = el.at(fx, fy)` 일 때 `[c[0] + (q[0] - c[0]) * s + dx, c[1] + (q[1] - c[1]) * s + dy]` 입니다(pose 는 가운데 기준 확대).

### UI 조각 (ui.css 로 그림)

| 함수                     | 모양                                                                                                                                                                                                                            | 주요 인자(기본값)                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `kit.uiAsk(root, o)`     | 질문 입력 `mx-Field mx-TextInput`(sm 40)과 `mx-Button`(solid primary sm), `el.setText(text)` 는 값이 바뀔 때만 입력된 질문을 바꿈 | `x y w(760, 무대 px) s(1.8) text send('보내기')` |
| `kit.uiAnswer(root, o)`  | 답변 카드 `mx-Card`, `mx-Card__title`, 본문 자리 `mx-Skeleton` 막대 3개, 근거 배지 `mx-Badge` | `x y w(760) s(1.8) title badges(글 또는 { text, tone }, tone 기본 'info')` |
| `kit.uiStepRow(root, o)` | 단계 한 행 `mx-Card`(가로 배치)에 상태 표시, 제목(`mx-Card__title`), `warn` 이면 오른쪽 `mx-Badge`(negative, xs), `el.setState(state)` 는 값이 바뀔 때만 마크업을 다시 넣음(지금 값은 `el.state`) | `x y w(960) s(1.8) title state('wait'\|'done'\|'warn') warnText(kit.WARN_TEXT)` |
| `kit.uiBadge(root, o)`   | `mx-Badge`(subtle) 하나 | `x y s(1.8) text tone('info')` |

- 배율 `s` 기본 1.8 은 가장 작은 글자(12px)가 무대 21.6px 가 되는 값입니다.
- `tone` 은 배지의 `data-color` 값 `primary`, `secondary`, `positive`, `cautionary`, `negative`, `info` 입니다. 파랑 조각에는 `info`, 노랑 조각에는 `cautionary` 를 쓰면 조각 카드 색과 맞습니다.
- 네 부품 모두 `el.fit()` 이 있습니다. measure 안에서 부른 뒤 `el._b` 를 씁니다. `uiAsk`, `uiAnswer`, `uiStepRow` 는 폭을 `w` 로 두고 그 폭에서 높이를 재고, `uiBadge` 는 `el.natural()` 로 폭과 높이를 텍스트에 맞춥니다.
- `uiStepRow` 상태 표시: `wait` 는 회색 점(span 에 `--mx-strong` 색), `done` 과 `warn` 은 체크 아이콘(`--mx-success` 색)입니다.
- `kit.WARN_TEXT` 는 단계 행 경고 배지의 기본 문구 "확인이 필요합니다" 입니다. `warnText` 로 바꿉니다.

## kit.ui

```js
const el = kit.ui(root, { x, y, w, h, s: 1, html });
```

- 무대 좌표 `(x, y)` 에 마크업 `html` 을 `ui.css` 로 그린 요소를 만듭니다.
- `w, h` 는 확대 전 실제 크기(px), `s` 는 확대 배율(왼쪽 위 기준, 생략하면 1)입니다. `el._b = { x, y, w: w*s, h: h*s }` 입니다.
- 돌려준 요소는 다른 부품처럼 `kit.pose`, `kit.moveAlong`, `kit.show` 로 움직입니다.
- `el.setHtml(html)` 로 마크업을 바꿉니다.

| 추가 값           | 내용                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `el.inner`        | 마크업을 담은 요소(shadow root 안, `scale(s)` 적용)                         |
| `el.s`            | 확대 배율                                                                   |
| `el.resize(w, h)` | 확대 전 크기를 바꿈(돌기가 있으면 다시 놓음)                                |
| `el.moveTo(x, y)` | 자리를 바꿈                                                                 |
| `el.natural()`    | 마크업의 확대 전 내용 크기 `{w, h}`(measure 안에서만, 숨은 장면에서도 동작) |

**구현**

- 요소 안에 shadow root 를 만들고 `link rel=stylesheet` 로 `ui.css` 를 불러온 뒤 마크업을 넣습니다. 무대의 `#stage div` 규칙이 마크업에 들어가지 않게 하기 위해서입니다.
- CSS 주소는 `index.html` 기준 상대 경로 `ui.css` 입니다. `ui.css` 는 `index.html` 과 같은 폴더에 둡니다.
- 색과 글꼴은 `ui.css` 맨 위 `:host` 의 `--mx-*` 변수 한 곳에 있습니다. `kit.W` 와 같은 값이므로 바꿀 때 둘을 함께 바꿉니다.
- 상태 전환(transition)과 애니메이션은 shadow root 안에서 끕니다.
- `el` 에 직접 붙인 자식(돌기, 테두리, 막대)은 slot 으로 마크업 위에 보입니다. 좌표는 `el` 왼쪽 위 기준이고 `s` 배로 확대되지 않습니다.

**불러오기 완료**

- kit 은 CSS 불러오기 완료 약속(Promise)을 모아 둡니다. `kit.uiReady()` 는 CSS 를 다 불러오고 마크업이 쓰는 Pretendard 글꼴(400, 500, 600, 700)을 불러오면 끝납니다.
- `index.html` 의 `window.ready` 가 `kit.uiReady()` 를 기다린 뒤 `measure` 와 첫 그리기를 합니다. CSS 를 못 불러오면 `window.ready` 가 실패해 확인 도구가 멈춥니다(스타일 없는 프레임을 저장하지 않게).
- `kit.ui` 는 `build` 안에서만 부릅니다. `build` 뒤에 만든 요소의 CSS 는 `window.ready` 가 기다리지 않습니다.

```js
// 버튼 하나(실제 크기)
kit.ui(root, {
  x: 100,
  y: 300,
  w: 120,
  h: 40,
  html: '<button class="mx-Button" type="button" data-style="solid" data-color="primary" data-size="sm" style="width:100%">저장</button>',
});
// 배너(2.4 배, 폭은 measure 에서 el.fit())
const b = kit.banner(root, { cx: 960, y: 500, s: 2.4, tone: 'warning' });
```

## 움직임

| 함수                                                     | 하는 일                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `kit.show(el, o)`                                        | 불투명도(0 이면 `display:none`)                                                      |
| `kit.pose(el, {dx, dy, s, o})`                           | 만든 위치에서 `dx, dy` 만큼 이동하고 가운데 기준 `s` 배, 불투명도 `o`                |
| `kit.appear(el, p)`                                      | 나타남(`p` 0~1 에 따라 불투명도 0→1, 16px 위로 이동)                                 |
| `kit.center(el)`                                         | 만든 위치의 가운데 점 `[x, y]`                                                       |
| `kit.ctrl(a, b, dir, n)`                                 | 곡선 조절점(직선 경로 가운데에서 `dir` 방향으로 `2n` px, 가장 많이 휜 지점이 `n` px) |
| `kit.curve(p, a, b, c)`                                  | 2차 베지어 위 점(`c` 가 없으면 직선)                                                 |
| `kit.moveAlong(el, p, from, to, c, {s, o})`              | `el` 의 가운데를 `from` 에서 `to` 로 감속 곡선 이동                                  |
| `kit.borderTo(el, p)`                                    | 선 바꾸기(처음 선이 `1 - p`, 바뀔 선이 `p` 불투명도)                                 |
| `kit.ease(p)`, `kit.ioC(p)`, `kit.oC(p)`                 | 감속 곡선                                                                            |
| `kit.lerp`, `kit.clamp`, `kit.seg`, `kit.mixColor`       | 수와 색 계산                                                                         |
| `kit.slide(t, st)`, `kit.swap(ctx, id, outView, inView)` | 전환 슬라이드 값, 장면 안 구도 교체                                                  |
| `kit.baselineOf(el)`, `kit.alignBaseline(ref, el)`       | 기준선 맞춤(measure 안에서만)                                                        |

## 강조 테두리 (ring)

- `rings: [{ step, rect() }]` 에 ring 단계 id 와 대상 사각형(무대 좌표)을 적으면 틀이 파랑 3px, 모서리 14, 대상보다 8px 바깥에 테두리를 그립니다.
- 나타남, 유지, 사라짐 시간은 단계 표의 `ex` 값입니다.

## 틀이 맡는 것

- 장면 사이 슬라이드: 장면 n 은 자기 첫 trans 단계에서 들어오고 다음 장면의 trans 단계에서 나갑니다. 단계 표에 `loop` 단계가 있으면 마지막 장면이 그 단계에서 나가고 장면 1 이 첫 화면으로 다시 들어옵니다.
- 칩: `motion-steps.js` 의 `CAPTIONS` 와 칩 시간이 정합니다.
- 발표 모드: 기본 보기(`?box=1`, `?export=1`, `?embed=1` 이 아닐 때)는 클릭으로 넘깁니다.
  - 정지는 읽는 멈춤마다 있습니다. 종류가 `hold` 인 단계는 [시작, 끝], 종류가 `ring` 인 단계는 테두리가 다 나타난 뒤 유지 구간입니다. 단계 표에서 계산하므로 시간이 바뀌어도 따라갑니다.
  - 다음(무대 클릭, 오른쪽 화살표, Space, Enter): 정지 안이면 그 정지 끝으로 이동해 다음 움직임을 재생하고, 움직임 중이면 다음 정지 시작으로 이동합니다. 마지막 정지에서는 끝 화면(`#endCover`, '끝' 한 글자)을 켭니다. 끝 화면에서 또 눌러도 그대로이고, 이전을 누르면 끝 화면만 걷혀 마지막 컷으로 돌아옵니다. `window.seek` 로 다른 시각에 가면 끝 화면은 풀립니다.
  - 이전(왼쪽 아래 [이전] 버튼, 왼쪽 화살표): 바로 앞 정지 시작으로 이동합니다.
  - 자동 전환은 오른쪽 아래 체크박스를 켰을 때만 동작합니다. `?auto=1` 이면 켠 채로 엽니다.
  - `?box=1` 과 `?export=1` 은 정지 없이 재생합니다. 세 보기 모두 [이전] 버튼, 자동 전환, 진행 숫자(`1 / 6` 같은 현재 컷과 전체 컷), 끝 화면을 숨깁니다.

## 확인 도구

서버는 모션 폴더에서 `127.0.0.1` 로 띄웁니다. `ui.css` 가 `index.html` 과 같은 폴더에 있으므로 서버 루트를 이 폴더로 잡으면 `BASE_PATH` 는 필요 없습니다.

```bash
python3 -m http.server 8993 --bind 127.0.0.1 --directory <모션 폴더>
cd <모션 폴더>
PORT=8993 node tools/check.mjs --steps
PORT=8993 node tools/check.mjs --times 2.7,6.7 --out /tmp/motion-qa
```

| 환경 값     | 내용                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PORT`      | 서버 포트(기본 8933)                                                                                                       |
| `BASE_PATH` | 서버 루트에서 `index.html` 이 있는 폴더까지 경로(기본 빈 문자열). 주소는 `http://127.0.0.1:${PORT}${BASE_PATH}/index.html` |
| `PW_ROOT`   | `node_modules/playwright` 가 있는 폴더(기본은 파일 위치에서 위로 올라가며 찾음)                                          |

| 옵션            | 결과                                                                    |
| --------------- | ----------------------------------------------------------------------- |
| `--times 0,3.2` | 시각(실제 초)마다 `f_<초>.png`(1920x1080) 저장                          |
| `--out <폴더>`  | 저장 폴더(결과 JSON 도 `check.json` 으로 저장)                          |
| `--box`         | `?box=1` 화면(1024x576)을 `b_<초>.png` 로 저장                          |
| `--seam`        | 0초와 마지막 프레임의 픽셀 최대 차이(픽셀 배율 2, 내보내기와 같은 조건)   |
| `--steps`       | 단계마다 id, 장면, 종류, 시작과 끝(실제 초)                             |

- 늘 출력하는 값: 콘솔 오류, 페이지 오류, `DURATION`, 칩마다 폭과 넘침 여부(그 장면의 첫 hold 단계 시작 0.5초 뒤에 측정).
- `motion-params.json` 404 콘솔 오류 1건은 정상입니다(값 파일이 없어 기본값을 씁니다). `--box` 를 주면 1건이 더 나옵니다.
- 마지막 행은 결과 JSON 한 덩어리입니다.
- 저장한 PNG 는 직접 열어 위치, 텍스트, 넘침, 겹침을 확인합니다. 화면 조각이 스타일 없는 텍스트로 보이면 `ui.css` 를 못 불러온 것입니다(서버 루트와 `BASE_PATH` 확인).
- `export.mjs`(mp4 내보내기)는 위 표의 `PORT`, `BASE_PATH`, `PW_ROOT` 를 같은 뜻으로 받습니다. 첫 인자는 화질 값 crf(기본 16)이고, mp4 는 이 폴더에 저장합니다. `NAME` 은 파일 이름 앞부분(기본은 폴더 이름), `LIMIT` 은 앞에서부터 그릴 프레임 수(테스트용)입니다.
- `baseline.mjs`(기준 프레임 찍기)는 출력 폴더와 포트를 인자로 받습니다(포트 기본 8947). `PORT` 환경 값은 읽지 않습니다. `BASE_PATH`, `PW_ROOT` 는 환경 값으로 받습니다.

```bash
PORT=8993 node export.mjs 16
node baseline.mjs /tmp/motion-base 8993
```
