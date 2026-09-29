from pathlib import Path
import json

from rapidocr_onnxruntime import RapidOCR


root = Path(r"C:\Users\houyx\Pictures")
output = Path(r"C:\Users\houyx\AppData\Local\Temp\qq-screenshots-ocr.json")
progress = Path(r"C:\Users\houyx\AppData\Local\Temp\qq-screenshots-ocr-progress.json")
files = sorted(root.glob("微信图片_202608031227*.jpg"), key=lambda path: int(path.stem.split("_")[-2]))
ocr = RapidOCR()
items = []

for index, path in enumerate(files, 1):
    result, _ = ocr(str(path))
    items.append({
        "index": index,
        "file": str(path),
        "text": "\n".join(entry[1] for entry in (result or [])),
    })
    progress.write_text(
        json.dumps({"done": index, "total": len(files)}, ensure_ascii=False),
        encoding="utf-8",
    )

output.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
