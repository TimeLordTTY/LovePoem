import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|<u>.*?<\/u>)/g).map((part, index) =>
    part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> :
      part.startsWith("*") ? <em key={index}>{part.slice(1, -1)}</em> :
        part.startsWith("<u>") ? <u key={index}>{part.slice(3, -4)}</u> : part);
}

// 只渲染支持的格式，正文中的 HTML 始终作为文字处理。
export default function WritingPreview({ text }: { text: string }) {
  return <article className="writing-preview">{text.split("\n").map((line, index) => {
    if (line === "---") return <hr key={index} />;
    if (line.startsWith("### ")) return <h3 key={index}>{inline(line.slice(4))}</h3>;
    if (line.startsWith("## ")) return <h2 key={index}>{inline(line.slice(3))}</h2>;
    if (line.startsWith("# ")) return <h1 key={index}>{inline(line.slice(2))}</h1>;
    if (line.startsWith("> ")) return <blockquote key={index}>{inline(line.slice(2))}</blockquote>;
    return <p key={index}>{line.startsWith("- ") ? <>• {inline(line.slice(2))}</> : inline(line || "\u00a0")}</p>;
  })}</article>;
}
