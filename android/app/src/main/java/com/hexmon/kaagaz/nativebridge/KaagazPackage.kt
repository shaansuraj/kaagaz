package com.hexmon.kaagaz.nativebridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class KaagazPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      KaagazImageProcessorModule(reactContext),
      KaagazExportModule(reactContext),
      KaagazOcrModule(reactContext),
      KaagazFilesModule(reactContext),
      KaagazPrintModule(reactContext),
    )
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
