package com.qingxiaolu.app;

import android.accessibilityservice.AccessibilityService;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.LinkedHashSet;
import java.util.Set;

public class HistoryCaptureService extends AccessibilityService {
    private static final String STORE = "qx_history_capture";
    private long lastCapture = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        try {
            handleAccessibilityEvent(event);
        } catch (Throwable ignored) {
            // Foreground accessibility trees can disappear while being inspected.
        }
    }

    private void handleAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        String packageName = String.valueOf(event.getPackageName());
        if (!packageName.contains("weibo") && !packageName.contains("mobileqq")
                && !packageName.equals("com.tencent.mm") && !packageName.equals("com.jhyan.yan")) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;
        if (packageName.equals("com.tencent.mm") && assistWechatText(root)) {
            root.recycle();
            return;
        }
        if (packageName.contains("mobileqq") && assistQqPublish(root)) {
            root.recycle();
            return;
        }
        if (System.currentTimeMillis() - lastCapture < 1200) {
            root.recycle();
            return;
        }
        Set<String> texts = new LinkedHashSet<>();
        int[] images = new int[]{0};
        collect(root, texts, images);
        root.recycle();
        StringBuilder body = new StringBuilder();
        for (String text : texts) {
            String clean = text.trim();
            if (clean.length() >= 2 && clean.length() <= 2000) body.append(clean).append("\n");
        }
        if (body.length() < 8) return;
        String source = packageName.contains("weibo") ? "weibo"
                : packageName.contains("mobileqq") ? "qqzone"
                : packageName.equals("com.tencent.mm") ? "wechat" : "yiyan";
        save(source, body.toString().trim(), images[0]);
        lastCapture = System.currentTimeMillis();
    }

    private boolean assistQqPublish(AccessibilityNodeInfo root) {
        SharedPreferences assist = getSharedPreferences("qx_share_assist", MODE_PRIVATE);
        long expiresAt = assist.getLong("expiresAt", 0);
        if (expiresAt < System.currentTimeMillis() || !"qq".equals(assist.getString("target", ""))) return false;
        int step = assist.getInt("step", 0);
        boolean acted;
        if (step == 0) acted = clickAny(root, "动态");
        else if (step == 1) acted = clickAny(root, "好友动态", "QQ空间", "空间");
        else if (step == 2) acted = clickAny(root, "说说");
        else if (step == 3) acted = clickAny(root, "写说说", "分享新鲜事", "记录此刻");
        else acted = fillFirstEditor(root, assist.getString("text", ""));
        if (acted) {
            if (step >= 4) assist.edit().clear().apply();
            else assist.edit().putInt("step", step + 1).apply();
            return true;
        }
        return false;
    }

    private boolean assistWechatText(AccessibilityNodeInfo root) {
        SharedPreferences assist = getSharedPreferences("qx_share_assist", MODE_PRIVATE);
        long expiresAt = assist.getLong("expiresAt", 0);
        if (expiresAt < System.currentTimeMillis() || !"wechat".equals(assist.getString("target", ""))) return false;
        String text = assist.getString("text", "");
        if (text.isEmpty()) return false;
        if (fillFirstEditor(root, text)) {
            assist.edit().clear().apply();
            return true;
        }
        return false;
    }

    private boolean clickAny(AccessibilityNodeInfo root, String... labels) {
        for (String label : labels) {
            java.util.List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(label);
            for (AccessibilityNodeInfo node : nodes) {
                CharSequence value = node.getText() != null ? node.getText() : node.getContentDescription();
                if (value == null || !label.contentEquals(value.toString().trim())) continue;
                AccessibilityNodeInfo clickable = node;
                int parentDepth = 0;
                while (clickable != null && !clickable.isClickable() && parentDepth++ < 8) clickable = clickable.getParent();
                if (clickable != null && clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
            }
        }
        return false;
    }

    private boolean fillFirstEditor(AccessibilityNodeInfo node, String text) {
        return fillFirstEditor(node, text, 0);
    }

    private boolean fillFirstEditor(AccessibilityNodeInfo node, String text, int depth) {
        if (node == null || depth > 30) return false;
        if (node.isEditable()) {
            Bundle arguments = new Bundle();
            arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            if (fillFirstEditor(node.getChild(i), text, depth + 1)) return true;
        }
        return false;
    }

    private void collect(AccessibilityNodeInfo node, Set<String> texts, int[] images) {
        collect(node, texts, images, 0);
    }

    private void collect(AccessibilityNodeInfo node, Set<String> texts, int[] images, int depth) {
        if (node == null || depth > 30) return;
        if (node.getText() != null) texts.add(node.getText().toString());
        if (node.getContentDescription() != null) texts.add(node.getContentDescription().toString());
        if ("android.widget.ImageView".contentEquals(node.getClassName())) images[0]++;
        for (int i = 0; i < node.getChildCount(); i++) collect(node.getChild(i), texts, images, depth + 1);
    }

    private void save(String source, String text, int imageCount) {
        try {
            SharedPreferences preferences = getSharedPreferences(STORE, MODE_PRIVATE);
            JSONArray records = new JSONArray(preferences.getString("records", "[]"));
            String fingerprint = Integer.toHexString((source + text).hashCode());
            for (int i = 0; i < records.length(); i++) {
                if (fingerprint.equals(records.getJSONObject(i).optString("fingerprint"))) return;
            }
            JSONObject record = new JSONObject();
            record.put("id", java.util.UUID.randomUUID().toString());
            record.put("source", source);
            record.put("text", text);
            record.put("imageCount", imageCount);
            record.put("capturedAt", new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
            record.put("fingerprint", fingerprint);
            records.put(record);
            while (records.length() > 1000) records.remove(0);
            preferences.edit().putString("records", records.toString()).apply();
        } catch (Exception ignored) { }
    }

    @Override public void onInterrupt() { }
}
