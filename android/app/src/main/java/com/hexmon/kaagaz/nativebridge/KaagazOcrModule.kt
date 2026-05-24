package com.hexmon.kaagaz.nativebridge

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

class KaagazOcrModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "KaagazOcr"

  @ReactMethod
  fun getAvailableOcrModels(promise: Promise) {
    executor.execute {
      try {
        promise.resolve(buildModelStatusMap())
      } catch (error: Exception) {
        promise.reject("OCR_MODELS_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun downloadOcrModel(script: String, promise: Promise) {
    executor.execute {
      try {
        if (script == "latin") {
          promise.resolve(buildModelStatusMap())
          return@execute
        }

        if (!isPlayServicesAvailable()) {
          error("Google Play Services is required to download this OCR language pack.")
        }

        createRecognizer(script).use { recognizer ->
          val client = ModuleInstall.getClient(reactApplicationContext)
          val request = ModuleInstallRequest.newBuilder().addApi(recognizer).build()
          Tasks.await(client.installModules(request))
        }

        promise.resolve(buildModelStatusMap())
      } catch (error: Exception) {
        promise.reject("OCR_MODEL_DOWNLOAD_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun runOcrOnImages(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val imagePaths = readStringArray(options.getArray("imagePaths"))
        val script = options.getString("script") ?: "latin"
        createRecognizer(script).use { recognizer ->
          val pages = Arguments.createArray()
          imagePaths.forEachIndexed { index, path ->
            val image = InputImage.fromFilePath(reactApplicationContext, Uri.fromFile(File(path)))
            val result = Tasks.await(recognizer.process(image))
            val width = image.width.coerceAtLeast(1)
            val height = image.height.coerceAtLeast(1)
            val blocks = Arguments.createArray()

            result.textBlocks.forEach { block ->
              val blockBounds = block.boundingBox
              val lines = Arguments.createArray()

              block.lines.forEach { line ->
                val bounds = line.boundingBox
                if (bounds != null) {
                  lines.pushMap(
                    Arguments.createMap().apply {
                      putString("text", line.text)
                      putNull("confidence")
                      putMap(
                        "bounds",
                        createBoundsMap(
                          left = bounds.left.toFloat() / width.toFloat(),
                          top = bounds.top.toFloat() / height.toFloat(),
                          right = bounds.right.toFloat() / width.toFloat(),
                          bottom = bounds.bottom.toFloat() / height.toFloat(),
                        ),
                      )
                    },
                  )
                }
              }

              if (blockBounds != null) {
                blocks.pushMap(
                  Arguments.createMap().apply {
                    putString("text", block.text)
                    putNull("confidence")
                    putMap(
                      "bounds",
                      createBoundsMap(
                        left = blockBounds.left.toFloat() / width.toFloat(),
                        top = blockBounds.top.toFloat() / height.toFloat(),
                        right = blockBounds.right.toFloat() / width.toFloat(),
                        bottom = blockBounds.bottom.toFloat() / height.toFloat(),
                      ),
                    )
                    putArray("lines", lines)
                  },
                )
              }
            }

            pages.pushMap(
              Arguments.createMap().apply {
                putInt("pageNumber", index + 1)
                putInt("width", width)
                putInt("height", height)
                putString("text", result.text)
                putArray("blocks", blocks)
              },
            )
          }
          promise.resolve(pages)
        }
      } catch (error: Exception) {
        promise.reject("OCR_RUN_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun exportOcrText(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val pages = options.getArray("ocrPages") ?: error("Missing ocrPages")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val target = File(outputPath)
        target.parentFile?.mkdirs()

        val builder = StringBuilder()
        for (index in 0 until pages.size()) {
          val page = pages.getMap(index) ?: continue
          val pageNumber = page.getInt("pageNumber")
          val text = page.getString("text") ?: ""
          builder.append("Page ").append(pageNumber).append("\n")
          builder.append(text.trim())
          if (index < pages.size() - 1) {
            builder.append("\n\n")
          }
        }

        FileOutputStream(target).use { output ->
          output.write(builder.toString().toByteArray(Charsets.UTF_8))
        }
        promise.resolve(target.absolutePath)
      } catch (error: Exception) {
        promise.reject("OCR_TEXT_EXPORT_FAILED", error)
      }
    }
  }

  private fun createRecognizer(script: String): TextRecognizer =
    when (script) {
      "chinese" ->
        TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
      "devanagari" ->
        TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
      "japanese" ->
        TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
      "korean" ->
        TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
      else ->
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

  private fun buildModelStatusMap(): com.facebook.react.bridge.WritableMap {
    val playServicesAvailable = isPlayServicesAvailable()
    val supportsDynamicDownload = playServicesAvailable
    val client = if (playServicesAvailable) ModuleInstall.getClient(reactApplicationContext) else null

    val scripts = Arguments.createMap().apply {
      putString("latin", "bundled")
      listOf("chinese", "devanagari", "japanese", "korean").forEach { script ->
        val status =
          if (!playServicesAvailable || client == null) {
            "not-installed"
          } else {
            createRecognizer(script).use { recognizer ->
              val response = Tasks.await(client.areModulesAvailable(recognizer))
              if (response.areModulesAvailable()) "ready" else "not-installed"
            }
          }
        putString(script, status)
      }
    }

    return Arguments.createMap().apply {
      putBoolean("playServicesAvailable", playServicesAvailable)
      putBoolean("supportsDynamicDownload", supportsDynamicDownload)
      putMap("scripts", scripts)
    }
  }

  private fun createBoundsMap(
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) = Arguments.createMap().apply {
    putDouble("left", left.toDouble().coerceIn(0.0, 1.0))
    putDouble("top", top.toDouble().coerceIn(0.0, 1.0))
    putDouble("right", right.toDouble().coerceIn(0.0, 1.0))
    putDouble("bottom", bottom.toDouble().coerceIn(0.0, 1.0))
  }

  private fun readStringArray(array: ReadableArray?): List<String> {
    if (array == null || array.size() == 0) {
      throw IllegalArgumentException("Expected a non-empty image path array")
    }

    return (0 until array.size()).map { index ->
      array.getString(index) ?: error("Missing image path")
    }
  }

  private fun isPlayServicesAvailable(): Boolean =
    GoogleApiAvailability.getInstance()
      .isGooglePlayServicesAvailable(reactApplicationContext) == ConnectionResult.SUCCESS
}
