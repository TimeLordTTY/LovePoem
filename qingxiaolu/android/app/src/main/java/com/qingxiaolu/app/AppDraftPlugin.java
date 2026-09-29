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
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

@CapacitorPlugin(name = "AppDraft")
public class AppDraftPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String target = call.getString("target", "");
        String title = call.getString("title", "情晓录稿件");
        String text = call.getString("text", "");
        JSArray images = call.getArray("images", new JSArray());
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText(title, text));

        if ("QQ说说".equals(target) && !isAccessibilityEnabled()) {
            Intent settings = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject result = new JSObject();
            result.put("opened", false);
            result.put("copied", true);
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
            ArrayList<Uri> imageUris = cacheImages(images);
            boolean opened = ("QQ说说".equals(selectedTarget) || "一言".equals(selectedTarget))
                ? openAppWithoutWrongSharePanel(selectedPackage)
                : openShare(selectedPackage, title, text, imageUris);
            JSObject result = new JSObject();
            result.put("opened", opened);
            result.put("copied", true);
            call.resolve(result);
        }).start());
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

    private ArrayList<Uri> cacheImages(JSArray images) {
        ArrayList<Uri> uris = new ArrayList<>();
        File folder = new File(getContext().getCacheDir(), "shared-images");
        if (!folder.exists()) folder.mkdirs();
        int count = Math.min(images.length(), 9);
        for (int index = 0; index < count; index++) {
            try {
                String source = images.getString(index);
                File output = new File(folder, "share-" + System.currentTimeMillis() + "-" + index + ".jpg");
                if (source.startsWith("data:")) {
                    String encoded = source.substring(source.indexOf(',') + 1);
                    try (FileOutputStream stream = new FileOutputStream(output)) {
                        stream.write(Base64.decode(encoded, Base64.DEFAULT));
                    }
                } else if (source.startsWith("http://") || source.startsWith("https://")) {
                    HttpURLConnection connection = (HttpURLConnection) new URL(source).openConnection();
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.setRequestProperty("User-Agent", "Qingxiaolu/1.2");
                    try (InputStream input = connection.getInputStream(); FileOutputStream outputStream = new FileOutputStream(output)) {
                        byte[] buffer = new byte[8192];
                        int length;
                        while ((length = input.read(buffer)) > 0) outputStream.write(buffer, 0, length);
                    } finally { connection.disconnect(); }
                } else continue;
                uris.add(FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", output));
            } catch (Exception ignored) { }
        }
        return uris;
    }

    private boolean openShare(String packageName, String title, String text, ArrayList<Uri> images) {
        if (packageName.isEmpty()) return false;
        try {
            Intent share = new Intent(images.size() > 1 ? Intent.ACTION_SEND_MULTIPLE : Intent.ACTION_SEND);
            share.setType(images.isEmpty() ? "text/plain" : "image/*");
            share.setPackage(packageName);
            share.putExtra(Intent.EXTRA_SUBJECT, title);
            share.putExtra(Intent.EXTRA_TEXT, text);
            if (images.size() > 1) share.putParcelableArrayListExtra(Intent.EXTRA_STREAM, images);
            else if (images.size() == 1) share.putExtra(Intent.EXTRA_STREAM, images.get(0));
            share.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(share);
            return true;
        } catch (Exception ignored) {
            try {
                Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
                if (launch == null) return false;
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(launch);
                return true;
            } catch (Exception ignoredAgain) { return false; }
        }
    }
}
