# PR 미리보기 (움직이는 SVG)

## 언제 쓰나

- 사용자가 그 PR에 미리보기를 추가해 달라고 할 때만 만든다. 모든 PR의 기본값이 아니다.
- 요청이 없으면 만들지 않는다.
- PR을 만들거나 고칠 때 미리보기를 넣을지 묻거나 제안하지 않는다.
- 요청을 받으면 확인 질문 없이 만들고, 업로드한 뒤 PR 주소와 확인 결과만 보고한다.
- 사용법 모션의 단계마다 사용자 확인은 PR 미리보기에 적용하지 않는다.

## 목적

리뷰어가 글을 읽지 않고 그림만 보고도 무엇을 하는 변경인지 안다.

## 형식

- SVG 960×540, CSS `@keyframes` 만 쓴다. 모든 요소가 같은 주기로 12초마다 `infinite` 반복한다.
- 금지: JavaScript, `<foreignObject>`, 외부 글꼴, 외부 이미지.
  - GitHub 가 SVG 를 `<img>` 로 보여 주므로 스크립트와 외부 자료는 동작하지 않는다.
- 글꼴은 시스템 글꼴 목록만 쓴다.
  - 본문: `-apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif`
  - 코드: `'SF Mono', Menlo, Consolas, monospace`
- 크기는 50KB 안팎으로 한다.
- 장면은 2개로 한다. 하나는 무엇을 했는지(터미널이나 화면), 하나는 결과다.
- 아래 자막 띠에 장면마다 한 문장을 쓴다.
- 색은 프로젝트의 디자인 색을 쓴다. 정해진 색이 없으면 흰 바탕, 진한 글자(#131416), 파랑 강조(#1F66F1) 몇 가지만 쓴다.
- SVG 가 재생되지 않을 때만 GIF 로 바꾼다.

## 만든 위치

- 레포 밖 `/tmp/<작업>-preview/` 에 만든다.
- 레포에 커밋하지 않는다. `attach_pr_preview.py` 는 레포 안 파일을 거절한다.

## 프레임 확인

SVG 와 같은 폴더에 아래 HTML 을 두고 `python3 -m http.server` 로 띄운 뒤 Aside 로 연다.
`window.freeze()` 를 실행하고 화면을 찍으면 iframe 마다 지정한 초에서 멈춘 모습이 나온다.

```html
<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; display: grid; grid-template-columns: repeat(2, 480px); gap: 8px; background: #f2f4f6; }
  .cell { width: 480px; height: 270px; overflow: hidden; }
  iframe { width: 960px; height: 540px; border: 0; transform: scale(.5); transform-origin: 0 0; }
</style>
<div class="cell"><iframe src="preview.svg" data-t="1"></iframe></div>
<div class="cell"><iframe src="preview.svg" data-t="3"></iframe></div>
<div class="cell"><iframe src="preview.svg" data-t="5"></iframe></div>
<div class="cell"><iframe src="preview.svg" data-t="7"></iframe></div>
<div class="cell"><iframe src="preview.svg" data-t="9"></iframe></div>
<div class="cell"><iframe src="preview.svg" data-t="11"></iframe></div>
<script>
  window.freeze = () => {
    for (const f of document.querySelectorAll('iframe'))
      for (const a of f.contentDocument.getAnimations()) {
        a.pause();
        a.currentTime = Number(f.dataset.t) * 1000;
      }
  };
</script>
```

## 확인 기준

이전에 PR 미리보기에서 고친 것들이다.

- 결과 줄(주소, 비밀번호)은 장면이 바뀌기 전에 2초 이상 보인다.
- 자막이 "아래 주소"를 가리키면 그 주소가 화면에 있다.
- 실제 제품 헤더와 다른 가짜 로고를 그리지 않는다.
- 타자 효과의 덮개와 글자 폭이 맞는다.

## 업로드

```bash
python3 <스킬 폴더>/scripts/attach_pr_preview.py --pr 123 \
  /tmp/archive-upload-preview/archive-upload-preview.svg \
  --alt "archive-upload 미리보기"
```

- `--repo <소유자>/<저장소>` 를 생략하면 현재 폴더의 GitHub 저장소(`gh repo view`)를 쓴다.
- 필요한 것: Aside 가 GitHub 에 로그인되어 있고, `gh` 가 PR 을 고칠 수 있다.
- 동작: PR 화면의 댓글 입력란에 파일을 업로드해 첨부 주소를 받고, 댓글은 등록하지 않고 입력란을 비운다.
- 본문: `## 미리보기` 절이 있으면 그 절만 바꾸고, 없으면 본문 맨 위에 추가한다.
- `--no-body` 를 주면 본문은 고치지 않고 주소만 출력한다.
- `--self-test` 는 네트워크 없이 본문 바꾸기와 주소 짝짓기를 확인한다.

업로드한 뒤 PR 화면에서 확인한다.

- 이미지가 뜬다(`naturalWidth > 0`).
- 시간에 따라 바뀐다(몇 초 간격으로 찍은 캡처가 서로 다르다).

## 남는 것

- 첨부는 GitHub 첨부 저장소에만 있고 레포에는 파일이 없다.
- 비공개 레포라 로그인하지 않으면 404 가 난다.
- 지우려면 본문에서 그 줄을 제외하면 된다. 첨부 파일 자체는 남는다.
