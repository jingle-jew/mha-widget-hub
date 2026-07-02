import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const mainActivityPath = join(
  process.cwd(),
  "android",
  "app",
  "src",
  "main",
  "java",
  "app",
  "mha",
  "controlhub",
  "MainActivity.java",
);

const edgeToEdgeMainActivity = `package app.mha.controlhub;

import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private Insets lastPublishedInsets = Insets.NONE;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    applyEdgeToEdgeWindowFlags();
    super.onCreate(savedInstanceState);
    applyEdgeToEdgeWindowFlags();
    installInsetsListener();
    schedulePostResumeEdgeToEdgeSync();
    republishSafeAreaInsets(true);
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      applyEdgeToEdgeWindowFlags();
      schedulePostResumeEdgeToEdgeSync();
      republishSafeAreaInsets(true);
    }
  }

  @Override
  public void onResume() {
    super.onResume();
    applyEdgeToEdgeWindowFlags();
    schedulePostResumeEdgeToEdgeSync();
    republishSafeAreaInsets(true);
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    applyEdgeToEdgeWindowFlags();
    schedulePostResumeEdgeToEdgeSync();
    republishSafeAreaInsets(true);
  }

  private void applyEdgeToEdgeWindowFlags() {
    Window window = getWindow();
    WindowCompat.setDecorFitsSystemWindows(window, false);
    window.setStatusBarColor(Color.TRANSPARENT);
    window.setNavigationBarColor(Color.TRANSPARENT);

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
      WindowManager.LayoutParams attributes = window.getAttributes();
      attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
      window.setAttributes(attributes);
    }

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
      window.setStatusBarContrastEnforced(false);
      window.setNavigationBarContrastEnforced(false);
    }

    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null) webView.setBackgroundColor(Color.TRANSPARENT);
    syncSystemBarAppearance();
  }

  private void schedulePostResumeEdgeToEdgeSync() {
    View decorView = getWindow().getDecorView();
    decorView.post(() -> {
      applyEdgeToEdgeWindowFlags();
      ViewCompat.requestApplyInsets(decorView);
      republishSafeAreaInsets(true);
    });
  }

  private void installInsetsListener() {
    ViewCompat.setOnApplyWindowInsetsListener(
      getWindow().getDecorView(),
      (view, windowInsets) -> {
        Insets safeInsets = windowInsets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
        );
        publishSafeAreaInsets(safeInsets, false);
        return windowInsets;
      }
    );
    ViewCompat.requestApplyInsets(getWindow().getDecorView());
  }

  private void syncSystemBarAppearance() {
    Window window = getWindow();
    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
      window,
      window.getDecorView()
    );
    if (controller == null) return;

    boolean useDarkSystemBarIcons =
      (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
        != Configuration.UI_MODE_NIGHT_YES;
    controller.setAppearanceLightStatusBars(useDarkSystemBarIcons);
    controller.setAppearanceLightNavigationBars(useDarkSystemBarIcons);
  }

  private void republishSafeAreaInsets(boolean force) {
    WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(getWindow().getDecorView());
    if (rootInsets == null) return;
    Insets safeInsets = rootInsets.getInsets(
      WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
    );
    publishSafeAreaInsets(safeInsets, force);
  }

  private void publishSafeAreaInsets(Insets insets, boolean force) {
    if (insets == null) return;
    if (!force && insets.equals(lastPublishedInsets)) return;
    lastPublishedInsets = insets;

    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null) return;

    final int top = insets.top;
    final int right = insets.right;
    final int bottom = insets.bottom;
    final int left = insets.left;
    final String script =
      "(function(){" +
        "const insets={top:" + top + ",right:" + right + ",bottom:" + bottom + ",left:" + left + "};" +
        "window.__MHA_ANDROID_EDGE_TO_EDGE__=true;" +
        "window.__MHA_ANDROID_INSETS__=insets;" +
        "const root=document.documentElement;" +
        "root.dataset.mhaAndroidEdgeToEdge='true';" +
        "root.style.setProperty('--mha-safe-top',insets.top+'px');" +
        "root.style.setProperty('--mha-safe-right',insets.right+'px');" +
        "root.style.setProperty('--mha-safe-bottom',insets.bottom+'px');" +
        "root.style.setProperty('--mha-safe-left',insets.left+'px');" +
        "document.querySelectorAll('mha-widget-hub').forEach((el)=>el.classList.add('mha-android-edge-to-edge'));" +
        "window.dispatchEvent(new CustomEvent('mha:android-insets-changed',{detail:insets}));" +
      "})();";

    webView.post(() -> webView.evaluateJavascript(script, null));
  }
}
`;

mkdirSync(dirname(mainActivityPath), { recursive: true });
writeFileSync(mainActivityPath, edgeToEdgeMainActivity, "utf8");
console.log("Applied Android edge-to-edge MainActivity.java template");

if (!existsSync(mainActivityPath)) {
  process.exitCode = 1;
}
