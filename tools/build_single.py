#!/usr/bin/env python3
"""Baut die Seite als eine einzige HTML-Datei (alle CSS- und JS-Dateien eingebettet).

    python3 tools/build_single.py dist/werder.html

Gedacht für Hosts, die nur eine Datei annehmen, z. B. ein Claude-Artifact.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(out):
    read = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()
    html = read("index.html")
    css = read("assets/style.css").replace(
        ".wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; }",
        ".wrap { max-width: 1120px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }")
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    head = head.replace('<meta charset="utf-8">', "").replace('<meta name="viewport" content="width=device-width, initial-scale=1">', "")
    head = head.replace('<link rel="stylesheet" href="assets/style.css">', "<style>\n" + css + "\n</style>")
    title = re.search(r"<title>.*?</title>", head).group(0)
    head = title + '\n<meta name="claude:viewport-fit-sides" content="cover">\n' + head.replace(title, "").strip()
    body = re.sub(r'<script src="(assets/[^"]+\.js)"></script>', lambda m: "<script>\n" + read(m.group(1)) + "\n</script>", body)
    if 'src="assets' in body:
        sys.exit("Nicht eingebettete Datei gefunden")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(head + "\n" + body)
    print(f"{out}: {os.path.getsize(out) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "werder.html"))
