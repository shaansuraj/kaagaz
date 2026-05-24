package com.hexmon.kaagaz.nativebridge

import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File

class KaagazPrintModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "KaagazPrint"

  @ReactMethod
  fun openSystemPrintDialog(pdfPath: String, jobName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("PRINT_ACTIVITY_MISSING", "No active Android activity available")
      return
    }

    val pdfFile = File(pdfPath)
    if (!pdfFile.exists()) {
      promise.reject("PRINT_FILE_MISSING", "Printable PDF not found")
      return
    }

    UiThreadUtil.runOnUiThread {
      try {
        val printManager =
          activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
        printManager.print(
          jobName,
          PdfFilePrintAdapter(pdfFile, jobName),
          PrintAttributes.Builder().build(),
        )
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("PRINT_FAILED", error)
      }
    }
  }
}
