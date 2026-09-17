package com.tabpri.capture

import java.time.Instant

/** Data stays local until the web client encrypts it. */
enum class BrowsingMode {
    NORMAL,
    PRIVATE,
    UNKNOWN
}

data class CapturedTab(
    val id: String,
    val title: String,
    val url: String,
    val browser: String,
    val browsingMode: BrowsingMode,
    val capturedAt: String = Instant.now().toString()
)

data class CaptureCapabilities(
    val normalTabs: Boolean = false,
    val privateTabs: Boolean = false,
    val titles: Boolean = false,
    val urls: Boolean = false,
    val tabSwitcherNavigation: Boolean = false,
    val gestures: Boolean = false
)
