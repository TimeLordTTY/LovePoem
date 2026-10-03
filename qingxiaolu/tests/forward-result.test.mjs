import { test } from "node:test";
import { strict as assert } from "node:assert";
import { forwardResultMessage } from "../work/writing-tests/forwardResult.mjs";

test("拒绝复制或打不开目标时不报告已复制，允许重试", () => {
  const result = forwardResultMessage("微博", { opened: false, copied: false });
  assert.equal(result.complete, false); assert.match(result.message, /未确认正文复制成功/);
  assert.doesNotMatch(result.message, /正文已复制/); assert.match(result.message, /原稿仍保留/);
});
test("原生复制与浏览器复制各自的成功结果可以用于提示", () => {
  for (const browserCopied of [false, true]) {
    const result = forwardResultMessage("微博", { opened: true, copied: !browserCopied, openedAs: "share" }, browserCopied);
    assert.equal(result.complete, true); assert.match(result.message, /正文已复制/);
  }
});
test("打开应用与交给分享页区分，手动添加图片不冒充已上传", () => {
  const app = forwardResultMessage("一言", { opened: true, copied: true, openedAs: "app", requestedImages: 2 });
  assert.match(app.message, /图片需要手动添加/); assert.doesNotMatch(app.message, /已交给分享页|已上传/);
  const share = forwardResultMessage("微博", { opened: true, copied: true, openedAs: "share", preparedImages: 2 });
  assert.match(share.message, /已交给分享页 2 张图片/); assert.match(share.message, /核对后发布/);
});
test("图片准备失败或超过既有数量上限时不关闭重试入口", () => {
  const result = forwardResultMessage("微博", { opened: true, copied: true, openedAs: "share", preparedImages: 8, failedImages: 1, omittedImages: 2 });
  assert.equal(result.complete, false); assert.match(result.message, /1 张图片未能准备/);
  assert.match(result.message, /另 2 张原图仍保留/);
});
test("无障碍设置未开时保留操作入口，旧版本结果没有图片信息不虚构图片交付", () => {
  assert.equal(forwardResultMessage("QQ说说", { opened: false, copied: true, needsAccessibility: true }).complete, false);
  assert.doesNotMatch(forwardResultMessage("微博", { opened: true, copied: true }).message, /图片已|已交给分享页/);
});
