import type { ImportAdapter, ImportCandidate, ImportContext, ImportMode, ImportSource } from "./types";
import { nativeCaptureAvailable, readNativeCaptured } from "../nativeHistory";

abstract class PlatformImporter implements ImportAdapter {
  abstract readonly id: ImportSource;
  abstract readonly label: string;
  abstract readonly modes: readonly ImportMode[];
  abstract readonly description: string;

  async isAvailable(mode: ImportMode) {
    if (mode === "browser") return !/Android|iPhone|iPad/i.test(navigator.userAgent);
    if (mode === "file") return true;
    if (mode === "accessibility") return nativeCaptureAvailable();
    return false;
  }

  async collect(_context: ImportContext): Promise<ImportCandidate[]> {
    throw new Error("该采集方式需要在对应设备工具中启动");
  }
}

export class WeiboImporter extends PlatformImporter {
  readonly id = "weibo" as const;
  readonly label = "微博";
  readonly modes = ["browser", "accessibility", "ocr", "file"] as const;
  readonly description = "电脑浏览器登录后采集发布时间、正文、图片和原始链接";
  async collect(context: ImportContext) {
    if (context.mode === "accessibility") return readNativeCaptured(this.id);
    return super.collect(context);
  }
}

export class QQZoneImporter extends PlatformImporter {
  readonly id = "qqzone" as const;
  readonly label = "QQ 空间";
  readonly modes = ["browser", "accessibility", "ocr", "file"] as const;
  readonly description = "电脑网页辅助采集说说和日志";
  async collect(context: ImportContext) {
    if (context.mode === "accessibility") return readNativeCaptured(this.id);
    return super.collect(context);
  }
}

export class WechatMomentsImporter extends PlatformImporter {
  readonly id = "wechat" as const;
  readonly label = "微信朋友圈";
  readonly modes = ["root", "accessibility", "ocr", "file"] as const;
  readonly description = "Root、本机辅助浏览或 OCR，一次性采集自己的朋友圈";
  async collect(context: ImportContext) {
    if (context.mode === "accessibility") return readNativeCaptured(this.id);
    return super.collect(context);
  }
}

export class YiyanImporter extends PlatformImporter {
  readonly id = "yiyan" as const;
  readonly label = "一言";
  readonly modes = ["root", "accessibility", "ocr", "file"] as const;
  readonly description = "Root、本地文件或手机辅助浏览采集";
  async collect(context: ImportContext) {
    if (context.mode === "accessibility") return readNativeCaptured(this.id);
    return super.collect(context);
  }
}
