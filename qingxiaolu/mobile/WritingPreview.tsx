import { useId, type ReactNode } from "react";

function inline(text: string, notes: Map<string, string>, prefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|<u>.*?<\/u>|\[\^[^\]]+\])/g).map((part, index) =>
    part.startsWith("[^") && notes.has(part.slice(2, -1)) ? <sup key={index}><a href={`#${prefix}-${encodeURIComponent(part.slice(2, -1))}`}>{part.slice(2, -1)}</a></sup> :
    part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> :
      part.startsWith("*") ? <em key={index}>{part.slice(1, -1)}</em> :
        part.startsWith("<u>") ? <u key={index}>{part.slice(3, -4)}</u> : part);
}

// 只渲染支持的格式，正文中的 HTML 始终作为文字处理。
export default function WritingPreview({ text }: { text: string }) {
  const prefix = useId(), notes = new Map<string, string>();
  for (const line of text.split("\n")) { const note = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/); if (note) notes.set(note[1], note[2]); }
  const render = (line: string) => inline(line, notes, prefix);
  return <article className="writing-preview">{text.split("\n").map((line, index) => {
    if (/^\[\^[^\]]+\]:/.test(line)) return null;
    if (line === "---") return <hr key={index} />;
    if (line.startsWith("### ")) return <h3 key={index}>{render(line.slice(4))}</h3>;
    if (line.startsWith("## ")) return <h2 key={index}>{render(line.slice(3))}</h2>;
    if (line.startsWith("# ")) return <h1 key={index}>{render(line.slice(2))}</h1>;
    if (line.startsWith("> ")) return <blockquote key={index}>{render(line.slice(2))}</blockquote>;
    return <p key={index}>{line.startsWith("- ") ? <>• {render(line.slice(2))}</> : render(line || "\u00a0")}</p>;
  })}{!!notes.size && <section className="writing-footnotes"><h2>注释</h2>{[...notes].map(([id, content]) =>
    <p key={id} id={`${prefix}-${encodeURIComponent(id)}`}><b>{id}：</b>{inline(content, new Map(), prefix)}</p>)}</section>}</article>;
}
