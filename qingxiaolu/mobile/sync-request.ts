// 每个网络请求独立计时，长文和多图的正常分批同步没有总时长限制。
export async function withSyncTimeout<T>(request: (signal: AbortSignal) => Promise<T>, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("同步等待超时，尚未收到云端确认。待同步内容仍在本机，请稍后重试"));
      controller.abort();
    }, timeoutMs);
  });
  try { return await Promise.race([request(controller.signal), timeout]); }
  finally { clearTimeout(timer); }
}
