#!/usr/bin/env python3
"""PR 미리보기 파일(svg, gif, png)을 PR 본문 첨부로 올린다. 레포에는 아무것도 커밋하지 않는다.

사용:
  attach_pr_preview.py --pr N [--repo OWNER/REPO] FILE [FILE ...] [--alt "설명" ...] [--no-body]
  attach_pr_preview.py --self-test

업로드는 Aside 브라우저(사용자 GitHub 로그인 상태)로 한다. PR 화면의 댓글 입력란에 파일을 넣으면
입력란에 첨부 주소가 생기고, 그 값을 읽은 뒤 댓글은 등록하지 않고 입력란을 비운다.
"""
import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ALLOWED_EXT = {".svg", ".gif", ".png"}
MAX_BYTES = 10 * 1024 * 1024
SECTION_TITLE = "## 미리보기"
ASSET_MARK = "user-attachments/assets/"

JS_TEMPLATE = r"""
const files = CFG.files;
await fs.mkdir('./artifacts', {recursive: true});
for (const f of files) await fs.writeFile('./artifacts/' + f.name, Buffer.from(f.b64, 'base64'));
const count = (s) => s.split('user-attachments/assets/').length - 1;
let before = '', value = '', cleared = false, error = null, ta = null;
const fresh = (s) => (s.startsWith(before) ? s.slice(before.length) : s);
const tab = await openTab(CFG.url);
try {
  await sleep(5000);
  ta = tab.locator('#new_comment_field');
  await ta.scrollIntoViewIfNeeded();
  before = await ta.inputValue();
  await tab.locator('#fc-new_comment_field').setInputFiles(files.map((f) => './artifacts/' + f.name));
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    value = await ta.inputValue();
    if (count(fresh(value)) >= files.length && !value.includes('Uploading')) break;
  }
} catch (e) {
  error = String(e);
} finally {
  try { if (ta) { await ta.fill(before); await ta.dispatchEvent('input'); cleared = true; } } catch (e) {}
  try { await closeTab(tab); } catch (e) {}
}
console.log('RESULT' + JSON.stringify({before, value, cleared, error}));
"""


def die(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def is_inside_repo(path):
    """파일이 어떤 git 레포 작업 트리 안에 있으면 True."""
    folder = os.path.dirname(os.path.realpath(path))
    result = subprocess.run(
        ["git", "-C", folder, "rev-parse", "--show-toplevel"],
        capture_output=True, text=True,
    )
    return result.returncode == 0 and bool(result.stdout.strip())


def check_file(path):
    if not os.path.isfile(path):
        die(f"파일이 없습니다: {path}")
    if os.path.splitext(path)[1].lower() not in ALLOWED_EXT:
        die(f"svg, gif, png 만 올릴 수 있습니다: {path}")
    if os.path.getsize(path) > MAX_BYTES:
        die(f"10MB 를 넘습니다: {path}")
    if is_inside_repo(path):
        die(f"미리보기 파일은 레포 밖(/tmp 등)에 두세요. 레포에 커밋하지 않습니다: {path}")


def file_stem(path):
    return os.path.splitext(os.path.basename(path))[0]


def build_js(repo, pr, paths):
    files = []
    for path in paths:
        with open(path, "rb") as handle:
            files.append({"name": os.path.basename(path), "b64": base64.b64encode(handle.read()).decode()})
    url = f"https://github.com/{repo}/pull/{pr}"
    return "const CFG = " + json.dumps({"files": files, "url": url}) + ";\n" + JS_TEMPLATE


def pair_urls(value, stems):
    """입력란 값에서 alt(파일 이름 확장자 뺀 것)와 주소를 짝짓는다. 같은 alt 가 여럿이면 마지막 주소. 못 찾으면 ValueError."""
    found = {}
    for tag in re.findall(r"<img\b[^>]*>", value):
        alt = re.search(r'\balt="([^"]*)"', tag)
        src = re.search(r'\bsrc="([^"]*' + re.escape(ASSET_MARK) + r'[^"]*)"', tag)
        if alt and src:
            found[alt.group(1)] = src.group(1)
    for alt, src in re.findall(r"!\[([^\]]*)\]\((https://[^)\s]*" + re.escape(ASSET_MARK) + r"[^)\s]*)\)", value):
        found[alt] = src
    missing = [stem for stem in stems if stem not in found]
    if missing:
        raise ValueError("첨부 주소를 찾지 못한 파일: " + ", ".join(missing))
    return {stem: found[stem] for stem in stems}


def new_part(before, value):
    """업로드 전 입력란 값(before)을 앞에서 뺀 새 부분. 앞부분이 다르면 전체."""
    return value[len(before):] if value.startswith(before) else value


def update_body(body, section):
    """본문의 미리보기 절을 바꾸고, 없으면 맨 위에 넣는다. 나머지 글자는 그대로."""
    lines = body.splitlines(keepends=True)
    start = next((i for i, line in enumerate(lines) if line.strip() == SECTION_TITLE), None)
    if start is None:
        return section + body
    end = next((i for i in range(start + 1, len(lines)) if re.match(r"#{1,6}\s", lines[i])), len(lines))
    tail = "".join(lines[end:])
    if not tail:
        section = section.rstrip("\n") + "\n"
    return "".join(lines[:start]) + section + tail


def make_section(items):
    return SECTION_TITLE + "\n\n" + "".join(f"![{alt}]({url})\n" for alt, url in items) + "\n"


def upload(repo, pr, paths):
    if not shutil.which("aside"):
        die("aside 명령이 없습니다. Aside 브라우저 CLI 를 먼저 설치하세요.")
    script = tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8")
    try:
        script.write(build_js(repo, pr, paths))
        script.close()
        run = subprocess.run(["aside", "repl", "--file", script.name], capture_output=True, text=True, timeout=240)
    finally:
        os.unlink(script.name)
    lines = [line for line in run.stdout.splitlines() if line.startswith("RESULT")]
    if not lines:
        die("Aside 실행 결과를 읽지 못했습니다.\n" + (run.stdout + run.stderr)[-800:])
    result = json.loads(lines[-1][len("RESULT"):])
    if result.get("error"):
        die("Aside 업로드 중 오류: " + result["error"])
    if not result.get("cleared"):
        print("경고: 입력란을 비우지 못했습니다. PR 화면의 댓글 입력란을 직접 비우세요.", file=sys.stderr)
    return new_part(result.get("before", ""), result["value"])


def edit_body(repo, pr, section):
    if not shutil.which("gh"):
        die("gh 명령이 없습니다. GitHub CLI 를 먼저 설치하세요.")
    view = subprocess.run(
        ["gh", "pr", "view", str(pr), "--repo", repo, "--json", "body", "-q", ".body"],
        capture_output=True, text=True,
    )
    if view.returncode != 0:
        die("PR 본문을 받지 못했습니다: " + view.stderr.strip())
    body = view.stdout[:-1] if view.stdout.endswith("\n") else view.stdout
    body_file = tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8")
    try:
        body_file.write(update_body(body, section))
        body_file.close()
        edit = subprocess.run(
            ["gh", "pr", "edit", str(pr), "--repo", repo, "--body-file", body_file.name],
            capture_output=True, text=True,
        )
    finally:
        os.unlink(body_file.name)
    if edit.returncode != 0:
        die("PR 본문을 고치지 못했습니다: " + edit.stderr.strip())


def self_test():
    items = [("a", "https://github.com/user-attachments/assets/1"), ("b", "https://github.com/user-attachments/assets/2")]
    section = make_section(items)
    assert section == "## 미리보기\n\n![a](https://github.com/user-attachments/assets/1)\n![b](https://github.com/user-attachments/assets/2)\n\n"

    # 미리보기 절이 없으면 맨 위에 넣는다
    body = "## 작업 주제\n- 내용\n\n## 체크리스트\n- [x] a"
    assert update_body(body, section) == section + body

    # 있으면 그 절만 바꾸고 뒤 절은 그대로
    old = "## 작업 주제\n- 내용\n\n## 미리보기\n\n![old](https://x/old)\n\n## 체크리스트\n- [x] a"
    expected = "## 작업 주제\n- 내용\n\n" + section + "## 체크리스트\n- [x] a"
    assert update_body(old, section) == expected

    # 미리보기 절이 마지막 절
    last = "## 작업 주제\n- 내용\n\n## 미리보기\n\n![old](https://x/old)\n"
    assert update_body(last, section) == "## 작업 주제\n- 내용\n\n" + section.rstrip("\n") + "\n"
    assert update_body(update_body(last, section), section) == update_body(last, section)

    # 입력란 값에서 alt 와 주소 짝짓기(순서가 달라도 alt 로 짝짓는다)
    value = (
        '<img width="960" height="540" alt="second" src="https://github.com/user-attachments/assets/bbb" />\n'
        '<img width="960" height="540" alt="first" src="https://github.com/user-attachments/assets/aaa" />\n'
    )
    assert pair_urls(value, ["first", "second"]) == {
        "first": "https://github.com/user-attachments/assets/aaa",
        "second": "https://github.com/user-attachments/assets/bbb",
    }
    try:
        pair_urls(value, ["first", "third"])
        raise AssertionError("없는 alt 는 실패해야 한다")
    except ValueError:
        pass

    # 미리보기 절 다음이 다른 단계 제목이어도 뒤 본문을 보존
    other = "## 미리보기\n옛 이미지\n# 배포\n배포 절차"
    assert update_body(other, section).endswith("# 배포\n배포 절차")
    assert "옛 이미지" not in update_body(other, section)

    # 입력란에 같은 alt 옛 링크가 남아 있어도 새 주소를 고른다
    before = "![a](https://github.com/user-attachments/assets/old)\n"
    after = before + "![a](https://github.com/user-attachments/assets/new)\n"
    assert new_part(before, after) == "![a](https://github.com/user-attachments/assets/new)\n"
    assert pair_urls(new_part(before, after), ["a"]) == {"a": "https://github.com/user-attachments/assets/new"}
    assert pair_urls(after, ["a"]) == {"a": "https://github.com/user-attachments/assets/new"}
    assert new_part("다른", after) == after

    # 파일 이름에 자리표시 글자가 있어도 CFG 한 줄로 안전하게 들어간다
    with tempfile.TemporaryDirectory() as folder:
        odd = os.path.join(folder, "__URL__.svg")
        open(odd, "w").close()
        js = build_js("o/r", 1, [odd])
        assert js.count("const CFG = ") == 1
        cfg = json.loads(js.split("\n", 1)[0][len("const CFG = "):-1])
        assert cfg["files"][0]["name"] == "__URL__.svg"

    # 레포 안 파일 거부
    with tempfile.TemporaryDirectory() as repo_dir:
        subprocess.run(["git", "init", "-q", repo_dir], check=True)
        inside = os.path.join(repo_dir, "p.svg")
        open(inside, "w").close()
        assert is_inside_repo(inside) is True
    with tempfile.TemporaryDirectory() as folder:
        outside = os.path.join(folder, "p.svg")
        open(outside, "w").close()
        assert is_inside_repo(outside) is False
    print("self-test ok")


def detect_repo():
    """현재 폴더의 GitHub 저장소(OWNER/REPO)를 gh 로 알아낸다."""
    if not shutil.which("gh"):
        die("gh 명령이 없습니다. GitHub CLI 를 먼저 설치하거나 --repo 를 주세요.")
    view = subprocess.run(["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], capture_output=True, text=True)
    if view.returncode != 0 or not view.stdout.strip():
        die("저장소를 알아내지 못했습니다. --repo OWNER/REPO 를 주세요.")
    return view.stdout.strip()


def main():
    parser = argparse.ArgumentParser(description="PR 본문에 미리보기 파일을 첨부한다.")
    parser.add_argument("--pr", type=int)
    parser.add_argument("--repo", default=None, help="OWNER/REPO. 생략하면 현재 폴더의 저장소(gh repo view)")
    parser.add_argument("--alt", action="append", default=[], help="파일마다 설명(파일 수와 같거나 생략)")
    parser.add_argument("--no-body", action="store_true", help="본문은 고치지 않고 주소만 출력")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("files", nargs="*")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if not args.pr or not args.files:
        parser.error("--pr 과 FILE 이 필요합니다.")
    if args.alt and len(args.alt) != len(args.files):
        parser.error("--alt 개수는 FILE 개수와 같아야 합니다.")
    stems = [file_stem(path) for path in args.files]
    if len(set(stems)) != len(stems):
        die("파일 이름(확장자 뺀 것)이 겹칩니다. 이름을 다르게 하세요.")
    for path in args.files:
        check_file(path)

    repo = args.repo or detect_repo()
    value = upload(repo, args.pr, args.files)
    try:
        urls = pair_urls(value, stems)
    except ValueError as error:
        die(f"{error}\n입력란 값: {value[-500:]}")
    attachments = [
        {"file": path, "alt": args.alt[i] if args.alt else stem, "url": urls[stem]}
        for i, (path, stem) in enumerate(zip(args.files, stems))
    ]
    if not args.no_body:
        edit_body(repo, args.pr, make_section([(item["alt"], item["url"]) for item in attachments]))
    print(json.dumps({"ok": True, "pr": args.pr, "attachments": attachments, "bodyUpdated": not args.no_body},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
