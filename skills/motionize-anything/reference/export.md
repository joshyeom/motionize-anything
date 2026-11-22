# mp4 내보내기 (export.mjs)

## 실행

```bash
python3 -m http.server 8975 --bind 127.0.0.1 --directory <영상 폴더>   # 서버가 떠 있어야 함(127.0.0.1)
PORT=8975 NAME=<이름> node <영상 폴더>/export.mjs          # crf 16
PORT=8975 NAME=<이름> node <영상 폴더>/export.mjs 18       # crf 지정(첫 인자)
LIMIT=120 PORT=8975 NAME=<이름> node <영상 폴더>/export.mjs   # 앞 120프레임만(시험)
```

- 환경 변수는 `PORT`(기본 8947), `NAME`(기본 영상 폴더 이름), `LIMIT`(프레임 수 제한), `BASE_PATH`(서버 루트가 영상 폴더가 아닐 때), `PW_ROOT`(Playwright 위치)다. crf 는 첫 인자이고 기본 16이다.
- 결과는 영상 폴더에 `<NAME>-1080p60.mp4` 와 `<NAME>-1440p60.mp4` 로 저장된다. 시험(`LIMIT`) 출력도 같은 이름이라 진짜 파일을 덮어쓴다. 시험 뒤에는 전체를 다시 내보낸다.
- Playwright 를 찾는 방식과 설치는 `reference/usage.md` 의 Playwright 준비 절에 있다. 못 찾으면 `PW_ROOT=<설치 폴더>` 를 준다.
- ffmpeg 가 PATH에 있어야 한다.

## 어떻게 그리나

- 헤드리스 Chromium을 뷰포트 1920×1080, 픽셀 배율 2로 열어 `index.html?export=1` 을 로드하고 `window.ready` 와 `document.fonts.ready` 를 기다린다.
- 첫 줄에 `값 출처: <default|file|local>, 길이 <초>s, <프레임 수>프레임` 이 찍힌다. 출처가 `default` 가 아니면 motion-params.json 이 있다는 뜻이니 확인한다.
- 프레임 수 = `ceil(DURATION × 60)`. i번째 프레임은 `seek(i/60)` 후 `page.screenshot` 한 3840×2160 PNG이고, 300프레임마다 진행이 찍힌다.
- ffmpeg 하나가 PNG를 받아 두 크기로 Lanczos 축소한다: 1920×1080, 2560×1440(3840 기준 1.5배 초과 샘플링).
  - H.264 `libx264` crf 16 preset slow, yuv420p
  - BT.709 TV 범위 태그(colorspace, primaries, trc, range), `+faststart`
- 페이지 오류가 있으면 끝에 `페이지 오류` 로 찍는다.

## 확인

```bash
ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate,nb_frames,pix_fmt,color_space,color_transfer,color_primaries,color_range \
  -show_entries format=duration,size -of compact <파일>.mp4
mkdir -p /tmp/mf
for t in <클릭 순간 +0.15> <입력 중간> <전환 중간> <끝 직전>; do ffmpeg -v error -ss $t -i <파일>.mp4 -frames:v 1 /tmp/mf/f_$t.png; done
```

- 크기(1920×1080, 2560×1440), `60/1`, `nb_frames`, 길이(`DURATION` 과 같음), BT.709 태그 4개를 확인한다.
- 클릭 순간, 입력 중간, 전환 중간, 강조, 끝 프레임을 뽑아 한 장 시트로 붙여 눈으로 본다.
- 반복 이음매: 헤드리스에서 `seek(0)` 과 `seek((ceil(DURATION × 60) − 1) / 60)` 의 프레임이 픽셀로 같아야 한다(차이 0). 같지 않으면 마지막 단계(첫 화면과 같은 상태로 멈춤)와 첫 화면의 차이를 찾는다.
- 보고 전에 이름이 다른 옛 mp4 와 시험 출력은 지운다.
