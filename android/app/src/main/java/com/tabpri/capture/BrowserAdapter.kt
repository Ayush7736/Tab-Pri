package com.tabpri.capture

import android.view.accessibility.AccessibilityNodeInfo

/**
 * Browser-specific behavior lives behind this interface.
 * The vault UI never depends on a particular browser.
 */
interface BrowserAdapter {
    val id: String
    val packageNames: Set<String>

    fun canHandle(packageName: String): Boolean = packageNames.contains(packageName)

    fun inspectCapabilities(root: AccessibilityNodeInfo?): CaptureCapabilities

    /** Return true when the adapter can navigate to the tab switcher from the current UI. */
    fun openTabSwitcher(root: AccessibilityNodeInfo?): Boolean

    /** Extract what the browser currently exposes through accessibility. */
    fun readVisibleTabs(root: AccessibilityNodeInfo?): List<CapturedTab>
}

class GenericAccessibilityAdapter : BrowserAdapter {
    override val id: String = "generic"
    override val packageNames: Set<String> = emptySet()

    override fun inspectCapabilities(root: AccessibilityNodeInfo?): CaptureCapabilities =
        CaptureCapabilities()

    override fun openTabSwitcher(root: AccessibilityNodeInfo?): Boolean = false

    override fun readVisibleTabs(root: AccessibilityNodeInfo?): List<CapturedTab> = emptyList()
}
