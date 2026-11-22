#!/bin/bash
# 사용: run.sh <scene.js> [출력 폴더(기본 ../pages · /tmp/scratch 면 rects.json 에 안 합침)]
# common.js + scene.js 를 aside repl 로 실행, 새로 생긴 PNG 를 출력 폴더로 복사, RECT/STYLE 줄을 rects.json 에 합침.
set -e
D=$(cd "$(dirname "$0")" && pwd); OUT=${2:-$D/../pages}; mkdir -p "$OUT"
MARK=$(mktemp); sleep 1
LOG=$(mktemp)
aside repl "$(cat "$D/common.js" "$1")" 2>&1 | tee "$LOG"
find ~/.aside/u/1/sessions -name 's[0-9]*.png' -newer "$MARK" -exec cp {} "$OUT"/ \;
[ "$OUT" = /tmp/scratch ] || python3 "$D/merge_rects.py" "$LOG" "$OUT/rects.json"
