#!/usr/bin/env python3
# 사용: stitch.py <pages 폴더> <그림 이름> [머리줄 높이 CSS px=76]
# rects.json 의 <이름>.tiles(scrollY) 로 조각을 이어 붙인다. 첫 조각은 그대로, 나머지는 위 머리줄 높이만큼 자른다. 폭은 clientWidth 로 자른다.
import json, sys, os
from PIL import Image
d, name = sys.argv[1], sys.argv[2]; head = int(sys.argv[3]) if len(sys.argv) > 3 else 76
meta = json.load(open(os.path.join(d, 'rects.json')))[name]
W, H, tiles = meta['w'], meta['h'], meta['tiles']
out = Image.new('RGB', (W * 2, H * 2), 'white')
for i, t in enumerate(tiles):
    im = Image.open(os.path.join(d, t['name'] + '.png')).convert('RGB').crop((0, 0, W * 2, 1800))
    if i == 0: out.paste(im, (0, 0))
    else: out.paste(im.crop((0, head * 2, W * 2, 1800)), (0, (t['scrollY'] + head) * 2))
out.save(os.path.join(d, name + '.png'))
for t in tiles: os.remove(os.path.join(d, t['name'] + '.png'))
print(name, out.size)
