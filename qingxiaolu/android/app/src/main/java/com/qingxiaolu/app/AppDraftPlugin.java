package com.qingxiaolu.app;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.PushbackInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

@CapacitorPlugin(name = "AppDraft")
public class AppDraftPlugin extends Plugin {
    @PluginMethod
    public void copy(PluginCall call) {
        JSObject result = new JSObject();
        result.put("copied", copyText(call.getString("title", "情晓录稿件"), call.getString("text", "")));
        call.resolve(result);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String target = call.getString("target", "");
        String title = call.getString("title", "情晓录稿件");
        String text = call.getString("text", "");
        JSArray images = call.getArray("images", new JSArray());
        final boolean copied = copyText(title, text);

        // 没有可打开的 QQ 时，不要求作者先开启无障碍权限。
        if ("QQ说说".equals(target) && getContext().getPackageManager().getLaunchIntentForPackage("com.tencent.mobileqq") == null) {
            JSObject result = new JSObject();
            result.put("opened", false); result.put("openedAs", "none"); result.put("copied", copied);
            call.resolve(result);
            return;
        }

        if ("QQ说说".equals(target) && !isAccessibilityEnabled()) {
            Intent settings = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { getContext().startActivity(settings); }
            catch (Exception error) { call.reject("无法打开无障碍设置，请从系统设置进入后重试。"); return; }
            JSObject result = new JSObject();
            result.put("opened", false);
            result.put("copied", copied);
            result.put("needsAccessibility", true);
            call.resolve(result);
            return;
        }
        if ("QQ说说".equals(target)) {
            getContext().getSharedPreferences("qx_share_assist", Context.MODE_PRIVATE).edit()
                .putLong("expiresAt", System.currentTimeMillis() + 120000)
                .putInt("step", 0)
                .putString("target", "qq")
                .putString("text", text)
                .apply();
        }
        if ("微信朋友圈".equals(target)) {
            getContext().getSharedPreferences("qx_share_assist", Context.MODE_PRIVATE).edit()
                .putLong("expiresAt", System.currentTimeMillis() + 120000)
                .putString("target", "wechat")
                .putString("text", text)
                .apply();
        }

        String packageName;
        switch (target) {
            case "QQ说说": packageName = "com.tencent.mobileqq"; break;
            case "微信朋友圈": packageName = "com.tencent.mm"; break;
            case "微博": packageName = "com.sina.weibo"; break;
            case "一言": packageName = "com.jhyan.yan"; break;
            default: packageName = "";
        }

        final String selectedPackage = packageName;
        final String selectedTarget = target;
        getBridge().executeOnMainThread(() -> new Thread(() -> {
            try {
                boolean appOnly = "QQ说说".equals(selectedTarget) || "一言".equals(selectedTarget);
                ImageBatch batch = appOnly ? new ImageBatch() : cacheImages(images);
                getBridge().executeOnMainThread(() -> {
                    String openedAs = appOnly ? (openAppWithoutWrongSharePanel(selectedPackage) ? "app" : "none")
                        : openShare(selectedPackage, title, text, batch.uris);
                    JSObject result = new JSObject();
                    result.put("opened", !"none".equals(openedAs));
                    result.put("openedAs", openedAs);
                    result.put("copied", copied);
                    result.put("requestedImages", images.length());
                    result.put("preparedImages", batch.uris.size());
                    result.put("failedImages", batch.failed);
                    result.put("omittedImages", batch.omitted);
                    call.resolve(result);
                });
            } catch (Exception error) { call.reject("无法准备转发内容，原稿仍保留，请重试。"); }
        }).start());
    }

    private boolean copyText(String title, String text) {
        try {
            ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) return false;
            clipboard.setPrimaryClip(ClipData.newPlainText(title, text));
            ClipData copied = clipboard.getPrimaryClip();
            return copied != null && copied.getItemCount() > 0 && text.contentEquals(copied.getItemAt(0).coerceToText(getContext()));
        } catch (Exception error) { return false; }
    }

    private boolean isAccessibilityEnabled() {
        String enabled = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        return enabled != null
            && enabled.contains(getContext().getPackageName())
            && enabled.contains("HistoryCaptureService");
    }

    private boolean openAppWithoutWrongSharePanel(String packageName) {
        try {
            Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch == null) return false;
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launch);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static class ImageBatch {
        final ArrayList<Uri> uris = new ArrayList<>();
        int failed = 0;
        int omitted = 0;
    }

    private ImageBatch cacheImages(JSArray images) {
        ImageBatch batch = new ImageBatch();
        File folder = new File(getContext().getCacheDir(), "shared-images");
        if (!folder.exists()) folder.mkdirs();
        int count = Math.min(images.length(), 9);
        batch.omitted = images.length() - count;
        for (int index = 0; index < count; index++) {
            File output = null;
            try {
                String source = images.getString(index);
                if (source.startsWith("data:")) {
                    String encoded = source.substring(source.indexOf(',') + 1);
                    String mime = source.substring(5, source.indexOf(';')).toLowerCase(java.util.Locale.ROOT);
                    try (InputStream input = new ByteArrayInputStream(Base64.decode(encoded, Base64.DEFAULT))) { output = writeImage(input, folder, mime); }
                } else if (source.startsWith("http://") || source.startsWith("https://")) {
                    HttpURLConnection connection = (HttpURLConnection) new URL(source).openConnection();
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.setRequestProperty("User-Agent", "Qingxiaolu/1.2");
                    try (InputStream input = connection.getInputStream()) { output = writeImage(input, folder, connection.getContentType()); }
                    finally { connection.disconnect(); }
                } else throw new IllegalArgumentException("Unsupported image source");
                batch.uris.add(FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", output));
            } catch (Exception error) { batch.failed++; if (output != null) output.delete(); }
        }
        return batch;
    }

    private File writeImage(InputStream source, File folder, String mime) throws Exception {
        try (PushbackInputStream input = new PushbackInputStream(source, 16)) {
            byte[] header = new byte[16]; int size = 0, read;
            while (size < header.length && (read = input.read(header, size, header.length - size)) > 0) size += read;
            String extension = null;
            if (size >= 8 && (header[0] & 255) == 137 && header[1] == 80 && header[2] == 78 && header[3] == 71 && header[4] == 13 && header[5] == 10 && header[6] == 26 && header[7] == 10) extension = ".png";
            else if (size >= 3 && (header[0] & 255) == 255 && (header[1] & 255) == 216 && (header[2] & 255) == 255) extension = ".jpg";
            else if (size >= 6 && header[0] == 71 && header[1] == 73 && header[2] == 70 && header[3] == 56 && (header[4] == 55 || header[4] == 57) && header[5] == 97) extension = ".gif";
            else if (size >= 12 && header[0] == 82 && header[1] == 73 && header[2] == 70 && header[3] == 70 && header[8] == 87 && header[9] == 69 && header[10] == 66 && header[11] == 80) extension = ".webp";
            else if (size >= 2 && header[0] == 66 && header[1] == 77) extension = ".bmp";
            if (size == 0) throw new IllegalArgumentException("Empty image");
            if (extension == null) {
                // 继续支持既有其他图片格式；未知格式保留原字节，不伪装成 JPEG。
                String type = mime == null ? "" : mime.split(";", 2)[0].trim().toLowerCase(java.util.Locale.ROOT);
                switch (type) {
                    case "image/avif": extension = ".avif"; break;
                    case "image/heic": extension = ".heic"; break;
                    case "image/heif": extension = ".heif"; break;
                    case "image/svg+xml": extension = ".svg"; break;
                    case "image/tiff": extension = ".tiff"; break;
                    case "image/x-icon": case "image/vnd.microsoft.icon": extension = ".ico"; break;
                    default: extension = ".img";
                }
            }
            input.unread(header, 0, size);
            // 保留原始字节，以真实格式命名，避免 PNG 等原图被标记成 JPEG。
            File output = File.createTempFile("share-", extension, folder);
            try (FileOutputStream stream = new FileOutputStream(output)) {
                byte[] buffer = new byte[8192]; int length;
                while ((length = input.read(buffer)) != -1) stream.write(buffer, 0, length);
            } catch (Exception error) { output.delete(); throw error; }
            return output;
        }
    }

    private String openShare(String packageName, String title, String text, ArrayList<Uri> images) {
        if (packageName.isEmpty()) return "none";
        try {
            Intent share = new Intent(images.size() > 1 ? Intent.ACTION_SEND_MULTIPLE : Intent.ACTION_SEND);
            share.setType(images.isEmpty() ? "text/plain" : "image/*");
            share.setPackage(packageName);
            share.putExtra(Intent.EXTRA_SUBJECT, title);
            share.putExtra(Intent.EXTRA_TEXT, text);
            if (images.size() > 1) share.putParcelableArrayListExtra(Intent.EXTRA_STREAM, images);
            else if (images.size() == 1) share.putExtra(Intent.EXTRA_STREAM, images.get(0));
            // 从当前界面启动每次分享，避免新任务复用旧页面而漏接下一批内容。
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(share);
            return "share";
        } catch (Exception ignored) {
            try {
                Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
                if (launch == null) return "none";
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(launch);
                return "app";
            } catch (Exception ignoredAgain) { return "none"; }
        }
    }
}
