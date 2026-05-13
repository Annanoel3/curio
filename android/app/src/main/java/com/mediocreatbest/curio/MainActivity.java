package com.mediocreatbest.curio;

import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "CurioAuth";

    // Domains that must stay inside the WebView (not open in Chrome)
    private static final String[] IN_APP_DOMAINS = {
        "curio.website",
        "base44.app",
        "www.base44.app",
        "app.base44.app",
        "accounts.google.com",
        "oauth2.googleapis.com",
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupInAppNavigation();
    }

    private boolean isInAppDomain(String url) {
        if (url == null) return false;
        for (String domain : IN_APP_DOMAINS) {
            if (url.contains(domain)) {
                Log.d(TAG, "Keeping in WebView: " + url);
                return true;
            }
        }
        // Also keep any google.com domain (Google OAuth)
        if (url.contains(".google.com") || url.contains(".googleapis.com")) {
            Log.d(TAG, "Keeping Google URL in WebView: " + url);
            return true;
        }
        Log.d(TAG, "Would open externally: " + url);
        return false;
    }

    private void setupInAppNavigation() {
        WebView webView = getBridge().getWebView();

        // Remove "; wv" from user agent so Google doesn't block OAuth
        // (Google rejects sign-in in WebViews via "disallowed_useragent" error)
        String ua = webView.getSettings().getUserAgentString();
        webView.getSettings().setUserAgentString(ua.replace("; wv", ""));

        // Required for onCreateWindow to fire for window.open() calls
        webView.getSettings().setSupportMultipleWindows(true);
        webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);

        // Grab Capacitor's existing clients (API 26+)
        final WebChromeClient originalChromeClient =
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        ? webView.getWebChromeClient()
                        : null;

        // --- Override WebChromeClient: catch window.open() ---
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                Log.d(TAG, "onCreateWindow triggered");
                WebView tempView = new WebView(MainActivity.this);
                tempView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        String url = request.getUrl().toString();
                        Log.d(TAG, "window.open target URL: " + url);
                        webView.loadUrl(url);
                        return true;
                    }

                    @Override
                    @SuppressWarnings("deprecation")
                    public boolean shouldOverrideUrlLoading(WebView v, String url) {
                        Log.d(TAG, "window.open target URL (legacy): " + url);
                        webView.loadUrl(url);
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(tempView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView wv,
                                             ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (originalChromeClient != null) {
                    return originalChromeClient.onShowFileChooser(wv, filePathCallback, fileChooserParams);
                }
                return super.onShowFileChooser(wv, filePathCallback, fileChooserParams);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (originalChromeClient != null) {
                    originalChromeClient.onPermissionRequest(request);
                } else {
                    request.grant(request.getResources());
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (originalChromeClient != null) {
                    return originalChromeClient.onConsoleMessage(consoleMessage);
                }
                return super.onConsoleMessage(consoleMessage);
            }
        });

        // --- Override WebViewClient: catch window.location.href external navigations ---
        // This intercepts navigations that Capacitor would send to Chrome
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                Log.d(TAG, "shouldOverrideUrlLoading: " + url);
                if (isInAppDomain(url)) {
                    // Load in WebView, don't open Chrome
                    return false;
                }
                // For everything else, let Capacitor's default behavior apply
                // (open externally) - but we're returning false here to keep
                // unknown links in WebView too, preventing Chrome from popping
                return false;
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Log.d(TAG, "shouldOverrideUrlLoading (legacy): " + url);
                return false; // Always load in WebView
            }
        });
    }
}
