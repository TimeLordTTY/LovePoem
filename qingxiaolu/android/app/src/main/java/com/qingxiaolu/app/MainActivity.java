package com.qingxiaolu.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.appcompat.app.AlertDialog;

public class MainActivity extends BridgeActivity {
    private boolean rendererGone = false;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HistoryImportPlugin.class);
        registerPlugin(AppDraftPlugin.class);
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // 渲染进程退出后必须销毁旧页面；不清空本机数据库或登录状态。
                rendererGone = true;
                android.util.Log.w("QingxiaoluRecovery", detail.didCrash() ? "renderer crashed" : "renderer terminated");
                if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
                view.destroy();
                // 由作者确认后重新打开，避免同一份异常内容导致无限重启。
                if (!isFinishing() && !isDestroyed()) {
                    new AlertDialog.Builder(MainActivity.this)
                        .setTitle("页面意外停止")
                        .setMessage("请重新打开情晓录，恢复已保存在本机的稿件和导入预览。停止前尚未保存的修改可能无法恢复。")
                        .setCancelable(false)
                        .setPositiveButton("重新打开", (dialog, which) -> recreate())
                        .show();
                }
                return true;
            }
        });
        super.onCreate(savedInstanceState);
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#fffdfa"));
        getWindow().setStatusBarColor(android.graphics.Color.parseColor("#fffdfa"));
        // 浅色状态栏使用深色图标，避免时间、电量等信息呈白色而无法阅读。
        new androidx.core.view.WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(true);
    }

    @Override
    public void onDetachedFromWindow() {
        // 崩溃回调已经销毁旧 WebView，避免框架再次操作失效实例。
        if (!rendererGone) super.onDetachedFromWindow();
    }
}
