import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "情晓录｜多题材创作与同步 App",
  description: "支持小说、随笔日记、诗歌、札记等创作项目，提供双端写作、资料管理、历史内容同步、AI 创作助手和指定网站上传。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
