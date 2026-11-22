---
name: motionize-anything
description: 제품 사용법이나 개념 설명을 화면 녹화 없이 HTML 모션으로 만든다. 사용법 모션은 정지 캡처나 HTML 로 그린 가짜 화면 위에 커서 이동, 물방울 클릭, 입력, 화면 전환, 강조를 그리고 render(t) 한 함수로 재생한다. 기본 보기는 클릭으로 넘기는 발표 모드이고, 읽는 멈춤마다 멈추며, 장면마다 칩 아래에 설명 문장 2개가 차례로 나타나고, 문제 지점은 주황 문제 박스로 보인다. mp4(60fps, 1080p와 1440p)는 ?export=1 로 필요할 때만 내보낸다. 에이전트에게 맡기는 단계는 Claude Code 터미널 그림 위에 붙여 넣기, 입력, 응답을 그린다. 설명 모션(ppt 형식)은 질문이나 요청을 리서치해 큰 그림부터 10컷 안팎으로 설명하고, 볼 사람의 수준을 3문제로 확인하며, 작은 CSS 변수 파일(ui.css)로 그린 화면 조각과 도식으로 그린다. "사용법 영상 만들어줘", "사용법 모션 영상", "가이드 영상 모션으로", "OO 사용법 영상", "Claude Code 화면 넣은 사용법 영상", "클릭으로 넘기는 사용법 모션", "모션 ppt로 설명해줘", "OO가 뭔지 모션으로 설명해줘", "설명 모션 만들어줘", "motionize" 요청에 사용. "PR 미리보기 만들어줘" 요청이면 움직이는 SVG 를 만들어 PR 본문 첨부로만 업로드한다(모든 PR에 추가하지 않음).
---

# 모션 자료 만들기 (motionize-anything)

이 스킬이 만드는 것은 3가지이고, 모두 화면 녹화 없이 HTML 이나 SVG 로 그린다.
엔진 파일은 이 스킬의 `engine/` 폴더에 있다. 새 모션 폴더를 만들 때 거기서 복사해 쓴다.

`<스킬 폴더>` 는 이 스킬을 불렀을 때 맨 위에 나오는 `Base directory for this skill` 경로다. 아래 문서의 경로는 모두 `<스킬 폴더>` 기준이다.

## 만드는 것 3가지

| 만드는 것 | 언제 쓰나 | 결과 | 읽을 문서 |
|-----------|-----------|------|-----------|
| 사용법 모션 | 제품 한 흐름을 처음 쓰는 사람에게 차례대로 보여 줄 때 | 캡처나 HTML 로 그린 화면 위에 커서와 클릭을 그린 발표 화면(장면 4~6개). mp4 는 요청할 때만 | `reference/usage.md` |
| 설명 모션 | 개념, 작업, 문서를 큰 그림부터 설명할 때 | 그림과 `ui.css` 화면 조각으로 그린 10컷 안팎의 발표 화면 | `reference/explainer.md` |
| PR 미리보기 | 사용자가 특정 PR 에 미리보기를 요청할 때만 | PR 본문에 첨부하는 움직이는 SVG | `reference/pr-preview.md` |

## 먼저 지킬 것

- 요청을 보고 만들 것을 하나 정한 뒤 그 문서와 그 문서가 가리키는 문서를 읽고 따른다. 다른 만들 것의 규칙을 섞지 않는다.
  - 사용법 모션은 단계마다 사용자 확인을 받고, 설명 모션은 승인 없이 바로 제작한다.
- PR 미리보기는 사용자가 그 PR 에 요청할 때만 만든다. PR 을 만들거나 고칠 때 미리보기를 넣을지 묻거나 제안하지 않는다.
- 모션은 `render(t)` 하나로 그린다. 같은 t 면 같은 그림이어야 하므로 CSS 애니메이션, 난수, 현재 시각을 쓰지 않는다.
- 브라우저로 확인하거나 mp4 를 내보내려면 Playwright 가 필요하다. 플러그인에는 들어 있지 않다. 설치와 브라우저 준비는 `reference/usage.md` 의 Playwright 준비 절을 따른다. `npx playwright install` 은 쓰지 않는다.

## 파일 지도

```
<스킬 폴더>/
  SKILL.md           이 문서
  reference/
    usage.md         사용법 모션: 꼭 지킬 것, 진행 순서, 새 영상 폴더 만들기, Playwright 준비, 명령, 파일 지도, 함정
    capture.md       Aside 캡처, rects.json, 긴 그림, 터미널 그림
    engine.md        index.html, motion-steps.js 구조, 단계 종류, 그리는 요령
    export.md        mp4 내보내기와 확인
    qa.md            기준 프레임 비교, 눈으로 보기, 보고 전 확인표
    pr-preview.md    PR 미리보기(움직이는 SVG) 형식, 확인, 업로드
    explainer.md     설명 모션(ppt 형식): 리서치, 큰 그림 초안, 사전 테스트, 제작, 검증, 이어 묻기
  scripts/
    attach_pr_preview.py  PR 미리보기 파일을 PR 본문 첨부로 업로드
  engine/
    usage/           사용법 모션 시작 틀(index.html, motion-steps.js, click-fx.js, export.mjs, baseline.mjs, tools/, capture/, pages/cc/)
    explainer/       설명 모션 시작 틀(index.html, motion-steps.js, ui.css, CONTRACT.md, scenes/, tools/, 공용 파일)
  examples/
    usage-demo/      완성 예시: 가짜 메모 앱, 장면 3, 클릭, 입력, 화면 전환, 문제 박스, 터미널 단계
```

- 새 모션 폴더는 `engine/usage/`(사용법) 또는 `engine/explainer/`(설명)에서 복사해 시작한다. 복사 명령은 각 reference 문서에 있다.
- 완성 예시는 `examples/usage-demo/` 다. 서버를 띄워 열어 보면 엔진이 하는 일을 한눈에 볼 수 있다.
