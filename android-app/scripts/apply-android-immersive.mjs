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

const stableImmersiveMainActivity = `package app.mha.controlhub;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    enableStableImmersiveMode();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      enableStableImmersiveMode();
    }
  }

  private void enableStableImmersiveMode() {
    Window window = getWindow();

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      // Keep Android's navigation / gesture area stable. Hiding the navigation
      // bars in WebView immersive mode can make Android recalculate the bottom
      // viewport while the user scrolls near the end of the page, which can
      // produce visible flashes on glass-heavy layouts.
      window.setDecorFitsSystemWindows(true);
      WindowInsetsController controller = window.getInsetsController();

      if (controller != null) {
        controller.hide(WindowInsets.Type.statusBars());
        controller.setSystemBarsBehavior(
          WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
      }
      return;
    }

    // Legacy Android fallback: hide only the status bar. Do not request
    // HIDE_NAVIGATION / LAYOUT_HIDE_NAVIGATION here, because that is the part
    // most likely to destabilize the bottom gesture/navigation area.
    window.getDecorView().setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    );
  }
}
`;

mkdirSync(dirname(mainActivityPath), { recursive: true });
writeFileSync(mainActivityPath, stableImmersiveMainActivity, "utf8");
console.log("Applied Android stable immersive mode to MainActivity.java");

if (!existsSync(mainActivityPath)) {
  process.exitCode = 1;
}
