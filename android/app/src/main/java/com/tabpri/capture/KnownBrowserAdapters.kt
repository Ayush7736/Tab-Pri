package com.tabpri.capture

import android.view.accessibility.AccessibilityNodeInfo

private abstract class PackageBrowserAdapter(
    override val id: String,
    override val packageNames: Set<String>,
) : BrowserAdapter {
    override fun inspectCapabilities(root: AccessibilityNodeInfo?): CaptureCapabilities =
        CaptureCapabilities(
            normalTabs = root != null,
            privateTabs = false,
            titles = root != null,
            urls = root != null,
            tabSwitcherNavigation = root != null,
            gestures = true,
        )

    override fun openTabSwitcher(root: AccessibilityNodeInfo?): Boolean = false

    override fun readVisibleTabs(root: AccessibilityNodeInfo?): List<CapturedTab> = emptyList()
}

class BraveAdapter : PackageBrowserAdapter(
    id = "brave",
    packageNames = setOf("com.brave.browser"),
)

class ChromeAdapter : PackageBrowserAdapter(
    id = "chrome",
    packageNames = setOf("com.android.chrome"),
)

class EdgeAdapter : PackageBrowserAdapter(
    id = "edge",
    packageNames = setOf("com.microsoft.emmx"),
)

class FirefoxAdapter : PackageBrowserAdapter(
    id = "firefox",
    packageNames = setOf("org.mozilla.firefox", "org.mozilla.fenix"),
)

class OperaAdapter : PackageBrowserAdapter(
    id = "opera",
    packageNames = setOf("com.opera.browser", "com.opera.mini.native"),
)

class VivaldiAdapter : PackageBrowserAdapter(
    id = "vivaldi",
    packageNames = setOf("com.vivaldi.browser"),
)

class SamsungInternetAdapter : PackageBrowserAdapter(
    id = "samsung-internet",
    packageNames = setOf("com.sec.android.app.sbrowser"),
)
