# 사용법 모션 만들기

제품 사용법을 클릭으로 넘기는 발표 화면(사용법 모션)으로 만드는 절차다. 형식 선택과 공통 내용은 `<스킬 폴더>/SKILL.md` 에 있다.
`<스킬 폴더>` 는 이 스킬을 불렀을 때 맨 위에 나오는 `Base directory for this skill` 경로다.

제품 한 흐름을 처음 쓰는 사람에게 차례대로 보여 주는 발표형 모션을 만든다. 보는 사람이 클릭해 넘기며 장면마다 칩과 설명 문장 2개를 읽는다.
완성 예시는 `<스킬 폴더>/examples/usage-demo/` 이다(가짜 메모 앱, 장면 3, 멈춤 7, 약 40초). 클릭, 입력, 화면 전환, 문제 박스, 터미널 단계를 모두 쓴다.
읽는 순서는 이 문서, `<스킬 폴더>/reference/engine.md`, 예시 폴더의 `README.md` 이다.

## 언제 쓰나

- 제품 사용법을 장면 4~6개짜리 모션으로 만들 때. 기본은 클릭으로 넘기는 발표 모드이고, mp4 는 사용자가 요청할 때만 만든다.
- 에이전트(Claude Code 터미널)에게 일을 맡기는 단계가 흐름에 들어갈 때.
- 쓰지 않는 경우: 실제 화면을 조작하며 녹화하는 영상. 이 스킬은 녹화하지 않고 정지 캡처나 HTML 로 그린다.

## 꼭 지킬 것

1. **카메라 줌 없음.** 장면 안 구도는 고정한다.
   - 구도를 바꿀 때는 흰색 거치기(창 안 또는 사각형 안만) 또는 창 바꾸기 슬라이드(두 창이 겹치지 않음)만 쓴다.
2. **캡처는 페이지 상태만.** 호버, 포커스, 입력 중, 눌린 상태는 찍지 않는다.
   - 그 상태를 실제로 만들어 `styleOf` 로 잰 값으로 HTML에 그린다(`capture.md`).
3. **클릭 = 물방울.** `click-fx.js` 시안 A를 쓴다. 커서는 곡선으로 움직이고 도착할 때 감속한다.
   - 물방울과 누름은 영상 속도와 상관없이 실제 시간으로 재생한다.
4. **발표 모드가 기본 보기다.** 주소에 옵션이 없으면 읽는 멈춤마다 멈추고 클릭을 기다린다.
   - 다음: 무대 클릭, →, Enter, Space. 멈춘 화면이면 다음 멈춤까지 재생하고, 재생 중이면 다음 멈춤으로 바로 이동한다.
   - 이전: ←, 왼쪽 아래 [이전] 버튼. 첫 멈춤에서는 움직이지 않는다.
   - 마지막 멈춤에서 다음을 누르면 처음으로 돌아가는 전환을 재생하고 첫 멈춤에서 멈춘다.
   - 오른쪽 아래에 자동 전환 체크박스(새로 열면 꺼짐, `?auto=1` 이면 켜짐)와 진행 표시(예: 3 / 20)를 둔다.
   - 멈춤은 `s<n>_read1`, `s<n>_read2` hold 단계와 유지 1.6초 이상인 ring 단계(문제 박스)에서 생긴다. 앞 클릭의 물방울이 남아 있으면 물방울이 사라진 뒤에 멈춘다.
   - mp4 내보내기는 선택 사항이다. `?export=1` 은 조작 요소 없이 원래 시간표대로 그린다.
5. **속도.** 사용법 영상은 SPEED 1.0 이다(사용자 요청 "사용법 영상은 더 빠르게"). `motion-steps.js` 의 `defaults().speed` 값이다.
   - 읽는 화면은 실제 1.6초 이상 멈춘다.
   - 끝은 첫 화면과 같은 상태로 0.3초 이상 멈춰 반복 이음매가 보이지 않게 한다.
6. **장면 칩은 역할, 질문 형태다.** 번호, 역할(`CAPTIONS[n].role`), 질문(`CAPTIONS[n].title`)을 한 줄로 쓰고 폭 760px 안에 둔다(`window.captionOverflow(n)` 로 확인).
   - 예: 1, 메모 만들기, 새 메모는 어떻게 만드나요.
7. **장면마다 설명 문장 2개.** 칩 아래에 위 문장과 아래 문장(`SENTENCES[n]`)이 차례로 나타나고, 문장마다 멈춘다.
   - 자리는 x 120, 위 문장 y 114~162(글자 40px 굵게), 아래 문장 y 166~210(글자 34px)이다. 글자 크기는 `zoom` 배율로 정한다.
   - 문장 하나는 한 줄이고 폭 1680px 안이다. 사용자가 할 동작과 그 결과를 쓴다.
   - 단계 표에는 장면 처음에 `s<n>_sent1`(0.3초 나타남), `s<n>_read1`(읽기 정지), `s<n>_sent2`, `s<n>_read2` 를 둔다. 문장은 다음 장면으로 넘어갈 때 칩과 함께 사라진다.
8. **구도 기본값(예시 기준).** 무대 1920×1080, 바탕은 daisyUI `base-200`(옅은 회색)이다.
   - 위에서 아래로 칩(y 17~73), 문장 자리(y 114~210), 앱 창(y 240~1060)을 둔다. 서로 겹치지 않는다.
   - 앱 창은 daisyUI `mockup-window` 1280×820 이고 x 320~1600, y 240~1060 에 놓는다. 위 48px 는 창 막대(점 3개)이고 앱 화면은 그 아래 1280×772(x 320~1600, y 288~1060)에 그린다. HTML 로 그리는 앱 화면은 daisyUI 기본 크기의 1.25배(`zoom`, `APP.s` 1.25)로 키워 읽히게 하고, 캡처 그림을 쓰면 `APP.s` 는 1이고 캡처 뷰포트를 1280×772 으로 맞춘다(`capture.md`).
   - 터미널 창은 같은 폭 1280 에 맞춰 `cc-best@2x.png` 를 1280/1460배로 그린다.
   - 브라우저 창에서는 무대를 창에 맞춰 줄이고 가운데에 둔다. `layout()` 의 marginTop 은 남는 높이의 절반(`(innerHeight-1080*k)/2`)이다. 남는 높이를 위쪽에 모두 주면 무대가 창 아래에 붙는다.
9. **문제와 강조 박스.**
   - 사용 흐름을 보여 주는 강조는 대상 둘레 파란 테두리(ring 단계)만 쓴다.
   - 문제 지점은 ring 단계(id 에 `_issue`)로 두고, 관련 요소에 주황 테두리를 그리며 문제 박스를 띄운다.
   - 문제 박스는 daisyUI `alert alert-warning alert-soft`(주황, 옅은 배경)이고 왼쪽에 `badge badge-warning` 문제 라벨을 붙이며 글은 한 줄로 쓴다(`index.html` 의 `.issue`, `ISS`). 사용법 모션은 `#stage` 에서 `--color-warning` 을 테마의 `--color-issue`(주황 `b25e09`)로, `--color-info` 를 `--color-usage-blue`(동작 파랑)로 연결한다. 강조 선(`text-warning`, `text-info`)과 버튼, 칩 번호 원이 이 색을 따른다.
   - 박스는 앱 창 안에 두고 칩, 문장, 강조한 요소를 가리지 않게 위치(`ISS[id].box`)를 정한다.
   - 박스 유지 시간은 1.6초 이상으로 해 멈춤이 생기게 한다(예시는 2.75초 이상).
10. **에이전트에게 맡기는 단계.** Claude Code 터미널 그림 위에 붙여 넣기, 입력, Enter, 응답 줄을 그린다.
   - 그림은 `<스킬 폴더>/engine/usage/pages/cc/cc-best@2x.png` 를 다시 쓴다(출처는 같은 폴더의 `SOURCES.md`).
   - 터미널 창 요소(`#ccWin`)와 입력, 응답 그리기는 `examples/usage-demo/index.html` 에서 복사한다.
11. **데이터 안전.** 화면에 고객 실명, 회사, 토큰 같은 글이 남지 않게 찍기 전후에 눈으로 확인한다.
   - capture 도구에는 자동 가명 처리와 금지어 검사 함수가 없다.
   - 고객이 나오는 제품이면 가명 방침을 사용자에게 먼저 묻는다.
   - 서버에 제출하거나 저장하는 동작은 사용자 승인 없이 하지 않는다. 그 상태의 모양은 임시 요소로 재서 그린다.
12. **실제와 다르게 그린 곳은 모두 README 의 "뺀 것, 실제와 다른 점" 절에 적는다.**
13. **보여 줄 때는 로컬 서버 주소를 브라우저로 연다.** `python3 -m http.server --bind 127.0.0.1` 로 띄운다. `file://` 은 fetch가 막혀 안 된다.
14. **엔진(index.html, motion-steps.js) 작업을 위임할 때는 모델을 Opus로 지정한다.**
15. **화면 스타일은 daisyUI 로만 정한다.** 가짜 앱 화면, 칩, 문제 박스, 조작 버튼, 터미널 덮개까지 모든 화면 요소는 daisyUI 5 컴포넌트 클래스(`navbar`, `menu`, `list`, `btn`, `input`, `textarea`, `alert`, `badge`, `mockup-window`, `mockup-code` 등)로 그린다.
    - 색은 `ui.css` 의 daisyUI 테마(`data-theme="motionize"`) 한 곳에서만 정한다. `index.html` 에 hex 나 rgb 색 값을 쓰지 않고 색 클래스(`text-info`, `bg-base-100`)나 `var(--color-*)` 로 쓴다.
    - `index.html` 의 `<style>` 과 인라인 `style` 에는 배치용 값(위치, 크기, `zoom` 배율, `flex`, `gap`)만 둔다. 직접 만든 CSS 를 새로 쓰지 않는다.
    - 그림 파일(캡처 PNG)은 그림이라 그대로 두고, 그 위에 덮는 HTML 만 daisyUI 로 그린다. 터미널 덮개의 색은 그림의 색에 맞춘 테마 변수(`--color-term-*`)를 쓴다.

## 진행 순서 (단계마다 사용자 확인 후 다음으로)

| 단계 | 할 일 | 끝났다고 볼 기준 |
|------|-------|------------------|
| 1. 장면표 | 장면 4~6개로 나누고 장면마다 칩(역할, 질문), 설명 문장 2개, 캡처할 페이지 상태, 클릭과 입력 순서, 문제 박스 글을 표로 적는다. | 사용자가 장면표를 승인 |
| 2. 캡처 | `capture.md` 대로 Aside로 찍는다. 뷰포트 1280×772, PNG는 2배, 사각형과 스타일은 `rects.json`, 설명은 `notes.md`. | PNG를 모두 눈으로 확인, 클릭 대상과 입력 필드, 스크롤 영역, 실측 스타일이 rects.json에 있음, 민감한 글 없음 |
| 3. 단계 표 | `motion-steps.js` 의 `[기능마다]` 를 채운다(`STEPS_SRC`, `TXT`, `CAPTIONS`, `SENTENCES`, `captionTimes`). | `compute` 로 단계 수와 전체 길이 확인, 읽는 멈춤 1.6초 이상 |
| 4. 엔진 | `index.html` 의 `[기능마다]` 를 채운다(`engine.md`). | 발표 모드로 처음부터 끝까지 클릭해 넘기며 멈춤마다 봄, `window.stops().length` 가 장면표의 멈춤 수와 같음, 콘솔 오류 없음 |
| 5. 기준 프레임 | `baseline.mjs` 로 프레임을 저장해 둔다(`qa.md`). | 기준 폴더가 생김 |
| 6. (선택) 내보내기 | 사용자가 mp4 를 요청할 때만 `export.mjs` 로 두 크기를 만든다(`export.md`). | ffprobe로 크기와 60fps, 길이 확인, 프레임 시트를 눈으로 봄 |
| 7. 확인, README, 보고 | 폴더 `README.md` 를 쓰고 짧게 보고한다. | 보고 전 확인표(`qa.md`) 통과 |

편집기 단계는 없다. 길이와 속도는 `motion-steps.js` 에서 고친다.

## 새 영상 폴더 만들기

새 폴더는 사용자가 정한 프로젝트 안 아무 곳에 둔다(예: `motions/<이름>/`). 엔진은 `<스킬 폴더>/engine/usage/` 에서 복사한다.

```bash
SK=<스킬 폴더>
NEW=<모션 폴더>
mkdir -p $NEW/pages
cp -R $SK/engine/usage/{index.html,motion-steps.js,click-fx.js,export.mjs,baseline.mjs,tools} $NEW/
cp -R $SK/engine/usage/capture $NEW/              # 캡처 도구(Aside 로 찍을 때)
mkdir -p $NEW/pages/cc && cp $SK/engine/usage/pages/cc/cc-best@2x.png $NEW/pages/cc/   # 터미널 장면이 있을 때만
```

- 시작 틀(`engine/usage/index.html`)은 장면 1개, 가짜 앱 창, 클릭 1번, 화면 전환 1번, 처음으로 돌아가기를 가진 작은 모션이다. 복사한 뒤 `[기능마다]` 부분을 제품에 맞게 바꾸고 장면을 늘린다.
- 장면 3개짜리 완성 예시 `examples/usage-demo/` 는 클릭, 입력, 창 바꾸기, 문제 박스, 터미널 단계를 모두 쓴다. 필요한 부분을 거기서 복사해 시작 틀에 붙인다.
- 바꿀 곳은 `[기능마다]` 표시가 붙은 부분이다.
  - `motion-steps.js`: `FEATURE_ID`, `TXT`, `SCENES`, `STEPS_SRC`, `REPLY_LINES`, `CAPTIONS`, `SENTENCES`, `CAPTION_OF`, `CAPTION_SCENES`, `ELEMENTS`, `featureT`, `captionTimes`.
  - `index.html`: 화면 배치용 규칙, 무대 안 화면 요소(daisyUI 마크업), `#cap<n>` 칩, `IMG`, `APP`, `CC`, `R`, `ISS` 상수, `page()`, `rebuild()` 안 클릭과 강조, 커서 목록, `measure()`, `render` 의 `[기능마다] 화면`.
  - 발표 모드 절(`stops`, `advance`, `back`, `presentUI`)과 `layout()` 은 그대로 쓴다. 멈춤 규칙은 단계 id(`_read1`, `_read2`)와 ring 유지 시간으로 정해진다.
- 캡처 장면 스크립트(`s1.js` 같은 파일)는 제품에 맞게 새로 쓴다. 쓰는 모양은 `capture.md` 에 있다.
- 복사한 캡처 도구는 1440×900 뷰포트를 가정한다. 1280×772 으로 고치는 곳은 `capture.md` 준비 절에 있다.
- 캡처 PNG 없이 HTML 로 그린 가짜 화면을 쓰는 모션이면 `IMG` 를 비우고 `capture/` 는 복사하지 않는다.

## Playwright 준비 (기준 프레임, mp4, 확인 도구)

이 플러그인에는 Playwright 를 넣지 않았다. `baseline.mjs`, `export.mjs`, `tools/check.mjs` 는 아래 순서로 Playwright 를 찾는다.

1. 환경 변수 `PW_ROOT` 가 있으면 그 폴더에서, 없으면 스크립트가 있는 모션 폴더에서 시작한다.
2. 그 폴더에 `node_modules/playwright` 가 없으면 한 단계씩 위 폴더로 올라가며 찾는다.
3. 루트까지 없으면 설치 방법을 알리는 오류를 내고 멈춘다.

**설치**

```bash
cd <모션 폴더>
npm init -y                  # package.json 이 없을 때만
npm i playwright@1.58.2      # 버전은 1.58.2 로 고정한다
```

- 같은 일을 하는 모션 폴더가 여럿이면 공통 부모 폴더에 한 번만 설치해도 된다(위로 올라가며 찾기 때문이다).
- 설치만으로는 브라우저가 생기지 않는다. 1.58.2 는 Chromium 빌드 `chromium-1208` 을 쓴다.

**브라우저**

- `~/Library/Caches/ms-playwright/chromium-1208` 이 이미 있으면 그대로 쓴다. 따로 받지 않는다.
- `npx playwright install` 은 쓰지 않는다. 이 명령은 공용 캐시(`~/Library/Caches/ms-playwright`)에서 새 버전이 쓰지 않는 브라우저를 지울 수 있어, 다른 프로젝트가 쓰는 브라우저 캐시가 사라진다.
- 브라우저가 없으면 캐시 위치를 모션 폴더 안으로 지정해 받는다. 이 폴더 안의 브라우저만 건드린다.

```bash
cd <모션 폴더>
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw-browsers" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw-browsers" node export.mjs        # 실행할 때도 같은 값을 준다
```

- `.pw-browsers` 폴더는 커밋하지 않는다(`.gitignore` 에 적는다).
- mp4 를 만들 때는 `ffmpeg` 가 PATH 에 있어야 하고, 기준 프레임 비교(`qa.md`)에는 Pillow 와 numpy 가 필요하다.

## 명령

영상마다 포트를 따로 쓴다(아래 8975 는 예시 값). 서버는 반드시 `127.0.0.1` 로 띄운다.

```bash
F=<모션 폴더>
python3 -m http.server 8975 --bind 127.0.0.1 --directory $F
#  발표 모드    http://127.0.0.1:8975/index.html          (클릭으로 넘김, 첫 멈춤에서 멈춤)
#  자동 전환    http://127.0.0.1:8975/index.html?auto=1
#  특정 순간    http://127.0.0.1:8975/index.html?t=41.2   (그 화면에서 멈춘 채 열림, 클릭하면 다음 멈춤까지)
#  반복 재생    http://127.0.0.1:8975/index.html?box=1    (1024×576, 처음부터 끝까지 반복)
#  내보내기용   http://127.0.0.1:8975/index.html?export=1 (조작 요소 없음, 원래 시간표)

cd $F
node baseline.mjs /tmp/motion_base 8975                       # 기준 프레임
PORT=8975 NAME=<이름> node export.mjs [crf]                    # 기본 crf 16
LIMIT=120 PORT=8975 NAME=<이름> node export.mjs                # 앞 120프레임만(시험)
PORT=8975 node tools/check.mjs --steps --times 2,8 --out /tmp/motion_qa   # 단계 표, 프레임, 콘솔 오류
ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of compact $F/<이름>-1080p60.mp4

# 단계 표만 확인(서버 없이)
cd $F && node -e "global.window=global;require('./motion-steps.js');const C=MotionSteps.compute(MotionSteps.defaults());console.log(C.list.length,C.DURATION)"
```

- Playwright 를 폴더 밖에 설치했으면 `PW_ROOT=<설치 폴더>` 를 앞에 붙인다. 서버 루트가 모션 폴더가 아니면 `BASE_PATH=/<모션 폴더까지 경로>` 도 준다.

## 파일 지도 (시작 틀과 예시)

시작 틀 `<스킬 폴더>/engine/usage/` (공용은 그대로 복사, 기능마다는 새로 채움).

| 파일 | 구분 | 하는 일 |
|------|------|---------|
| `index.html` | 공용 + 기능마다 | 모션 본체. `[공용]` 틀에 `[기능마다]` 화면, 장면 문장, 문제 박스(`ISS`), 발표 모드 절을 채움 |
| `motion-steps.js` | 위쪽 기능마다, 아래 공용 | 단계 표, 칩 글(`CAPTIONS`), 장면 문장(`SENTENCES`), 시간 계산 |
| `click-fx.js` | 공용 | 클릭 효과 시안 A~F |
| `export.mjs` | 공용 | (선택) 60fps mp4 두 크기 |
| `baseline.mjs` | 공용 | 기준 프레임 찍기 |
| `tools/check.mjs` | 공용 | 지정한 시각의 프레임 저장, 콘솔 오류, 칩 폭, 단계 표 |
| `pages/cc/` | 재사용 | 터미널 그림과 출처 |
| `capture/common.js` | 공용 | 캡처 도구(measure, styleOf, tallShots) |
| `capture/run.sh` | 공용 | 스크립트 실행 + PNG 복사 + rects.json 합치기 |
| `capture/stitch.py` | 공용 | 긴 그림 이어 붙이기 |
| `capture/merge_rects.py` | 공용 | 로그의 RECT, STYLE, NOTE, SIZE 줄을 rects.json에 합침 |

완성 예시 `<스킬 폴더>/examples/usage-demo/` 는 위 엔진 파일에 `[기능마다]` 를 채운 것이다(가짜 메모 앱, 장면 3, 캡처 PNG 없음). 모션 폴더에는 `pages/`(캡처 PNG, `rects.json`, `notes.md`)와 `README.md`(여는 법, 넘기는 법, 멈춤표, 장면표, 그린 것, 뺀 것, 확인한 것)가 더 있다.

## 함정

- **스크립트 캐시.** `index.html` 의 `click-fx.js?v=4`, `motion-steps.js?v=7` 끝 숫자를 엔진 파일을 고칠 때마다 올린다. 안 올리면 브라우저가 예전 파일을 쓴다.
- **rects.json은 읽지 않는다.** `index.html` 은 fetch 하지 않고 값을 `R` 상수로 옮겨 적는다. 캡처를 다시 찍으면 상수도 고친다.
- **글꼴 잉크 양.** 헤드리스가 그린 글자는 캡처 글자와 굵기가 달라 보일 수 있다. 잉크 양을 재어 `.pt` 글꼴 굵기를 조금 올리거나 내려 맞춘다.
- **ICC 프로필.** `stitch.py` 는 저장할 때 색 프로필을 버린다. 뷰포트 그림의 프로필을 긴 그림에 붙여 색을 맞춘다.
- **PNG 이름.** `run.sh` 는 Aside 세션 폴더에서 `s<숫자>*.png` 만 복사한다. 그림 이름은 `s2-home.png` 처럼 시작한다.
- **터미널 그림 선로드.** `index.html` 의 `IMGS` 는 `pages/cc/cc-best@2x.png` 를 늘 불러오고 `window.ready` 가 그 디코드를 기다린다. 그림이 없으면 `ready` 가 실패해 `export.mjs`, `baseline.mjs` 가 멈춘다. 터미널 단계가 없는 영상은 `IMGS` 에서 그 항목을 지운다.
- **숨은 글의 글꼴.** 문장, 문제 박스, 칩은 처음에 숨어 있어 브라우저가 그 글자의 글꼴 조각을 미리 불러오지 않는다. 예시 `index.html` 끝의 `sceneText` 가 그 글자를 모두 불러온 뒤 `measure()` 를 다시 부른다. 새 글을 추가하면 `sceneText` 가 그 글도 읽는지 확인한다.
- **멈춤 이름.** 발표 모드의 `stops()` 는 `_read1`, `_read2` 로 끝나는 hold 단계와 유지 1.6초 이상인 ring 단계만 멈춤으로 본다. 단계 id 를 바꾸면 멈춤이 사라진다.
- **콘솔 404 한 줄.** `motion-params.json` 이 없으면 404가 한 줄 찍힌다. 정상이고 기본값으로 그린다(`window.paramsSource` 가 `default`).
- **편집기는 없다.** `?params=local`, `?embed=1`, `MotionSteps.KEY` 는 편집기를 붙일 때 쓰는 연결 지점으로 코드에 남아 있다. 길이는 `STEPS_SRC` 에서 고친다.
