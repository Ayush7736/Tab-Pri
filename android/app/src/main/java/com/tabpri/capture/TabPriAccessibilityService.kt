package com.tabpri.capture

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * First-stage service: observe only when the user explicitly starts capture.
 * Browser-specific extraction will be implemented by adapters after testing.
 */
class TabPriAccessibilityService : AccessibilityService() {

    @Volatile
    private var captureRequested = false

    fun startUserCapture() {
        captureRequested = true
        inspectActiveBrowser()
    }

    fun stopUserCapture() {
        captureRequested = false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!captureRequested) return
        if (event == null) return

        // Intentionally conservative for the first prototype.
        // We inspect the current window only after explicit user capture.
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            inspectActiveBrowser()
        }
    }

    private fun inspectActiveBrowser() {
        val root: AccessibilityNodeInfo = getRootInActiveWindow() ?: return
        val packageName = root.packageName?.toString() ?: return

        // TODO: BrowserAdapterRegistry selects an adapter from packageName.
        // TODO: Run adapter capability inspection and capture only on user action.
        android.util.Log.d("TabPriCapture", "Foreground package: $packageName")
        root.recycle()
    }

    override fun onInterrupt() {
        captureRequested = false
    }
}
