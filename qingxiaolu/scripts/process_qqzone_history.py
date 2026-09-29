from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path


CHINA = timezone(timedelta(hours=8))


def parse_date(raw: str) -> str:
    match = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", raw or "")
    if not match:
        return ""
    year, month, day = map(int, match.groups())
    return datetime(year, month, day, 12, 0, tzinfo=CHINA).isoformat()


def download(url: str, output_dir: Path) -> tuple[str, str]:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:40]
    target = output_dir / f"{digest}.jpg"
    if not target.exists() or target.stat().st_size < 100:
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://user.qzone.qq.com/",
            },
        )
        with urllib.request.urlopen(request, timeout=40) as response:
            target.write_bytes(response.read())
    return url, f"/qingxiaolu/imports/qqzone/{target.name}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("image_dir", type=Path)
    args = parser.parse_args()

    rows = json.loads(args.input.read_text(encoding="utf-8"))
    unique_urls = sorted({url for row in rows for url in row.get("images", []) if url})
    args.image_dir.mkdir(parents=True, exist_ok=True)
    image_map: dict[str, str] = {}
    failures: list[dict[str, str]] = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(download, url, args.image_dir): url for url in unique_urls}
        for future in as_completed(futures):
            try:
                remote, local = future.result()
                image_map[remote] = local
            except Exception as exc:
                failures.append({"url": futures[future], "error": str(exc)})

    seen: set[str] = set()
    candidates = []
    for row in rows:
        published = parse_date(row.get("rawDate", ""))
        original = row.get("originalUrl", "")
        key = original or f"{published}\n{row.get('text', '')}\n{row.get('images', [])}"
        if key in seen or not published:
            continue
        seen.add(key)
        text = row.get("text", "").strip()
        candidates.append({
            "source": "qqzone",
            "sourceLabel": "QQ空间",
            "title": "",
            "text": text,
            "publishedAt": published,
            "images": [image_map.get(url, url) for url in row.get("images", [])],
            "originalUrl": original,
            "rawDate": row.get("rawDate", ""),
            "needsFullText": bool(row.get("hasMore")),
            "page": row.get("page"),
        })

    candidates.sort(key=lambda item: item["publishedAt"], reverse=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
    report = {
        "rows": len(rows),
        "candidates": len(candidates),
        "uniqueImages": len(unique_urls),
        "downloadedImages": len(image_map),
        "imageFailures": failures,
        "needsFullText": sum(1 for item in candidates if item["needsFullText"]),
        "from": candidates[-1]["publishedAt"] if candidates else "",
        "to": candidates[0]["publishedAt"] if candidates else "",
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
