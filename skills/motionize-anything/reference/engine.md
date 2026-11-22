# 엔진 (index.html, motion-steps.js, click-fx.js)

시작 틀: `<스킬 폴더>/engine/usage/`, 완성 예시: `<스킬 폴더>/examples/usage-demo/`(발표 모드). 파일 이름만 쓰면 시작 틀의 파일이다.

## 무대와 시간

- 무대는 1920×1080 하나(`#stage`). `render(t)` 하나가 모든 스타일을 정한다. t는 실제 초이고 같은 t면 언제나 같은 그림이다(CSS 애니메이션, 난수 없음, 타이핑 흔들림도 `typeSched` 의 고정 식).
- 단계 값은 모두 기준 ms 이다. `render` 안에서 `t = tr * SPEED`(기준 초)로 바꿔 쓴다. 전체 길이 `DURATION = BASE / speed`.
- 물방울, 커서 누름, Enter 키 누름은 `tr`(실제 초)로 그린다.
- 주소 옵션
  - 옵션 없음: 발표 모드(`DECK`). 무대를 창에 맞춰 줄이고 가운데에 둔다. 0초부터 재생해 첫 멈춤에서 멈춘다(아래 발표 모드 절)
  - `?auto=1`: 발표 모드에서 자동 전환 체크박스를 켠 채로 연다
  - `?t=12.5`: 그 시각에서 멈춘 채로 연다. 발표 모드에서는 클릭하면 다음 멈춤까지 재생한다
  - `?box=1`: 1024×576 보기(배율 1024/1920, 흰 바탕, 모서리 32px). 처음부터 끝까지 반복 재생하는 영상 방식
  - `?export=1`: 배율 1, 조작 줄 없음, 자동 재생 없음, 바탕 #f2f4f6
  - `?embed=1`: export와 같은 바탕, 자동 재생 없음, 키 입력 무시(편집기 미리보기용 연결 지점)
  - `?params=local`: localStorage 값 사용(편집기 연결 지점. 편집기는 없다)

## window API

| 이름 | 뜻 |
|------|----|
| `seek(t)` | t(실제 초)로 이동해 그림 |
| `DURATION` | 전체 실제 초 |
| `ready` | 값, 이미지 디코드, 글꼴, `measure()` 까지 끝나면 풀리는 Promise |
| `hotspots(tr)` | 지금 화면의 움직이는 요소 사각형 목록 `{stepId, kind, label, rect}` (편집기용, 읽는 곳 없음) |
| `paramsSource` | 값 출처 `local`, `file`, `default` |
| `STEPS` | `MotionSteps.compute` 결과 `{list, by, T, BASE, DURATION}` |
| `T` | 단계 id별 `{s, e, v, ts, press}`(기준 초) |
| `stops()` | 발표 모드 멈춤 목록 `{id, s, e}`(실제 초). 길이가 멈춤 수 |
| `advance()`, `back()` | 다음 멈춤, 이전 멈춤(클릭과 키가 부르는 함수) |

그 밖에 `render`, `applyParams`, `setZoom`, `captionOverflow(n)`(칩이 760px 넘는지), `capEditing` 이 있다.

## index.html 구역

`[공용]` 은 복사해 그대로 쓰고 `[기능마다]` 는 새로 채운다.

| 구역 | 구분 | 내용 |
|------|------|------|
| 무대, 보기 방식, 칩, 클릭 효과, 커서 CSS | 공용 | `#wrap` `#stage` `.chip` `#fx` `#cursor` |
| 화면 배치 CSS | 기능마다 | `#win` `#app` `#ccWin` `#cc` `.term` `.pt`(제품 화면 글꼴, 색) 등 |
| 장면 문장과 문제 박스 CSS | 기능마다(값은 그대로) | `.sent.l1` `.sent.l2`(kit.SENT 자리), `.issue`(주황 문제 박스) |
| 발표 모드 CSS | 기능마다(그대로 복사) | `html.deck`, `#prev`, `#autoLbl`, `#prog` |
| 무대 안 화면 요소 | 기능마다 | 앱 창, 터미널 창, 알림 카드와 그 안의 덮개 요소 |
| 효과 층 | 공용 | 순서를 지킨다: 효과 → 문구 → 커서 |
| 칩 DOM | 공용 구조 | `#cap<n>` = `<b>번호</b><span class="role">…</span><span class="ttl">…</span>` |
| 데이터 상수 | 기능마다 | `IMG` `APP`(창 배율 1.0, x 320, y 240) `CC` `R`(rects.json에서 옮김) `ISS`(문제 박스 글, 테두리 대상, 위치) 등 |
| 수학, 도구 | 공용 | `seg` `ioC` `bez` `patch` `full` `show` |
| 배치, 좌표 | 기능마다 | `aBox` `page()` `cardState()` `appWin()` `ccWin()` |
| `rebuild()` | 틀 공용, 목록 기능마다 | 클릭 `TG` `RAD` `PT`, 강조 `rings`, 커서 이동 `MV` |
| `cursorOn`, `measure()` | 기능마다 | 커서가 보이는 구간, 글꼴을 불러온 뒤 그린 요소를 재는 함수 |
| `render` | 문구 공용 → 화면 기능마다 → 강조, 클릭, 커서 공용 | |
| `hotspots` | 틀 공용, 줄 기능마다 | |
| 값 불러오기, 재생, 조작 | 공용 | `loadParams` `applyCaptions` `seek` `ready` `layout`(발표 모드는 marginTop 을 `(innerHeight-1080*k)/2` 로 가운데 정렬) |
| 발표 모드 | 기능마다(그대로 복사) | `stops` `stopAt` `presentStep` `advance` `back` `presentUI`, 끝의 `sceneText` 글꼴 불러오기 |

## motion-steps.js

- 위쪽 `[기능마다]`: `FEATURE_ID` `TXT`(입력할 글) `SCENES` `TYPE_DEF` `TR_DEF` `STEPS_SRC` `REPLY_LINES` `CAPTIONS` `SENTENCES` `CAPTION_OF` `CAPTION_SCENES` `ELEMENTS` `WAIT_NAME` `featureT` `CAP_GAP` `captionTimes`. 아래 공용 엔진 구역은 그대로 둔다.
- `STEPS_SRC` 항목: `id` `scene` `type` `name` `hint` `dur`(ms) `gap`(ms) `ex`(종류별 값 덮어쓰기) `text`(type 단계: `TXT` 의 키) `seed`(타이핑 흔들림 시드).
- 시작 = 앞 단계 끝. `gap` 이 있으면 그 단계 앞에 `<id>_w` wait 단계가 자동으로 생긴다(이름 `WAIT_NAME`, 길이 gap). 쉼은 gap으로 쓴다.
- `ex` 기본값은 `exDefaults`, 길이는 `durOf` 가 정한다.

| type | 길이 | ex 기본값 | 비고 |
|------|------|-----------|------|
| hold | dur | | 정지(읽는 시간) |
| wait | dur | | gap에서 자동 생성 |
| scroll | dur | | index.html 이 그림 위치를 계산 |
| glide | dur | curve 14(%) | 곡선 이동, 도착 감속 |
| click | dur, 누름 = 단계 끝 | ring 0 | ring 값은 이 영상 index.html 이 읽지 않음 |
| tap | dur, 누름 = 단계 끝 | | click과 같이 계산. 이 영상은 안 씀. `add(..., {touch: true})` 로 터치 점을 그리는 길이 index.html 에 있음 |
| type | 마지막 글자 시각 − 시작 | ms 42, jitter 30, space 30, punct 160, newline 200 | `TYPE_DEF` |
| nav | out + in | out 120, in 180 | 사각형 안만 흰색 거치기 |
| trans | max(out, inDelay + in) | out 400, inDelay 400, in 450 | `TR_DEF`. 창 바꾸기 |
| loop | trans와 같음 | `TR_DEF` | 처음으로 돌아가기 |
| ring | in + hold + out | in 150, hold 1000, out 200 | 대상 둘레 파란 선 |
| notify | in | in 450 | 알림 카드 슬라이드 |
| paste | dur | | 터미널 붙여 넣기 |
| key | dur, 누름 = 단계 끝 | | Enter 키 표시 |
| reply | first + (REPLY_LINES − 1) × each | first 400, each 650 | 응답 줄. `REPLY_LINES` 는 index.html 의 응답 줄 수와 같게 |

- `type`: 글자 d = ms × (1 − j + 2j × 고정 흔들림), j = jitter/100. 띄어쓰기 뒤 space, `.` `,` 뒤 punct, 줄바꿈 뒤 newline 을 더한다.
- `DERIVED`(type trans loop nav ring notify reply)는 길이가 ex 값에서 나와 `dur` 를 저장하지 않는다.
- `compute(P)` → `{list, by, T, BASE, DURATION}`. `press` 는 tap, click, key 일 때 단계 끝.
- `keyMoment(x)`: 대표 순간(ms). 클릭, 키는 끝 + 105, type 60%, glide 70%, trans, loop 는 out 끝, nav 는 out의 90%, ring 은 유지 가운데, notify in의 60%, paste 시작 + 최대 100, reply 끝, 나머지 가운데. `baseline.mjs` 가 쓴다.
- `defaults()` → `{version: 1, speed: 1.0, clickVariant: 'A', steps, scenes, elements, caption: {in: 300, move: 16}}`. `merge(saved)` 는 저장 값 중 숫자만 받고 모르는 키를 버린다. `diff(P)` 는 기본값과 다른 값만 뽑으며 `index.html` 이 부르지 않는다.
- 값 출처: `?params=local` 이면 localStorage, 아니면 같은 폴더의 motion-params.json(없으면 404 한 줄), 둘 다 없으면 `defaults()`. 이 영상은 motion-params.json 이 없다. 길이는 `STEPS_SRC` 의 `dur`, `ex`, 속도는 `defaults().speed` 를 고친다.

## 문구(칩)

- `CAPTIONS[n] = {num, role, title, kind: 'chip'}`. role 은 역할(회색 600), title 은 질문(검정 800)이다. 예: `{num: '2', role: '요청 보내기', title: '동료에게 어떻게 요청하나요'}`. `CAPTION_OF`(장면 → 문구 묶음), `CAPTION_SCENES`(그 반대), `ELEMENTS`(`cap<n>.title`).
- `applyCaptions` 가 `P.scenes[n]` 의 role, title(비면 `CAPTIONS` 값)을 칩에 쓴다. 칩 글은 한 줄이고 폭 760px 안이다.
- `captionTimes(T)` → 묶음마다 `{tin, tout, reenter?}`(기준 초). `tin` −1 은 처음부터 보임. 끝에서 `reenter` 로 다시 나타나 첫 화면과 이어진다.
- `CAP_GAP`(0.32초): 다음 칩은 앞 칩이 다 사라진 뒤 나타난다(같은 자리라 겹치지 않게). 창 바꾸기 장면은 `max(CAP_GAP, inDelay/1000)` 만큼 늦춘다.
- 나타남은 `caption.in` 300ms 동안 불투명도 + `caption.move` 16px 위로.

## 그리는 요령

- 실측으로 그린다: 포커스 테두리(2px, 1px 띄움), 캐럿, 입력 글, 버튼 호버 색은 `styleOf` 값이다. 입력 칸은 글이 생기면 바탕을 흰색으로 덮고 글을 그리며, 포커스만 있고 글이 없으면 자리표시자가 보이게 캐럿만 그린다.
- 줄 호버 같은 옅은 바탕은 `mix-blend-mode: multiply` 로 깔아 글자를 그대로 둔다.
- 화면 일부만 바뀌는 전환은 그 사각형 안만 흰색 거치기(`veil`, `tabVeil`, `paneVeil`)로 한다. 눌린 상자, 이어진 선은 누르는 순간 새 그림으로 바로 바꾼다.
- 두 캡처를 겹쳐 페이드하지 않는다(글자가 이중으로 보인다).
- 상태가 바뀐 카드는 원래 그림 위에 같은 클래스 구조로 다시 그린다. 카드 높이는 `measure()` 가 잰 값으로 정하고, 그 아래 카드는 그림을 잘라 내려 붙인다(`patch`).
- 긴 그림 스크롤: `patch` 로 긴 그림의 scrollY 구간을 보이고, 위 머리줄은 따로 고정한다. 끝 프레임이 뷰포트 캡처와 같음을 확인한 뒤 그 캡처로 바꾼다.
- 터미널: 그림(`cc-best@2x.png`)의 원래 경로, 아래 줄을 같은 글꼴(Menlo 30px, 줄 높이 38px)로 덮어 그려 잉크 양 1.0 안팎, 위치 1~2px 안으로 맞춘 뒤 글만 바꾼다. 색은 demo.gif 실측이다. 한글은 시스템 대체 글꼴이라 칸 폭이 조금 다르다. 붙여 넣기는 `[Pasted text #1 +N lines]` 한 덩어리로 그리고 N은 보낼 글의 줄바꿈 수다. 응답 줄 위치는 `CC_ROWS`(줄 사이 38 그림 px)로 계산한다.
- 창 바꾸기 슬라이드: 나가는 창 0.4초 → 들어오는 창 0.45초, 160px 이동 + 불투명도. `inDelay ≥ out` 이라 두 창이 겹치지 않는다.
- 알림 카드는 창 밖 무대 위에 두고 오른쪽에서 48px 미끄러져 들어오게 한다.
- 글꼴 굵기는 잉크 양을 비교해 정한다(`.pt` 의 글꼴 굵기).

## 새 단계 종류를 더할 때

1. `motion-steps.js`: `EXTRA`, `exDefaults`, `DERIVED`(ex로 길이가 나오면), `durOf`, `keyMoment` 에 type을 더한다.
2. `featureT` 는 모든 단계를 돌며 만들므로 따로 더할 것이 없다. 칩 시각이 바뀌면 `captionTimes` 를 본다.
3. `index.html` `render` 의 `[기능마다] 화면` 에 그리기를 더한다. 클릭이면 `TG`, `RAD`, 커서 이동이면 `MV`, 강조면 `rings` 도 더한다.
4. (선택) `hotspots` 에 같은 단계를 한 줄 더한다.
5. 기준 프레임을 다시 찍어 비교한다(`qa.md`).

## 장면 문장

- `SENTENCES[n] = [위 문장, 아래 문장]`. `index.html` 이 `#sent<n>_1`, `#sent<n>_2` 요소를 만든다.
- 단계 표에서 장면 처음(칩이 나타난 뒤)에 아래 4단계를 둔다. 예시 값은 hold 300, 2400, 300, 2600(ms)이다.

| id | type | 하는 일 |
|----|------|---------|
| `s<n>_sent1` | hold | 위 문장이 0.3초 동안 나타남 |
| `s<n>_read1` | hold | 위 문장 읽기 정지(발표 모드 멈춤) |
| `s<n>_sent2` | hold | 아래 문장이 0.3초 동안 나타남 |
| `s<n>_read2` | hold | 아래 문장 읽기 정지(발표 모드 멈춤) |

- 문장은 문제 박스가 떠 있는 동안에도 남고, 칩이 사라질 때(`captionTimes` 의 `tout`) 함께 사라진다.

## 문제 박스

- 단계 표에 ring 단계(id 에 `_issue`, `ex: ISSUE(유지 ms)`)를 두고 `index.html` 의 `ISS[id]` 에 `{txt, rings, box: {x, y, ax, ay}}` 를 적는다.
  - `rings`: 주황 테두리를 그릴 사각형 목록(`aBox(R.이름)`).
  - `box`: 앱 좌표의 기준점과 정렬(`ax`: l, c, r / `ay`: t, b). 앱 창 안에 두고 강조한 요소를 가리지 않게 한다.
- 유지가 1.6초 이상이면 테두리와 박스가 다 나타난 순간부터 유지 끝까지가 발표 모드 멈춤이 된다.

## 발표 모드

- 기본 보기(`?box=1`, `?export=1`, `?embed=1` 이 아닐 때)는 `DECK` 이다. `html.deck` 클래스로 아래 조작 줄을 숨기고 무대 안에 [이전] 버튼, 자동 전환 체크박스, 진행 표시를 그린다.
- 멈춤(`stops()`): `_read` 숫자로 끝나는 hold 단계 `[시작, 끝]`, 유지 1.6초 이상인 ring 단계 `[시작 + in, 시작 + in + hold]`. 앞 클릭의 물방울이 사라지기 전이면 멈춤 시작을 물방울이 끝난 뒤로 미룬다. loop 단계부터는 넣지 않는다.
- 재생(`presentStep`): 멈춤 안에서는 시간이 가지 않는다. 자동 전환이 꺼져 있으면 다음 멈춤 시작에서 멈추고, 켜져 있으면 원래 시간표대로 마지막 멈춤까지 재생한다. 한 프레임의 시간 증가는 0.25초까지다.
- 다음(`advance`, 무대 클릭과 → Enter Space): 멈춤 안이면 그 멈춤 끝으로, 움직이는 중이면 다음 멈춤 시작으로. 마지막 멈춤 뒤에는 loop 를 끝까지 재생하고 0초부터 첫 멈춤까지 재생한다.
- 이전(`back`, [이전] 버튼과 ←): 한 멈춤 앞의 시작으로. Cmd, Ctrl, Alt 를 함께 누르면 받지 않는다.
- `layout()`: 배율 `k = min(innerWidth/1920, innerHeight/1080)`, marginTop `(innerHeight-1080*k)/2`. 남는 높이를 반으로 나눠 무대를 창 가운데에 둔다.
