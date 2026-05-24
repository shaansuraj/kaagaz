package com.hexmon.kaagaz.nativebridge

import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class PdfFilePrintAdapter(
  private val pdfFile: File,
  private val jobName: String,
) : PrintDocumentAdapter() {

  override fun onLayout(
    oldAttributes: android.print.PrintAttributes?,
    newAttributes: android.print.PrintAttributes?,
    cancellationSignal: CancellationSignal?,
    callback: LayoutResultCallback,
    extras: Bundle?,
  ) {
    if (cancellationSignal?.isCanceled == true) {
      callback.onLayoutCancelled()
      return
    }

    val info = PrintDocumentInfo.Builder(jobName)
      .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
      .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
      .build()
    callback.onLayoutFinished(info, true)
  }

  override fun onWrite(
    pages: Array<out PageRange>?,
    destination: ParcelFileDescriptor,
    cancellationSignal: CancellationSignal?,
    callback: WriteResultCallback,
  ) {
    if (cancellationSignal?.isCanceled == true) {
      callback.onWriteCancelled()
      return
    }

    FileInputStream(pdfFile).use { input ->
      FileOutputStream(destination.fileDescriptor).use { output ->
        input.copyTo(output)
        output.flush()
      }
    }

    callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
  }
}
