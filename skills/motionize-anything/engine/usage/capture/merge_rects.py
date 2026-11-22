#!/usr/bin/env python3
# 사용: merge_rects.py <log> <rects.json>  — 로그의 RECT/STYLE/NOTE 줄을 rects.json 에 합친다.
import json, sys, os
log, out = sys.argv[1], sys.argv[2]
d = json.load(open(out)) if os.path.exists(out) else {}
d.setdefault('styles', {}); d.setdefault('_notes', {})
for line in open(log, encoding='utf-8'):
    for kind in ('RECT ', 'STYLE ', 'NOTE ', 'SIZE '):
        if line.startswith(kind):
            _, name, js = line.rstrip('\n').split(' ', 2) if kind != 'NOTE ' else (None, *line[5:].rstrip('\n').split(' ', 1))
            v = json.loads(js) if kind != 'NOTE ' else js
            if kind == 'RECT ':
                e = d.setdefault(name, {'w': 1440, 'h': 900})
                e.setdefault('rects', {}).update(v)
            elif kind == 'SIZE ':
                d.setdefault(name, {}).update(v)
            elif kind == 'STYLE ':
                d['styles'].setdefault(name, {}).update(v)
            else:
                try: v = json.loads(v)
                except Exception: pass
                d['_notes'][name] = v
json.dump(d, open(out, 'w'), ensure_ascii=False, indent=1)
