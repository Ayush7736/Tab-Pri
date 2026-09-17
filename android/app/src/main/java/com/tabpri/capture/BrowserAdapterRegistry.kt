package com.tabpri.capture

/**
 * Package-to-adapter routing. Keep browser identification separate from
 * capture behavior so unsupported browsers degrade gracefully.
 */
class BrowserAdapterRegistry(
    private val adapters: List<BrowserAdapter>,
    private val generic: BrowserAdapter = GenericAccessibilityAdapter(),
) {
    fun adapterFor(packageName: String): BrowserAdapter =
        adapters.firstOrNull { it.canHandle(packageName) } ?: generic
}
