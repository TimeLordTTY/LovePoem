package com.qingxiaolu.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HistoryImportPlugin.class);
        registerPlugin(AppDraftPlugin.class);
        super.onCreate(savedInstanceState);
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#fffdfa"));
        getWindow().setStatusBarColor(android.graphics.Color.parseColor("#fffdfa"));
    }
}
