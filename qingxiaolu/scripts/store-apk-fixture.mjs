import JSZip from "jszip";
import { readFile, writeFile } from "node:fs/promises";
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("请提供验收 APK 的输入与输出路径");
const archive = await JSZip.loadAsync(await readFile(input));
// Android 30 及以上要求 resources.arsc 不压缩；接收器不包含作者资料。
await writeFile(output, await archive.generateAsync({ type: "nodebuffer", compression: "STORE" }));
