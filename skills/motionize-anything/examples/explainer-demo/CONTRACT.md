# 장면 파일 계약 (설명 모션 엔진)

장면 파일(`scenes/s<n>.js`)을 만드는 개발자와 에이전트가 읽는 문서입니다. 참고 구현은 이 폴더의 `scenes/s1.js`, `scenes/s2.js` 입니다.
좌표, 화면 문장, 시간의 기준은 각 장면 파일 위쪽의 `TEXT` 와 `motion-steps.js` 입니다.
장면 수와 정지 수는 [motion-steps.js](motion-steps.js)의 단계 표에 있습니다.

## 고치면 안 되는 파일

| 파일                                                           | 이유                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `index.html`                                                   | 틀(장면 컨테이너, 장면 사이 슬라이드, 칩, 처음으로 돌아가기, 강조 테두리, 발표 모드) |
| `motion-steps.js`                                              | 단계 표와 시간 계산(단계 길이는 이 파일의 단계 표에서만 바꿈)                        |
| `scenes/kit.js`, `ui.css`                                      | 공용 부품과 daisyUI 테마 파일(부품이 모자라면 kit 에 추가하고 이 문서 부품 표에 같이 적음) |
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
      /* 선택. 글꼴과 daisyUI CSS, ui.css 를 불러온 뒤. 텍스트 폭에 따라 정하는 자리 */ ready = true;
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
| `measure(kit)`     | `kit`                                                                                                                | 선택 사항입니다. 글꼴과 daisyUI CSS, `ui.css` 를 다 불러온 뒤 무대 배율 1 에서 불립니다(페이지를 열 때 2번). 텍스트 폭에 따라 정하는 자리만 여기서 정합니다 |
| `render(ctx)`      | `ctx.t`: 기준 초, `ctx.T`: 단계 id 별 `{s, e, v}`(기준 초, `v` 는 단계 값), `ctx.kit`: 공용 도구, `ctx.n`: 장면 번호 | 장면이 보이는 동안 프레임마다 불립니다                                                                                                        |
| `rings`            | `[{ step, rect() }]`                                                                                                 | 강조 테두리 대상(`step` 은 ring 단계 id, `rect()` 는 무대 좌표 `{x, y, w, h}`)                                                                |

**measure**

- `measure` 가 불릴 때 숨은 장면의 컨테이너는 `display:none` 이라 그 안 요소의 `offsetWidth` 와 `getBoundingClientRect` 가 0 입니다.
- 그래서 `kit.ui` 요소 안 마크업의 크기는 `el.natural()` 로 잽니다. 숨은 장면에서도 동작합니다.
- `measure` 가 자리를 정하기 전에는 `render` 가 아무것도 그리지 않게 `ready` 값으로 막습니다.

## render 규칙

- 속도가 1.0 이라 기준 초와 실제 초가 같습니다.
- 장면 컨테이너의 슬라이드와 불투명도는 틀이 정합니다. 장면 파일은 컨테이너 안쪽만 그립니다.
- 컨테이너가 보이지 않는 동안(불투명도 0)에는 `render` 가 불리지 않습니다. 그래서 `render` 는 앞 프레임 값을 쓰지 않습니다.
- `render` 는 그 `t` 에서 움직이는 요소마다 위치, 불투명도, 선, 텍스트를 모두 다시 정합니다. 같은 `t` 면 언제나 같은 그림이어야 합니다.
- CSS 애니메이션, CSS transition, `Math.random`, `Date`, `performance.now` 를 쓰지 않습니다. `kit.ui` 요소(`.kw`) 안의 애니메이션과 transition 은 `ui.css` 의 배치용 규칙이 끕니다(daisyUI `skeleton` 의 반짝임 등).
- 화면 문장은 `TEXT` 에만 두고 `textContent` 로 넣습니다. `kit.ui` 마크업에 넣는 텍스트는 `kit` 부품이 HTML 특수 문자를 바꿔 넣습니다.

## 좌표와 겹침 순서

- 모든 좌표는 무대 좌표 px 입니다(1920x1080, 왼쪽 위 0,0).
- 장면 요소는 칩 영역 아래(y 90~1080)에만 둡니다.
- `#stage` 안의 `div` 는 모두 `position:absolute` 입니다(`index.html` 의 배치용 규칙). 부품 함수가 `left`, `top` 을 정합니다. `kit.ui` 요소 안쪽(`.kw`)의 daisyUI 마크업은 이 규칙에서 빠집니다.
- 겹침 순서는 만든 순서입니다. 나중에 만든 요소가 위에 보입니다. 이동해서 다른 요소 위를 지나가는 요소는 나중에 만듭니다.
- `root` 에 다른 부품 요소(예: `tile`, `brick`)를 넘기면 그 요소 안에 만들어지고, `x, y` 는 그 요소의 왼쪽 위 기준입니다. 그 요소를 `pose` 나 `moveAlong` 으로 이동하거나 줄이면 안의 요소도 같이 이동하고 줄어듭니다.
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


## 스타일 규칙

- 모든 화면 요소는 daisyUI 5 컴포넌트 클래스(`alert`, `badge`, `btn`, `card`, `stat`, `steps`, `mockup-window`, `mockup-code`, `skeleton` 등)로 그립니다. 직접 만든 CSS 는 없습니다.
- 색은 `ui.css` 의 daisyUI 테마(`data-theme="motionize"`) 한 곳에서만 정합니다. 장면 파일, kit, index.html 에 hex 나 rgb 색 값을 쓰지 않습니다. 색은 daisyUI 색 클래스(`text-success`, `bg-base-100`, `alert-info` 등)나 `var(--color-*)` 로 씁니다.
- 테두리, 모서리, 그림자, 글자 크기는 컴포넌트가 정합니다. 글자 크기와 모서리를 키우려면 확대 배율(`s`)을 씁니다. 배율을 키우면 모서리와 테두리 두께도 같이 커집니다.
- 장면 파일과 kit 이 직접 정하는 것은 위치와 크기(`left`, `top`, `width`, `height`), 확대 배율, 움직임(`transform`, `opacity`, `display`)과 컴포넌트 안 배치(`flex`, `gap`)뿐입니다.
- 초점 색은 `blue`(흐름과 단위), `green`(마침과 반영), `yellow`(남음과 주의) 셋이고 값은 테마의 `--color-focus-<이름>-bg`(채움), `--color-focus-<이름>`(테두리), `--color-focus-<이름>-text`(채움 밖 글자), `--color-mark-<이름>`(자막 하이라이트)입니다. `kit` 부품이 이 변수를 daisyUI 컴포넌트 변수(`--alert-color`, `--alert-border-color`, `--badge-color`, `--step-bg`)에 연결합니다.
- 의미 색 `info`, `success`, `warning`, `error` 는 배너, 배지 같은 UI 조각이 daisyUI 색 클래스로 씁니다. 초점 색과 섞어 쓰지 않습니다.
- 초점이 아닌 것은 `kit.DIM`(불투명도 0.45)로 내리거나 흰 바탕 윤곽(`base: true`)으로 둡니다.

## kit 값

| 이름              | 내용                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kit.DIM`         | 초점이 아닌 것의 불투명도 0.45                                                                                                                        |
| `kit.SENT`        | 문장 자리: 무대 아래 가운데 한 자리(위 끝 `y 920`, `s 2.5`(글자 40px), 최대 폭 `max 1640`). 1~3번 문장이 같은 자리이고 가로는 `fitSentence` 가 가운데에 맞춥니다. 장면마다 `#scene<n>{--fig-dy}`(그림만 옮기는 값)는 0 |
| `kit.FOCUS`, `kit.textAttr(tone, extra, cls)` | 초점 색 이름 목록, 글자 색 속성(` class="…" style="…"` 문자열)을 만드는 도우미. 마크업을 직접 쓸 때 초점 글자색에 씀 |
| `kit.TONES`       | 배너 tone 5가지(info, neutral, success, warning, error)와 그 아이콘 이름(info, check, warn)                                                          |
| `kit.BANNER_TEXT` | 예시 배너 문구                                                                                                                                        |

- 사물이나 비유를 그린 그림은 이미지 생성 도구(codex)로 만들어 `assets/` 에 두고 `kit.img` 로 놓습니다. 장면 파일이나 kit 에서 직접 그리지 않습니다.

## kit 부품

모든 부품은 `root` 에 요소를 만들어 돌려줍니다. `x, y` 를 받습니다. 만든 위치와 크기는 `el._b = {x, y, w, h}` 에 있습니다. 모든 부품은 `kit.ui` 요소 위에 만들어지고, `kit.pose`, `kit.moveAlong`, `kit.show` 로 움직입니다.

### 기본 부품

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.tile(root, o)` | 글이 가운데 든 사각형(daisyUI `alert alert-vertical`). 박스, 카드, 칸, 판단 상자, 테두리 강조에 씀. `tone` 이 초점 색(`blue`, `green`, `yellow`)이면 채움과 테두리가 테마의 초점 색이고 글자와 체크는 기본 글자색, 의미 색(`info` 등)이면 daisyUI 색 클래스. `variant` 는 없으면 채움, `outline`(테두리만, `base` 면 흰 채움), `dash`(점선 테두리). `base` 가 true 면 흰 바탕과 진한 테두리(`--color-strong`, 점선은 `--color-n300`). `muted` 는 보조 글자색. 색도 변형도 없으면 옅은 회색 바탕. `el.setTone(tone, variant)` 는 값이 바뀔 때만 마크업을 다시 넣음 | `x y w h size(28, 글자 무대 px) 또는 s, text sub icon iconSize(24) tone variant base` |
| `kit.text(root, o)` | 배경 없는 글 한 줄(굵게). `tone` 이 `neutral` 이면 보조 글자색, 초점 색이면 채움 밖 글자색(`--color-focus-<이름>-text`). `el.fit()` 은 measure 안에서 글 크기를 재고 `cx`, `cy` 로 가운데에 놓음 | `x y 또는 cx cy, size(28) text tone weight` |
| `kit.stat(root, o)` | 큰 숫자(daisyUI `stat`, `stat-value` 32px 굵게)와 작은 설명(`stat-title`). `el.fit()` 은 measure 안에서 `cx`, `cy` 가운데에 놓음 | `cx cy 또는 x y, s(7.5) value title tone` |
| `kit.skeleton(root, o)` | 옅은 회색 막대나 칸(daisyUI `skeleton`, 반짝임은 끔) | `x y w h s(1)` |
| `kit.group(root, o)`, `kit.view(root)` | 같이 움직이는 요소를 담는 빈 요소, 구도 컨테이너(1920x1080, 장면 안 구도 교체에 씀) | `x y w h` |
| `kit.sentence(root, text, line, marks)` | 아래 자막 한 줄(`line` 1~3 은 같은 자리). `marks` 는 `[부분 문자열, 'blue' 또는 'green' 또는 'yellow']` 목록이고 앞에서부터 찾아 daisyUI `badge`(채움은 `--color-mark-*`)로 하이라이트함(컷마다 1~2곳). `el.text` 는 원문 그대로 | `marks([])` |
| `kit.captions(ctx, s1, id1, s2, id2, s3, id3)` | 자막 교체. 첫 문장 `s1` 이 나타나고, 다음 컷 움직임이 시작되면 DIM 까지 흐려진 뒤, 다음 문장 단계에서 위로 12px 움직이며 0~150ms 에 사라지고 150~300ms 에 다음 문장이 같은 자리에 나타남. `s2`, `s3` 는 없어도 됨. `render` 에서 매 프레임 부름. `id` 는 `s<n>_sentence<k>` 이고 같은 번호의 `s<n>_read<k>` 단계가 필요함 | `ctx, s1, id1, s2, id2, s3, id3` |
| `kit.fitSentence(el, max, min)` | 문장이 한 행(`max` px, 기본 1640)에 들어가도록 배율을 `min`(기본 문장 배율의 80%)까지 줄이고 가로 가운데에 놓음(measure 안에서만) | |

### 선과 코드

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.arrow(root, o)` | 직선 화살표(SVG). `el.draw(p)` 로 0~1 만큼 자람. 색은 `text-*` 클래스(currentColor)이고 초점 색 `blue` 등은 테두리색 | `x1 y1 x2 y2 tone(info) width(3) head(14)` |
| `kit.poly(root, o)` | 꺾은선 화살표(`el.draw(p)`, `el.setPoints(점 목록)`, `head` 0 이면 화살촉 없음) | `points tone width head` |
| `kit.code(root, o)` | 코드 블록(daisyUI `mockup-code`). `lines` 는 글 또는 `{ text, hl: true }`, 글은 `textContent` 로만 넣음. `el.fit()` 은 measure 안에서 높이를 잼 | `x y w s(1.5) lines` |

### 레고 블록, 화면 판, 이름 태그, 아이콘

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.brick(root, o)` | 레고 블록: `tile` 위에 돌기(daisyUI `badge`)를 같은 간격으로 놓음(`el.resize(w, h)` 를 쓰면 돌기를 다시 놓음) | `x y w h tone variant text size(26) k(1)` |
| `kit.studs(el, o)` | `el` 윗면에 돌기를 같은 간격으로 놓음(폭이 바뀌면 `el.layoutStuds()`) | `tone k(1)` |
| `kit.plate(root, o)` | 화면 판(daisyUI `mockup-window`)과 위쪽 화면 이름(`el.setRect(x, y, w, h, k)`) | `x y w h title s(2)` |
| `kit.nameTag(root, o)` | 한글 이름과 작은 영문 이름이 든 이름 태그(daisyUI `badge badge-outline`, `el.put(기준 x, y)` 로 놓음, measure 안에서 다시 put) | `text en tone('gray'|'blue') size(28) anchor('c'|'l'|'r')` |
| `kit.icon(name, size)`, `kit.iconSvg(tone, size)` | 아이콘 SVG 문자열(`info`, `check`, `tick`, `warn`, `display:block`). 색은 부모의 `text-*` 색(currentColor)이고, 원 안 기호는 바탕색입니다. `tick` 은 원 없이 체크 선만 그림 | |

### UI 부품 (daisyUI)

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.ui(root, o)` | 마크업을 daisyUI 로 그린 요소(아래 kit.ui 절) | `x y w h s(1) html` |
| `kit.banner(root, o)` | `alert alert-soft`(색은 `alert-info`, `alert-success`, `alert-warning`, `alert-error`, `neutral` 은 색 클래스 없음)에 아이콘과 문구 `span` 을 `s` 배로 확대(`el.fit()` 은 measure 안에서 폭과 높이를 텍스트에 맞춤) | `x y` 또는 `cx y`, `s(2.4) tone('warning') text strong w(무대 px)` |
| `kit.bannerBlock(root, o)` | `banner` 위에 돌기 | `banner` 인자와 `k` |
| `kit.miniBanner(root, o)` | 문구 없는 `bannerBlock` 위에 문구 대신 막대(`el.bar`, `skeleton`) | `x y w(무대 px) s(1) k` |
| `kit.buttonBlock(root, o)` | `btn`(`btn-primary` 또는 `btn-secondary`, 높이 40)을 높이 `h` 에 맞춰 확대하고 돌기를 얹음(primary 는 저장, secondary 는 취소, `text` 가 null 이면 문구 없는 버튼) | `x y w h(무대 px) text variant('primary'|'secondary') k` |
| `kit.radioBlock(root, o)` | 블록 몸통 안에 `radio` 3개(1.5 배)와 막대(`skeleton`) 3개(첫 번째가 선택 상태, `radio-primary`) | `x y w h` |
| `kit.inputBlock(root, o)` | 블록 몸통 안에 `textarea` 와 막대 2개 | `x y w h` |

### 도식 부품 (프로그램 박스, 조각 카드, 문서 묶음, 점)

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.progBox(root, o)` | 제목(큰 글)과 작은 글이 가운데 든 프로그램 박스(daisyUI `alert`). `el.setTone(tone)` 은 값이 바뀔 때만 마크업을 다시 넣어 render 에서 매 프레임 불러도 됨(지금 값은 `el.tone`) | `x y w h title sub tone('dark'|'side'|'plain'|'off') s(2)` |
| `kit.sidecarBox(root, o)` | `progBox` 왼쪽 변에 연결 막대 2개(`el.links`, `skeleton`)와 아래 변 가운데 바퀴 1개(`el.wheel`, `status`)를 붙임(`el._b` 는 박스 본체 기준) | `progBox` 인자, `tone('side')` |
| `kit.chunkCard(root, o)` | 글자 없는 조각 카드(daisyUI `card`, 위쪽 색 띠 `badge`, 회색 막대 `skeleton` 2개) | `x y w(132) h(88) kind('blue'|'amber')`, amber 는 테마의 `--color-amber` |
| `kit.docStack(root, o)` | 종이 3장(`el.papers`, 12px 씩 오른쪽 위로 어긋남)이 겹친 문서 묶음, 맨 앞 종이에 색 띠와 막대 5개, 제목(`el.t`)과 작은 글(`el.st`)은 묶음 아래 가운데(아래로 약 90px 차지, `el._b` 는 종이 부분 기준) | `x y w(220) h(270) title sub kind('blue')` |
| `kit.packet(root, o)` | 요청과 응답을 나타내는 원(daisyUI `status`), 만들 때는 숨어 있고 `kit.moveAlong`, `kit.show` 로 보임 | `x(0) y(0) size(26) tone(info)` |

- `progBox` tone: `dark`, `plain` 흰 바탕과 옅은 테두리, `side` 옅은 파랑(`alert-soft alert-info`), `off` 점선(`alert-dash`, 응답 없음 상태)입니다.

### 그림 카드 (이미지 생성 도구로 만든 그림)

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.img(root, o)` | `assets/` 의 그림을 흰 카드(daisyUI `card`, 안쪽 여백 `pad`) 위에 놓음. `w, h` 는 카드 전체 크기이고 그림은 카드 안에서 비율을 유지해(object-fit: contain) 가운데에 둠. `card` 가 false 면 카드 없이 그림만(여백 0). `el.image` 는 img 요소. `el.at(fx, fy)` 는 그림 안 비율 좌표(0~1)를 무대 좌표 `[x, y]` 로 돌려줌(`kit.pose` 로 움직이기 전 자리 기준, measure 안에서 부름) | `x y w h src card(true) pad(24)` |
| `kit.imgReady()` | `kit.img` 로 만든 그림을 모두 불러오고 decode 하면 끝나는 약속(Promise). 못 불러오면 콘솔 오류를 남기고 실패 | 없음 |

- `src` 는 `index.html` 기준 상대 경로(예 `assets/example.png`)입니다. kit 이 스크립트와 같은 `ASSET_V` 를 `?v=` 로 붙입니다.
- `index.html` 의 `window.ready` 가 `kit.uiReady()` 와 함께 `kit.imgReady()` 를 기다린 뒤 `measure` 와 첫 그리기를 합니다. 그래서 `kit.img` 는 `build` 안에서만 부릅니다.
- `kit.pose(el, { dx, dy, s })` 로 움직인 뒤의 점은 `c = kit.center(el)`, `q = el.at(fx, fy)` 일 때 `[c[0] + (q[0] - c[0]) * s + dx, c[1] + (q[1] - c[1]) * s + dy]` 입니다(pose 는 가운데 기준 확대).

### UI 조각 (daisyUI)

| 함수 | 모양 | 주요 인자(기본값) |
| ---- | ---- | ----------------- |
| `kit.uiAsk(root, o)` | 질문 입력 `input` 과 `btn btn-primary`, `el.setText(text)` 는 값이 바뀔 때만 입력된 질문을 바꿈 | `x y w(760, 무대 px) s(1.8) text send('보내기')` |
| `kit.uiAnswer(root, o)` | 답변 카드 `card card-border`(`card-body`, `card-title`), 본문 자리 `skeleton` 막대 3개, 근거 배지 `badge` | `x y w(760) s(1.8) title badges(글 또는 { text, tone }, tone 기본 'info')` |
| `kit.uiStepRow(root, o)` | 단계 한 행 `card card-border`(가로 배치)에 상태 표시, 제목(`card-title`), `warn` 이면 오른쪽 `badge`(negative, `badge-sm`), `el.setState(state)` 는 값이 바뀔 때만 마크업을 다시 넣음(지금 값은 `el.state`) | `x y w(960) s(1.8) title state('wait'|'done'|'warn') warnText(kit.WARN_TEXT)` |
| `kit.uiBadge(root, o)` | `badge`(옅은 배경 `badge-soft`) 하나 | `x y s(1.8) text tone('info')` |

- 배율 `s` 기본 1.8 은 가장 작은 글자(12px)가 무대 21.6px 가 되는 값입니다.
- `tone` 은 `primary`(`badge-primary`), `secondary`(`badge-soft badge-neutral`), `positive`(`badge-success`), `cautionary`(`badge-warning`), `negative`(`badge-error`), `info`(`badge-info`) 입니다. `positive` 부터 `info` 까지는 `badge-soft` 와 함께 씁니다. 파랑 조각에는 `info`, 노랑 조각에는 `cautionary` 를 씁니다.
- 네 부품 모두 `el.fit()` 이 있습니다. measure 안에서 부른 뒤 `el._b` 를 씁니다. `uiAsk`, `uiAnswer`, `uiStepRow` 는 폭을 `w` 로 두고 그 폭에서 높이를 재고, `uiBadge` 는 `el.natural()` 로 폭과 높이를 텍스트에 맞춥니다.
- `uiStepRow` 상태 표시: `wait` 는 회색 점(daisyUI `status`), `done` 과 `warn` 은 체크 아이콘(`text-success`)입니다.
- `kit.WARN_TEXT` 는 단계 행 경고 배지의 기본 문구 "확인이 필요합니다" 입니다. `warnText` 로 바꿉니다.

## kit.ui

```js
const el = kit.ui(root, { x, y, w, h, s: 1, html });
```

- 무대 좌표 `(x, y)` 에 마크업 `html` 을 daisyUI 클래스로 그린 요소를 만듭니다.
- `w, h` 는 확대 전 실제 크기(px), `s` 는 확대 배율(왼쪽 위 기준, 생략하면 1)입니다. `el._b = { x, y, w: w*s, h: h*s }` 입니다.
- 돌려준 요소는 다른 부품처럼 `kit.pose`, `kit.moveAlong`, `kit.show` 로 움직입니다.
- `el.setHtml(html)` 로 마크업을 바꿉니다.

| 추가 값 | 내용 |
| ------- | ---- |
| `el.inner` | 마크업을 담은 요소(`.kw`, `scale(s)` 적용) |
| `el.s` | 확대 배율 |
| `el.resize(w, h)` | 확대 전 크기를 바꿈(돌기가 있으면 다시 놓음) |
| `el.setScale(s)` | 확대 배율을 바꿈 |
| `el.moveTo(x, y)` | 자리를 바꿈 |
| `el.natural()` | 마크업의 확대 전 내용 크기 `{w, h}`(measure 안에서만, 숨은 장면에서도 동작) |

**구현**

- `index.html` 의 `<head>` 가 daisyUI CSS 와 `ui.css` 를 이 순서로 불러오고 `<html data-theme="motionize">` 로 테마를 적용합니다. `kit.ui` 요소는 일반 DOM 이고 마크업은 요소 안 `.kw` 에 들어갑니다.
- 무대의 `#stage div` 규칙(모두 `position:absolute`)은 `.kw` 안쪽에 적용되지 않게 `#stage div:not(.kw *)` 로 씁니다.
- daisyUI CSS 는 버전을 고정한 CDN 주소(`https://cdn.jsdelivr.net/npm/daisyui@5.8.2/daisyui.css`)입니다. 불러오려면 네트워크가 필요하고, 확인 도구와 mp4 내보내기도 같습니다.
- `ui.css` 는 `index.html` 기준 상대 경로이고 `index.html` 과 같은 폴더에 둡니다. daisyUI 테마 `motionize` 한 개(색, 글꼴, 모서리, 크기 변수)와 배치용 규칙 두 개(상자 크기 계산, 애니메이션 끄기)만 들어 있습니다.
- 색을 바꾸려면 `ui.css` 테마의 `--color-*` 변수만 고칩니다. 네 폴더의 `ui.css` 는 내용이 같아야 합니다.
- 컴포넌트 크기는 daisyUI 기본값입니다(배너 높이 44, 버튼 40, 배지 24 등). 글자 크기와 모서리는 `s` 배로 커집니다.
- `el` 에 직접 붙인 자식(돌기, 다른 `kit.ui` 요소)은 마크업 위에 보입니다. 좌표는 `el` 왼쪽 위 기준이고 `s` 배로 확대되지 않습니다.

**불러오기 완료**

- `kit.uiReady()` 는 `<link rel=stylesheet>` 가 모두 불러와졌는지 확인하고(못 불러왔으면 실패) 마크업이 쓰는 Pretendard 글꼴(400, 500, 600, 700, 800)을 불러오면 끝납니다.
- `index.html` 의 `window.ready` 가 `kit.uiReady()` 를 기다린 뒤 `measure` 와 첫 그리기를 합니다. CSS 를 못 불러오면 `window.ready` 가 실패해 확인 도구가 멈춥니다(스타일 없는 프레임을 저장하지 않게).
- `kit.ui` 는 `build` 안에서만 부릅니다. `build` 뒤에 만든 요소의 글꼴은 `window.ready` 가 기다리지 않습니다.

```js
// 버튼 하나(실제 크기)
kit.ui(root, {
  x: 100,
  y: 300,
  w: 120,
  h: 40,
  html: '<button class="btn btn-primary" type="button" style="width:100%">저장</button>',
});
// 배너(2.4 배, 폭은 measure 에서 el.fit())
const b = kit.banner(root, { cx: 960, y: 500, s: 2.4, tone: 'warning' });
// 칸 하나(옅은 초록 칸에 체크)
const c = kit.tile(root, { x: 200, y: 600, w: 110, h: 110, tone: 'success', icon: 'tick' });
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
| `kit.ease(p)`, `kit.ioC(p)`, `kit.oC(p)`                 | 감속 곡선                                                                            |
| `kit.lerp`, `kit.clamp`, `kit.seg`                       | 수 계산                                                                              |
| `kit.slide(t, st)`, `kit.swap(ctx, id, outView, inView)` | 전환 슬라이드 값, 장면 안 구도 교체                                                  |

## 강조 테두리 (ring)

- `rings: [{ step, rect() }]` 에 ring 단계 id 와 대상 사각형(무대 좌표)을 적으면 틀이 초점 파랑 테두리색(`--color-focus-blue`) 3px, 모서리 14, 대상보다 8px 바깥에 테두리를 그립니다.
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
- 저장한 PNG 는 직접 열어 위치, 텍스트, 넘침, 겹침을 확인합니다. 화면 조각이 스타일 없는 텍스트로 보이면 `ui.css` 나 daisyUI CSS 를 못 불러온 것입니다(서버 루트, `BASE_PATH`, 네트워크 확인).
- `export.mjs`(mp4 내보내기)는 위 표의 `PORT`, `BASE_PATH`, `PW_ROOT` 를 같은 뜻으로 받습니다. 첫 인자는 화질 값 crf(기본 16)이고, mp4 는 이 폴더에 저장합니다. `NAME` 은 파일 이름 앞부분(기본은 폴더 이름), `LIMIT` 은 앞에서부터 그릴 프레임 수(테스트용)입니다.
- `baseline.mjs`(기준 프레임 찍기)는 출력 폴더와 포트를 인자로 받습니다(포트 기본 8947). `PORT` 환경 값은 읽지 않습니다. `BASE_PATH`, `PW_ROOT` 는 환경 값으로 받습니다.

```bash
PORT=8993 node export.mjs 16
node baseline.mjs /tmp/motion-base 8993
```
