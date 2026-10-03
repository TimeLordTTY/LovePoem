import type { ForwardResult } from "./nativeDraft";

export function forwardResultMessage(target: string, result: ForwardResult, browserCopied = false) {
  const copied = result.copied || browserCopied;
  const copyMessage = copied ? "正文已复制" : "未确认正文复制成功，请手动复制";
  if (result.needsAccessibility) return { complete: false, message: `${copyMessage}。请在系统无障碍设置中开启“情晓录历史采集”，返回后再点一次QQ说说。` };
  if (!result.opened) return { complete: false, message: `没有成功打开${target}，${copyMessage}。请确认已安装该 App 后重试，原稿仍保留。` };
  const parts = [`已打开${target}${result.openedAs === "share" ? "分享页" : ""}，${copyMessage}`];
  const prepared = Number(result.preparedImages || 0), failed = Number(result.failedImages || 0), omitted = Number(result.omittedImages || 0);
  if (result.openedAs === "share" && prepared) parts.push(`已交给分享页 ${prepared} 张图片，请在目标 App 核对后发布`);
  if (result.openedAs === "app") parts.push(`请核对目标 App 草稿${result.requestedImages ? "，图片需要手动添加" : ""}`);
  if (failed) parts.push(`${failed} 张图片未能准备，可重试；原图仍保留`);
  if (omitted) parts.push(`本次最多准备前 9 张图片，另 ${omitted} 张原图仍保留，请分批转发`);
  return { complete: !failed && !omitted && copied, message: parts.join("。") };
}
