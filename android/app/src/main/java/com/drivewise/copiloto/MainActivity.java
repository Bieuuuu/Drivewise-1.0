package com.drivewise.copiloto;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }

        final WebView mainWebView = this.bridge.getWebView();
        final WebSettings settings = mainWebView.getSettings();

        // 1. Clean WebView User-Agent so Google OAuth treats it as standard Chrome Mobile
        final String cleanUserAgent = buildCleanChromeUserAgent(settings.getUserAgentString());
        settings.setUserAgentString(cleanUserAgent);

        // 2. Enable multi-window support so Firebase signInWithPopup preserves window.opener
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

        // 3. Enable cookies and third-party cookies for Firebase /__/auth/handler & Google OAuth
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(mainWebView, true);

        // 4. Extend Capacitor's BridgeWebChromeClient to handle OAuth popup windows in-app
        mainWebView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public boolean onCreateWindow(
                WebView view,
                boolean isDialog,
                boolean isUserGesture,
                Message resultMsg
            ) {
                if (resultMsg == null || !(resultMsg.obj instanceof WebView.WebViewTransport)) {
                    return false;
                }

                final Dialog oauthDialog = new Dialog(
                    MainActivity.this,
                    android.R.style.Theme_Black_NoTitleBar_Fullscreen
                );
                Window window = oauthDialog.getWindow();
                if (window != null) {
                    window.setLayout(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.MATCH_PARENT
                    );
                }

                FrameLayout container = new FrameLayout(MainActivity.this);
                container.setBackgroundColor(Color.parseColor("#0B0D11"));

                final WebView popupWebView = new WebView(MainActivity.this);
                WebSettings popupSettings = popupWebView.getSettings();
                popupSettings.setJavaScriptEnabled(true);
                popupSettings.setDomStorageEnabled(true);
                popupSettings.setDatabaseEnabled(true);
                popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                popupSettings.setSupportMultipleWindows(true);
                popupSettings.setUserAgentString(cleanUserAgent);

                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, WebResourceRequest request) {
                        // Keep all OAuth & Firebase handler redirects inside the popup WebView
                        return false;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, String url) {
                        return false;
                    }
                });

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView windowWebView) {
                        try {
                            if (oauthDialog.isShowing()) {
                                oauthDialog.dismiss();
                            }
                        } catch (Exception ignored) {}
                        try {
                            windowWebView.destroy();
                        } catch (Exception ignored) {}
                    }
                });

                // Close button in top-right corner so user can cancel OAuth popup at any time
                ImageButton closeBtn = new ImageButton(MainActivity.this);
                closeBtn.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
                closeBtn.setBackgroundColor(Color.argb(140, 19, 22, 28));
                FrameLayout.LayoutParams btnParams = new FrameLayout.LayoutParams(108, 108);
                btnParams.gravity = Gravity.TOP | Gravity.END;
                btnParams.setMargins(24, 36, 24, 24);
                closeBtn.setOnClickListener(v -> {
                    try {
                        oauthDialog.dismiss();
                    } catch (Exception ignored) {}
                    try {
                        popupWebView.destroy();
                    } catch (Exception ignored) {}
                });

                container.addView(
                    popupWebView,
                    new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                );
                container.addView(closeBtn, btnParams);

                oauthDialog.setContentView(container);
                oauthDialog.setOnCancelListener(dialog -> {
                    try {
                        popupWebView.destroy();
                    } catch (Exception ignored) {}
                });

                oauthDialog.show();

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    private String buildCleanChromeUserAgent(String originalUa) {
        if (originalUa == null || originalUa.isEmpty()) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
        }
        return originalUa
            .replace("; wv)", ")")
            .replace("; wv", "")
            .replace("Version/4.0 ", "");
    }
}
