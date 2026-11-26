# motionize-anything

제품 사용법이나 개념 설명을 화면 녹화 없이 HTML 모션으로 만드는 Claude Code 플러그인입니다.

## 만드는 것

| 만드는 것 | 결과 |
|-----------|------|
| 사용법 모션 | 캡처나 HTML 로 그린 가짜 화면 위에 커서 이동, 물방울 클릭, 입력, 화면 전환, 강조를 그린 발표 화면입니다. |
| 설명 모션 | 질문이나 요청을 리서치해 큰 그림부터 10컷 안팎으로 설명하는 발표 화면입니다. |
| PR 미리보기 | PR 본문에 첨부하는 움직이는 SVG 입니다. 사용자가 요청할 때만 만듭니다. |

- 기본 보기는 클릭으로 넘기는 발표 모드입니다. 읽는 멈춤마다 멈춥니다.
- `?export=1` 주소로 60fps mp4(1080p와 1440p)를 내보냅니다.
- 기준 프레임을 저장해 두고 고친 뒤 픽셀 단위로 비교합니다.

## 설치

```bash
claude plugin marketplace add <이 폴더 경로>
claude plugin install motionize-anything@motionize-anything
```

설치하면 `motionize-anything` 스킬이 보입니다. "사용법 모션 영상 만들어줘", "모션 ppt로 설명해줘" 같은 요청에 스킬이 실행됩니다.

## 폴더 구조

```
.claude-plugin/        plugin.json, marketplace.json
skills/motionize-anything/
  SKILL.md             스킬 본문
  reference/           사용법, 캡처, 엔진, 내보내기, 확인, PR 미리보기, 설명 모션 문서
  scripts/             PR 미리보기 업로드 스크립트
  engine/usage/        사용법 모션 시작 틀
  engine/explainer/    설명 모션 시작 틀(daisyUI 테마 ui.css 와 scenes/kit.js 포함, daisyUI CSS 는 CDN)
  examples/usage-demo/ 완성 예시(가짜 메모 앱)
```

## 예시 열어 보기

```bash
cd skills/motionize-anything/examples/usage-demo
python3 -m http.server 8975 --bind 127.0.0.1
# 브라우저에서 http://127.0.0.1:8975/index.html 을 엽니다. 클릭하거나 오른쪽 화살표 키로 넘깁니다.
```

- 글꼴(Pretendard)은 공개 CDN 에서 불러옵니다. 인터넷에 연결되지 않으면 시스템 글꼴로 보입니다.
- `motion-params.json` 이 없어 콘솔에 404 한 줄이 나옵니다. 값 파일은 선택 사항이라 기본값으로 그립니다.

## Playwright

플러그인에는 Playwright 가 들어 있지 않습니다. 기준 프레임, mp4 내보내기, 확인 도구(`tools/check.mjs`)에만 필요합니다.

```bash
cd <모션 폴더>
npm i playwright@1.58.2
```

- 버전은 1.58.2 로 고정합니다. 이 버전은 `chromium-1208` 브라우저를 씁니다.
- `npx playwright install` 은 쓰지 않습니다. 공용 캐시에서 다른 프로젝트의 브라우저를 지울 수 있습니다.
- 브라우저가 없으면 `PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw-browsers" npx playwright install chromium` 으로 모션 폴더 안에 받고, 스크립트를 실행할 때도 같은 환경 변수를 줍니다.
- 스크립트는 모션 폴더에서 위로 올라가며 `node_modules/playwright` 를 찾습니다. 다른 곳에 설치했으면 `PW_ROOT=<설치 폴더>` 를 줍니다.
- 자세한 내용은 `skills/motionize-anything/reference/usage.md` 의 Playwright 준비 절에 있습니다.

## 필요한 도구

- Node.js 와 npm (Playwright 용)
- 네트워크 (설명 모션은 daisyUI CSS 를 jsdelivr CDN 에서 불러옵니다. 확인 도구와 mp4 내보내기도 같습니다)
- ffmpeg (mp4 내보내기용)
- Python 3 와 Pillow, numpy (기준 프레임 비교용)
- Aside 브라우저 CLI (화면 캡처와 PR 미리보기 업로드용, 선택)
- gh (PR 미리보기 본문 갱신용, 선택)
