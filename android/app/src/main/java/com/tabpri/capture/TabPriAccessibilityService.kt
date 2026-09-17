package com.tabpri.capture

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

/**
 * User-triggered capture service. It does not inspect browser content while
 * idle. Browser-specific extraction is delegated to adapters.
 */
class TabPriAccessibilityService : AccessibilityService() {
    @Volatile private var captureRequested = false

    private val registry by lazy {
        BrowserAdapterRegistry(
            listOf(
                BraveAdapter(), ChromeAdapter(), EdgeAdapter(), FirefoxAdapter(),
                OperaAdapter(), VivaldiAdapter(), SamsungInternetAdapter(),
            )
        )
    }

    fun startUserCapture() {
        captureRequested = true
        inspectActiveBrowser()
    }

    fun stopUserCapture() {
        captureRequested = false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!captureRequested || event == null) return
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            inspectActiveBrowser()
        }
    }

    private fun inspectActiveBrowser() {
        val root = getRootInActiveWindow() ?: return
        try {
            val packageName = root.packageName?.toString() ?: return
            val adapter = registry.adapterFor(packageName)
            val capabilities = adapter.inspectCapabilities(root)
            android.util.Log.d(
                "TabPriCapture",
                "browser=${adapter.id} package=$packageName capabilities=$capabilities"
            )
            // Extraction is intentionally not guessed here. Each adapter must
            // be tested against the actual browser build before reading tabs.
        } finally {
            root.recycle()
        }
    }

    override fun onInterrupt() {
        captureRequested = false
    }
}
