package com.qingxiaolu.app;

import android.content.Context;
import android.util.AttributeSet;
import android.webkit.ValueCallback;
import com.getcapacitor.CapacitorWebView;

public class RecoverableWebView extends CapacitorWebView {
    private boolean disposed = false;

    public RecoverableWebView(Context context, AttributeSet attrs) { super(context, attrs); }

    @Override
    public void destroy() {
        if (disposed) return;
        disposed = true;
        setBridge(null);
        super.destroy();
    }

    @Override
    public void evaluateJavascript(String script, ValueCallback<String> callback) {
        // 框架暂停事件或插件结果可能已排队；销毁后不再交给失效渲染器。
        if (!disposed) super.evaluateJavascript(script, callback);
        else if (callback != null) callback.onReceiveValue("null");
    }

    @Override
    public void onPause() { if (!disposed) super.onPause(); }

    @Override
    public void onResume() { if (!disposed) super.onResume(); }

    @Override
    public void pauseTimers() { if (!disposed) super.pauseTimers(); }

    @Override
    public void resumeTimers() { if (!disposed) super.resumeTimers(); }
}
