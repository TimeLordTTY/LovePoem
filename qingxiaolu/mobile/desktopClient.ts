type DesktopSettings = { token: string; rootName: string };
function settings(): DesktopSettings | undefined { return (window as any).__QX_DESKTOP__; }
export function desktopAvailable() { return Boolean(settings()); }

export async function desktopRequest(operation: string, value: Record<string, unknown> = {}) {
  const config = settings();
  if (!config) throw new Error("请从情晓录电脑助手启动本地工作台，此网页没有启动 WPS 的权限。");
  const response = await fetch(`/desktop-api/${operation}`, { method: "POST",
    headers: { "content-type": "application/json", "x-qx-desktop": config.token }, body: JSON.stringify(value) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || "电脑文件操作失败，原内容仍保留"), { name: result.name || "Error" });
  return result;
}

function folderHandle(parts: string[], name: string): any {
  return { kind: "directory", name, desktopParts: parts,
    queryPermission: async () => "granted", requestPermission: async () => "granted",
    async getDirectoryHandle(child: string, options: { create?: boolean } = {}) {
      await desktopRequest("directory", { parts: [...parts, child], create: Boolean(options.create) });
      return folderHandle([...parts, child], child);
    },
    async getFileHandle(child: string, options: { create?: boolean } = {}) {
      const path = [...parts, child];
      await desktopRequest("file", { parts: path, create: Boolean(options.create) });
      return { kind: "file", name: child,
        async getFile() {
          const { base64 } = await desktopRequest("read", { parts: path });
          return new File([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], child);
        },
        async createWritable(options: { expectedHash?: string } = {}) {
          const { hash } = await desktopRequest("read", { parts: path });
          if (options.expectedHash !== undefined && options.expectedHash !== hash) throw new Error("Word 文件已有本地修改，未覆盖。请先读回后再继续。");
          let encoded: string | undefined;
          return { async write(blob: Blob) {
            encoded = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob);
            });
          }, async close() { if (encoded === undefined) throw new Error("文件内容尚未准备好"); return await desktopRequest("write", { parts: path, base64: encoded, expectedHash: hash }); }, async abort() {} };
        } };
    },
    async removeEntry(child: string) { await desktopRequest("remove", { parts: [...parts, child] }); },
    async *entries() {
      const { entries } = await desktopRequest("list", { parts });
      for (const entry of entries) yield [entry.name, entry.kind === "directory" ? folderHandle([...parts, entry.name], entry.name) :
        await this.getFileHandle(entry.name)];
    } };
}

export function desktopRootDirectory() { return settings() ? folderHandle([], settings()!.rootName) : null; }
