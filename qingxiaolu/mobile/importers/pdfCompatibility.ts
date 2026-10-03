// 旧 Android WebView 支持流读取，但尚未提供流的异步迭代接口。
export function installPdfStreamIterator(Stream = globalThis.ReadableStream) {
  if (!Stream || (Stream.prototype as any)[Symbol.asyncIterator]) return;
  Object.defineProperty(Stream.prototype, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* (this: ReadableStream<unknown>) {
      const reader = this.getReader();
      let completed = false;
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) { completed = true; return; }
          yield result.value;
        }
      } finally {
        try { if (!completed) await reader.cancel(); }
        finally { reader.releaseLock(); }
      }
    },
  });
}

// 图片解码在 worker 中也使用该接口；复制/调整长度后转移原缓冲区的所有权。
export function installPdfBufferTransfer(BufferType = globalThis.ArrayBuffer) {
  if (!BufferType || (BufferType.prototype as any).transferToFixedLength || typeof structuredClone !== "function") return;
  Object.defineProperty(BufferType.prototype, "transferToFixedLength", {
    configurable: true,
    writable: true,
    value: function (this: ArrayBuffer, length?: number) {
      const bytes = new Uint8Array(this); // 同时拒绝已分离的缓冲区。
      if (typeof length === "bigint") throw new TypeError("ArrayBuffer length must be a number");
      const requested = length === undefined ? bytes.byteLength : Number(length);
      const size = Number.isNaN(requested) ? 0 : Math.trunc(requested);
      if (!Number.isSafeInteger(size) || size < 0) throw new RangeError("Invalid ArrayBuffer length");
      if (size === bytes.byteLength) return structuredClone(this, { transfer: [this] });
      const result = new ArrayBuffer(size);
      new Uint8Array(result).set(bytes.subarray(0, size));
      structuredClone(this, { transfer: [this] });
      return result;
    },
  });
}
