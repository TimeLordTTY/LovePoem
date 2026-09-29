package com.qingxiaolu.app;

import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HistoryImport")
public class HistoryImportPlugin extends Plugin {
    private static final String STORE = "qx_history_capture";

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getCaptured(PluginCall call) {
        JSObject result = new JSObject();
        result.put("records", getContext().getSharedPreferences(STORE, 0).getString("records", "[]"));
        call.resolve(result);
    }

    @PluginMethod
    public void clearCaptured(PluginCall call) {
        getContext().getSharedPreferences(STORE, 0).edit().remove("records").apply();
        call.resolve();
    }
}
