# 캡처 (Aside)

영상에 쓰는 그림은 제품 화면을 Aside 브라우저로 찍은 페이지 상태 PNG뿐이다. HTML 로 그린 가짜 화면을 쓰는 모션이면 이 절차는 건너뛴다. 다른 브라우저 도구로 찍어도 PNG 와 `rects.json` 만 같은 모양이면 된다.
호버, 포커스, 입력 중, 눌린 상태는 찍지 않고 엔진에서 그린다.
도구는 `<스킬 폴더>/engine/usage/capture/` 에 있다. 새 모션 폴더로 복사해 쓴다(`reference/usage.md` 의 새 영상 폴더 만들기 절).

## 준비

- Aside 계정은 `u1` 을 쓴다(`run.sh` 가 `~/.aside/u/1/sessions` 를 본다. 다른 계정이면 `run.sh` 의 경로를 고친다). 처음이면 `aside guide`, `aside guide repl` 을 읽는다.
- 뷰포트는 1280×820 @2x 이다. 발표 모드의 앱 창이 1.0배(x 320~1600, y 240~1060)라 이 크기여야 칩과 설명 문장 자리가 남는다. PNG는 2560×1640 이고, 모든 사각형은 CSS px(그림 px ÷ 2)로 적는다. 원점은 그림 왼쪽 위다.
- 캡처 스크립트는 창 크기를 정하지 않는다(Aside 창 크기를 따른다). 찍기 전에 `innerWidth`, `innerHeight`, `devicePixelRatio` 가 1280, 820, 2 인지 확인한다.
- 복사한 도구는 1440×900 을 가정한다. 새 폴더에서 `merge_rects.py` 기본값(w 1440, h 900)을 1280, 820 으로, `stitch.py` 의 1800px 자르기를 1640 으로, `common.js` `tallShots` 의 900 을 820 으로 고친다.
- 아래 긴 그림 절의 숫자(800px 스크롤, 폭 1425)는 1440×900 뷰포트로 찍은 값이다. 1280×820 으로 찍으면 값이 달라진다.
- `aside repl` 안에서 `openTab(url)` 로 탭을 열고 전역 `page`(`page.evaluate`, `page.mouse.move`, `page.locator(...).click()`, `page.screenshot({ path })`)와 `sleep` 을 쓴다. 쓰는 모양은 아래 장면 스크립트 예를 따른다.
- 실행: `run.sh <장면>.js [출력 폴더]`
  - `common.js` 와 장면 스크립트를 이어 `aside repl` 로 실행한다.
  - 새로 생긴 `s<숫자>*.png` 를 출력 폴더(기본 pages 폴더)로 복사한다. 그림 이름은 `s2-home.png` 처럼 s와 숫자로 시작해야 한다.
  - 로그의 `RECT`, `STYLE`, `NOTE`, `SIZE` 줄을 `merge_rects.py` 로 rects.json 에 합친다.
  - 출력 폴더를 `/tmp/scratch` 로 주면 rects.json 에 합치지 않는다(시험용).
- Aside가 이미 로그인된 제품이면 로그인 화면은 `/login` 이 다른 쪽으로 넘어가 찍을 수 없다. 로컬 사본으로 찍는다(아래).

## common.js 도구

HELPERS 문자열은 페이지 안에서 평가되는 짧은 함수들이다.

| 이름 | 하는 일 |
|------|---------|
| `Q(sel)`, `QA(sel)` | querySelector, querySelectorAll(배열) |
| `T(sel, 글자, exact)` | 선택자에 맞는 요소 중 글자가 든(exact 면 같은) 첫 요소 |
| `up(el, n)` | 부모로 n칸 올라감 |
| `R(el, doc)` | 사각형 `{x, y, w, h}`. doc 이 true 면 스크롤 값을 더해 문서 좌표로 |
| `RCl(el, clip)` | clip 요소 안으로 자른 사각형. 잘렸으면 `unclipped`(원래 사각형)를 덧붙임 |

| 함수 | 하는 일 |
|------|---------|
| `measure(name, defs, doc=false)` | defs(이름 → 페이지에서 평가할 식)의 사각형을 `RECT <name> <json>` 으로 출력. 값이 배열이면 배열로 |
| `styleOf(name, defs)` | 실측 스타일을 `STYLE <name> <json>` 으로 출력. 식 뒤에 `\|::placeholder` 를 붙이면 의사 요소 |
| `neutral()` | 포커스 해제 + 마우스를 (1100, 27)로 옮기고 0.3초 기다림. 찍기 전에 부른다 |
| `waitFor(식, tries=40)` | 식이 참이 될 때까지 0.25초 간격으로 기다림 |
| `tallShots(name)` | 긴 그림용 조각 찍기(아래) |

- `styleOf` 가 읽는 값: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, color, backgroundColor, 테두리(위쪽 너비, 선, 색), borderRadius, padding 4방향, boxShadow, outline 4값, textDecorationLine, cursor. 의사 요소가 아니면 `rect` 도 넣는다.
- 이 도구에는 가명 처리, 금지어 검사, 개발용 UI 숨기기 함수가 없다. 화면에 민감한 글이 있는지는 PNG를 눈으로 확인한다.
- 이름에 공백을 쓰지 않는다(`merge_rects.py` 가 공백으로 줄을 나눈다).

## 호버, 포커스, 상태는 재고 찍지 않는다

- 포커스: `focus()` 한 뒤 `styleOf('s1-login:input-focus', ...)`, 그다음 `blur()`.
- 호버: 요소 가운데로 `page.mouse.move` 한 뒤 `styleOf('s1-login:button-hover', ...)`, 그다음 `neutral()`.
- 서버에 써야 보이는 상태(골랐음, 반영함 같은 것): 같은 클래스의 임시 요소를 화면에 만들어 `styleOf` 로 재고 지운다. 지웠는지 `NOTE` 줄로 남긴다.
- 잰 값은 `notes.md` 에 상태별로 적고, `index.html` 이 그 값으로 그린다.

## 긴 그림

문서가 900보다 긴 화면은 뷰포트 그림 한 장과 긴 그림 한 장을 찍는다.

1. `tallShots(name)`: 맨 위로 올리고 800px씩 스크롤하며 조각 `<name>__tNN.png` 를 찍는다. 끝까지(scrollY + 900 이 문서 높이 이상) 간다.
   - 둘째 조각부터 `common.js` 맨 위 `STICKY_HEADER` 가 가리키는 요소(기본 `header`)를 숨긴다(sticky 머리줄이 조각마다 반복되지 않게). 제품의 머리줄 선택자로 고친다.
   - 끝에 `SIZE <name> {w: clientWidth, h: 문서 높이, tiles: [{name, scrollY}]}` 를 출력한다.
2. `stitch.py <pages 폴더> <name> [머리줄 높이=76]`
   - 첫 조각은 그대로, 나머지는 위 머리줄 높이(CSS px)만큼 잘라 `scrollY + 머리줄` 자리에 붙인다. 조각 파일은 지운다.
   - 폭은 `clientWidth` 로 자른다. 뷰포트 스크롤 막대 15px 가 빠져 폭 1425 가 된다(그림은 2850).
   - 마지막 조각은 앞 조각과 겹칠 수 있다(예: scrollY 2400 다음 2448).
   - Pillow가 필요하다. 저장할 때 ICC 프로필이 빠진다(`reference/usage.md` 함정).
3. 확인: 긴 그림의 한 구간과 뷰포트 그림을 같은 좌표로 맞춰 픽셀 차이를 잰다. 차이가 평균 0.0, 최대 0 이어야 한다.

안쪽 스크롤 칸은 `RCl` 로 재고, 로드 때 저절로 가 있는 scrollLeft 같은 값을 `NOTE` 로 남긴다.

## rects.json 꼴

```json
{
  "<그림 이름>": { "w": 1440, "h": 900, "rects": { "<요소>": { "x": 0, "y": 0, "w": 0, "h": 0, "unclipped": {} } } },
  "<긴 그림 이름>": { "w": 1425, "h": 3347, "rects": {}, "tiles": [{ "name": "…__t00", "scrollY": 0 }] },
  "styles": { "<이름>": { "<요소>": { "fontSize": "13px", "color": "rgb(…)", "rect": {} } } },
  "_notes": { "<이름>": "JSON 또는 글" }
}
```

- 사각형은 찍은 순간의 스크롤 위치 그대로의 뷰포트 좌표다. `measure(..., true)` 만 문서 좌표다.
- `index.html` 은 rects.json 을 읽지 않는다. 필요한 값을 `R` 상수로 옮겨 적는다.

## pages/notes.md 에 적을 것

아래 항목을 적는다.

- 찍은 날, 주소, 계정, 뷰포트, 그림 목록(파일, 크기, 주소와 스크롤, 내용).
- 장면별 주의: 사각형 이름, 실측 스타일, 호버, 포커스 값, 클릭하면 주소와 스크롤이 어떻게 되는지.
- 상태별 변화(서버에 쓰는 동작이라 못 찍은 상태를 코드와 임시 요소 실측으로 정리한 것).
- 실제와 다른 점, 예외(로컬 사본, 실명이 그대로 있음 같은 것), 못 한 것.

## 로그인 화면

- 이미 로그인된 Aside는 `/login` 이 `/me` 로 넘어간다. 쿠키 없이 받은 로그인 HTML에서 `<script>` 를 모두 지우고 `<base href>` 를 서버 주소로 넣어 127.0.0.1 로컬 주소로 열었다.
- CSS, 글꼴, 로고는 실제 서버 것이다. 스크립트가 없어 입력은 안 되지만 그림에는 영향이 없다. 글꼴이 적용됐는지 눈으로 확인한다.
- 이런 사본은 notes.md "실제와 다른 점" 맨 앞에 적는다.

## 터미널 그림 (Claude Code 단계)

- 그림은 공식 저장소 README의 demo.gif 첫 프레임에서 입력 글을 배경색으로 지워 `cc-best.png` 를 만들고, Lanczos로 2배 키워 `cc-best@2x.png` 를 만들었다(새 정보는 없음).
- 고른 까닭: 환영 상자 + 빈 입력 줄 + 고정폭 글꼴 + 대화 없음 + 어두운 단일 테마. 입력 줄 좌표와 색 실측은 `<스킬 폴더>/engine/usage/pages/cc/SOURCES.md` 에 있다.
- 새 영상은 `<스킬 폴더>/engine/usage/pages/cc/cc-best@2x.png` 를 새 폴더의 pages/cc 로 복사해 다시 쓴다. 밝은 테마의 공식 정지 그림은 찾지 못했다.

## Aside 특성

- `locator(...).screenshot()` 은 y 오프셋을 무시해 엉뚱한 곳을 자른다. `page.screenshot()` 전체를 찍고 사각형으로 자른다.
- `fullPage` 캡처는 뷰포트가 반복된다. 긴 화면은 위의 조각 방식을 쓴다.
- `page.waitForFunction` 이 안 될 때가 있다. `waitFor` 처럼 `page.evaluate` 를 반복한다.
- 저장된 PNG는 `~/.aside/u/1/sessions/<세션>/` 에 생긴다.
- `file://` 은 열 수 없다. 로컬 HTML은 `http://127.0.0.1:<포트>/` 로 연다.
