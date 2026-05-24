package com.hexmon.kaagaz.nativebridge

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.content.ClipData
import android.content.ClipboardManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import androidx.documentfile.provider.DocumentFile
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.Executors

class KaagazFilesModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext),
  ActivityEventListener {

  private val executor = Executors.newSingleThreadExecutor()
  private var pendingPickPromise: Promise? = null
  private var pendingPickMode: PickMode? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "KaagazFiles"

  @ReactMethod
  fun pickFiles(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: run {
      promise.reject("PICK_FILES_FAILED", "No current activity available")
      return
    }

    if (pendingPickPromise != null) {
      promise.reject("PICK_FILES_FAILED", "Another picker request is already active")
      return
    }

    val allowMultiple = options.getBoolean("allowMultiple")
    val mimeTypes = readStringArray(options.getArray("mimeTypes")).ifEmpty { listOf("*/*") }
    val intent =
      Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = if (mimeTypes.size == 1) mimeTypes.first() else "*/*"
        putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple)
      }

    pendingPickPromise = promise
    pendingPickMode = PickMode.Files
    activity.startActivityForResult(Intent.createChooser(intent, "Choose files"), REQUEST_PICK_FILES)
  }

  @ReactMethod
  fun pickDirectory(promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: run {
      promise.reject("PICK_DIRECTORY_FAILED", "No current activity available")
      return
    }

    if (pendingPickPromise != null) {
      promise.reject("PICK_DIRECTORY_FAILED", "Another picker request is already active")
      return
    }

    pendingPickPromise = promise
    pendingPickMode = PickMode.Directory
    activity.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), REQUEST_PICK_DIRECTORY)
  }

  @ReactMethod
  fun saveFileToDocuments(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val sourcePath = options.getString("sourcePath") ?: error("Missing sourcePath")
        val relativePath = options.getString("relativePath") ?: "Kaagaz"
        val displayName = options.getString("displayName") ?: error("Missing displayName")
        val mimeType = options.getString("mimeType") ?: "application/octet-stream"

        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          saveWithMediaStore(sourcePath, relativePath, displayName, mimeType)
        } else {
          saveLegacyFile(sourcePath, relativePath, displayName)
        }

        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("SAVE_TO_DOCUMENTS_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun saveFileToTreeUri(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val sourcePath = options.getString("sourcePath") ?: error("Missing sourcePath")
        val treeUri = options.getString("treeUri") ?: error("Missing treeUri")
        val displayName = options.getString("displayName") ?: error("Missing displayName")
        val mimeType = options.getString("mimeType") ?: "application/octet-stream"

        val root = DocumentFile.fromTreeUri(reactApplicationContext, Uri.parse(treeUri))
          ?: error("Folder is not available")

        val existing = root.findFile(displayName)
        existing?.delete()
        val target = root.createFile(mimeType, displayName) ?: error("Unable to create file")

        reactApplicationContext.contentResolver.openOutputStream(target.uri)?.use { output ->
          FileInputStream(File(sourcePath)).use { input ->
            input.copyTo(output)
          }
        } ?: error("Unable to open destination file")

        val result = Arguments.createMap().apply {
          putString("uri", target.uri.toString())
          putString("relativePath", displayName)
          putDouble("sizeBytes", File(sourcePath).length().toDouble())
        }
        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("SAVE_TO_TREE_URI_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun openFile(target: String, mimeType: String?, promise: Promise) {
    try {
      val uri = resolveTargetUri(target)

      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mimeType ?: reactApplicationContext.contentResolver.getType(uri))
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: ActivityNotFoundException) {
      promise.reject("OPEN_FILE_FAILED", "No compatible app found to open this file", error)
    } catch (error: Exception) {
      promise.reject("OPEN_FILE_FAILED", error)
    }
  }

  @ReactMethod
  fun shareFile(target: String, mimeType: String?, title: String?, message: String?, promise: Promise) {
    try {
      val uri = resolveTargetUri(target)
      val resolvedMimeType = mimeType ?: reactApplicationContext.contentResolver.getType(uri)
      val intent =
        Intent(Intent.ACTION_SEND).apply {
          type = resolvedMimeType ?: "*/*"
          putExtra(Intent.EXTRA_STREAM, uri)
          if (!message.isNullOrBlank()) {
            putExtra(Intent.EXTRA_TEXT, message)
          }
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      val chooserTitle = title ?: "Share file"
      val chooser = Intent.createChooser(intent, chooserTitle).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      reactApplicationContext.startActivity(chooser)
      promise.resolve(true)
    } catch (error: ActivityNotFoundException) {
      promise.reject("SHARE_FILE_FAILED", "No compatible app found to share this file", error)
    } catch (error: Exception) {
      promise.reject("SHARE_FILE_FAILED", error)
    }
  }

  @ReactMethod
  fun copyText(text: String, promise: Promise) {
    try {
      val clipboard =
        reactApplicationContext.getSystemService(ClipboardManager::class.java)
          ?: error("Clipboard service not available")
      clipboard.setPrimaryClip(ClipData.newPlainText("Kaagaz OCR", text))
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("COPY_TEXT_FAILED", error)
    }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    val promise = pendingPickPromise ?: return
    val mode = pendingPickMode ?: return
    pendingPickPromise = null
    pendingPickMode = null

    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.reject("PICKER_CANCELLED", "Picker cancelled")
      return
    }

    try {
      when (mode) {
        PickMode.Directory -> {
          val uri = data.data ?: error("No directory selected")
          val persistableFlags =
            data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
          reactApplicationContext.contentResolver.takePersistableUriPermission(uri, persistableFlags)
          promise.resolve(
            Arguments.createMap().apply {
              putString("uri", uri.toString())
            },
          )
        }
        PickMode.Files -> {
          val uris = mutableListOf<Uri>()
          data.clipData?.let { clipData ->
            for (index in 0 until clipData.itemCount) {
              clipData.getItemAt(index)?.uri?.let(uris::add)
            }
          }
          data.data?.let(uris::add)

          val persistableFlags =
            data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
          val response = Arguments.createArray()
          uris.distinct().forEach { uri ->
            try {
              reactApplicationContext.contentResolver.takePersistableUriPermission(uri, persistableFlags)
            } catch (_: SecurityException) {
              // Best effort; some providers do not support persistable grants.
            }
            response.pushMap(copyUriToCache(uri))
          }
          promise.resolve(response)
        }
      }
    } catch (error: Exception) {
      promise.reject("PICKER_FAILED", error)
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun copyUriToCache(uri: Uri): com.facebook.react.bridge.WritableMap {
    val resolver = reactApplicationContext.contentResolver
    val displayName = queryDisplayName(uri) ?: "picked-${System.currentTimeMillis()}"
    val cacheDir = File(reactApplicationContext.cacheDir, "picked-files")
    if (!cacheDir.exists()) {
      cacheDir.mkdirs()
    }
    val target = File(cacheDir, "${System.currentTimeMillis()}-$displayName")
    resolver.openInputStream(uri)?.use { input ->
      FileOutputStream(target).use { output ->
        input.copyTo(output)
      }
    } ?: error("Unable to read selected file")

    return Arguments.createMap().apply {
      putString("uri", uri.toString())
      putString("name", displayName)
      putString("path", target.absolutePath)
      putString("mimeType", resolver.getType(uri))
      putDouble("size", target.length().toDouble())
    }
  }

  private fun queryDisplayName(uri: Uri): String? {
    val resolver = reactApplicationContext.contentResolver
    val cursor: Cursor? = resolver.query(uri, null, null, null, null)
    cursor?.use {
      val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      if (it.moveToFirst() && nameIndex >= 0) {
        return it.getString(nameIndex)
      }
    }
    return null
  }

  private fun readStringArray(array: ReadableArray?): List<String> {
    if (array == null || array.size() == 0) {
      return emptyList()
    }

    return (0 until array.size()).mapNotNull { index -> array.getString(index) }
  }

  private fun resolveTargetUri(target: String): Uri =
    when {
      target.startsWith("content://") -> Uri.parse(target)
      target.startsWith("file://") -> Uri.parse(target)
      else ->
        FileProvider.getUriForFile(
          reactApplicationContext,
          "${reactApplicationContext.packageName}.fileprovider",
          File(target),
        )
    }

  private fun saveWithMediaStore(
    sourcePath: String,
    relativePath: String,
    displayName: String,
    mimeType: String,
  ): com.facebook.react.bridge.WritableMap {
    val resolver = reactApplicationContext.contentResolver
    val collection = MediaStore.Files.getContentUri("external")
    val cleanRelativePath = "${Environment.DIRECTORY_DOCUMENTS}/${relativePath.trim('/')}"
    val contentValues = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
      put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
      put(MediaStore.MediaColumns.RELATIVE_PATH, cleanRelativePath)
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }

    val uri = resolver.insert(collection, contentValues) ?: error("Unable to create document")

    try {
      resolver.openOutputStream(uri)?.use { output ->
        FileInputStream(File(sourcePath)).use { input ->
          input.copyTo(output)
        }
      } ?: error("Unable to open destination")

      contentValues.clear()
      contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
      resolver.update(uri, contentValues, null, null)
    } catch (error: Exception) {
      resolver.delete(uri, null, null)
      throw error
    }

    return Arguments.createMap().apply {
      putString("uri", uri.toString())
      putString("relativePath", "$cleanRelativePath/$displayName")
      putDouble("sizeBytes", File(sourcePath).length().toDouble())
    }
  }

  private fun saveLegacyFile(
    sourcePath: String,
    relativePath: String,
    displayName: String,
  ): com.facebook.react.bridge.WritableMap {
    val documentsRoot = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
    val targetDir = File(documentsRoot, relativePath)
    if (!targetDir.exists()) {
      targetDir.mkdirs()
    }
    val targetFile = File(targetDir, displayName)
    FileInputStream(File(sourcePath)).use { input ->
      FileOutputStream(targetFile).use { output ->
        input.copyTo(output)
      }
    }

    return Arguments.createMap().apply {
      putString("uri", Uri.fromFile(targetFile).toString())
      putString("relativePath", "Documents/${relativePath.trim('/')}/$displayName")
      putDouble("sizeBytes", targetFile.length().toDouble())
    }
  }

  private enum class PickMode {
    Files,
    Directory,
  }

  private companion object {
    const val REQUEST_PICK_FILES = 9201
    const val REQUEST_PICK_DIRECTORY = 9202
  }
}
