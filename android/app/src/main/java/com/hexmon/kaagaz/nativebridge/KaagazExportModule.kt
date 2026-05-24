package com.hexmon.kaagaz.nativebridge

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDDocumentInformation
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.font.PDFont
import com.tom_roush.pdfbox.pdmodel.font.PDType0Font
import com.tom_roush.pdfbox.pdmodel.font.PDType1Font
import com.tom_roush.pdfbox.pdmodel.graphics.image.JPEGFactory
import com.tom_roush.pdfbox.pdmodel.graphics.state.RenderingMode
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.time.Instant
import java.util.GregorianCalendar
import java.util.UUID
import java.util.concurrent.Executors
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

class KaagazExportModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "KaagazExport"

  @ReactMethod
  fun generatePdf(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val imagePaths = readStringArray(options.getArray("imagePaths"))
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val documentName = options.getString("documentName") ?: "Kaagaz Document"
        val appName = options.getString("appName") ?: "Kaagaz"
        val createdAt = options.getString("createdAt") ?: Instant.now().toString()
        val pageSize = options.getString("pageSize") ?: "A4"
        val imageQuality = options.getInt("imageQuality")

        File(outputPath).parentFile?.mkdirs()
        createPdfDocument(
          imagePaths = imagePaths,
          outputPath = outputPath,
          documentName = documentName,
          appName = appName,
          createdAt = createdAt,
          pageSize = pageSize,
          imageQuality = imageQuality,
        )
        promise.resolve(outputPath)
      } catch (error: Exception) {
        promise.reject("PDF_EXPORT_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun generateDocx(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val imagePaths = readStringArray(options.getArray("imagePaths"))
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val documentName = options.getString("documentName") ?: "Kaagaz Document"
        val appName = options.getString("appName") ?: "Kaagaz"
        val createdAt = options.getString("createdAt") ?: Instant.now().toString()

        File(outputPath).parentFile?.mkdirs()
        createDocxDocument(imagePaths, outputPath, documentName, appName, createdAt)
        promise.resolve(outputPath)
      } catch (error: Exception) {
        promise.reject("DOCX_EXPORT_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun generateSearchablePdf(options: ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val imagePaths = readStringArray(options.getArray("imagePaths"))
        val ocrPages = readOcrPages(options.getArray("ocrPages"))
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val documentName = options.getString("documentName") ?: "Kaagaz Document"
        val appName = options.getString("appName") ?: "Kaagaz"
        val createdAt = options.getString("createdAt") ?: Instant.now().toString()
        val pageSize = options.getString("pageSize") ?: "A4"
        val imageQuality = options.getInt("imageQuality")
        val script = options.getString("script") ?: "latin"

        File(outputPath).parentFile?.mkdirs()
        createPdfDocument(
          imagePaths = imagePaths,
          outputPath = outputPath,
          documentName = documentName,
          appName = appName,
          createdAt = createdAt,
          pageSize = pageSize,
          imageQuality = imageQuality,
          searchablePages = ocrPages,
          script = script,
        )
        promise.resolve(outputPath)
      } catch (error: Exception) {
        promise.reject("SEARCHABLE_PDF_EXPORT_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun inspectPdf(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        ParcelFileDescriptor.open(File(inputPath), ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
          PdfRenderer(descriptor).use { renderer ->
            val pages = Arguments.createArray()
            for (pageIndex in 0 until renderer.pageCount) {
              renderer.openPage(pageIndex).use { page ->
                pages.pushMap(
                  Arguments.createMap().apply {
                    putInt("pageNumber", pageIndex + 1)
                    putInt("width", page.width)
                    putInt("height", page.height)
                  },
                )
              }
            }

            promise.resolve(
              Arguments.createMap().apply {
                putInt("pageCount", renderer.pageCount)
                putArray("pages", pages)
              },
            )
          }
        }
      } catch (error: Exception) {
        promise.reject("PDF_INSPECT_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun renderPdfToImages(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputDir = options.getString("outputDir") ?: error("Missing outputDir")
        val format = options.getString("format") ?: "jpg"
        val quality = options.getInt("quality")
        val maxLongEdge = options.getInt("maxLongEdge")
        val pageIndices = readOptionalIntArray(options.getArray("pageIndices"))

        val rendered = renderPdfPagesToImages(inputPath, outputDir, format, quality, maxLongEdge, pageIndices)
        val result = Arguments.createArray()
        rendered.forEach { item ->
          result.pushMap(
            Arguments.createMap().apply {
              putString("path", item.path)
              putInt("width", item.width)
              putInt("height", item.height)
            },
          )
        }
        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("PDF_RENDER_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun mergePdf(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPaths = readStringArray(options.getArray("inputPaths"))
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        File(outputPath).parentFile?.mkdirs()

        PDDocument().use { output ->
          inputPaths.forEach { path ->
            PDDocument.load(File(path)).use { input ->
              for (pageIndex in 0 until input.numberOfPages) {
                output.importPage(input.getPage(pageIndex))
              }
            }
          }
          FileOutputStream(outputPath).use(output::save)
        }

        promise.resolve(outputPath)
      } catch (error: Exception) {
        promise.reject("PDF_MERGE_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun extractPdfPages(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val pageIndices = readIntArray(options.getArray("pageIndices"))
        File(outputPath).parentFile?.mkdirs()

        PDDocument.load(File(inputPath)).use { input ->
          PDDocument().use { output ->
            pageIndices.forEach { pageIndex ->
              output.importPage(input.getPage(pageIndex))
            }
            FileOutputStream(outputPath).use(output::save)
          }
        }

        promise.resolve(outputPath)
      } catch (error: Exception) {
        promise.reject("PDF_EXTRACT_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun reorderPdf(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val pageOrder = readIntArray(options.getArray("pageOrder"))
        val rotationDeltas = readOptionalIntArray(options.getArray("rotationDeltas"))
        File(outputPath).parentFile?.mkdirs()

        PDDocument.load(File(inputPath)).use { input ->
          PDDocument().use { output ->
            pageOrder.forEachIndexed { orderIndex, sourcePageIndex ->
              val imported = output.importPage(input.getPage(sourcePageIndex))
              val rotationDelta = rotationDeltas?.getOrNull(orderIndex) ?: 0
              if (rotationDelta != 0) {
                imported.rotation = ((imported.rotation + rotationDelta) % 360 + 360) % 360
              }
            }
            FileOutputStream(outputPath).use(output::save)
          }
        }

        promise.resolve(outputPath)
      } catch (error: Exception) {
        promise.reject("PDF_REORDER_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun compressPdf(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      val tempDirPath = options.getString("workingDir")
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val pageSize = options.getString("pageSize") ?: "A4"
        val quality = options.getInt("quality")
        val maxLongEdge = options.getInt("maxLongEdge")
        val workingParent =
          tempDirPath?.let(::File) ?: File(outputPath).parentFile ?: reactApplicationContext.cacheDir
        val workingDir = File(workingParent, "compress-${System.currentTimeMillis()}")
        workingDir.mkdirs()

        val rendered =
          renderPdfPagesToImages(
            inputPath = inputPath,
            outputDir = workingDir.absolutePath,
            format = "jpg",
            quality = quality,
            maxLongEdge = maxLongEdge,
            pageIndices = null,
          )

        createPdfDocument(
          imagePaths = rendered.map { it.path },
          outputPath = outputPath,
          documentName = File(outputPath).nameWithoutExtension,
          appName = "Kaagaz",
          createdAt = Instant.now().toString(),
          pageSize = pageSize,
          imageQuality = quality,
        )
        workingDir.deleteRecursively()
        promise.resolve(outputPath)
      } catch (error: Exception) {
        tempDirPath?.let { File(it).deleteRecursively() }
        promise.reject("PDF_COMPRESS_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun docxToPdf(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      val tempDir = File(reactApplicationContext.cacheDir, "docx-images-${System.currentTimeMillis()}")
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val documentName = options.getString("documentName") ?: File(inputPath).nameWithoutExtension
        val appName = options.getString("appName") ?: "Kaagaz"
        val createdAt = options.getString("createdAt") ?: Instant.now().toString()
        val pageSize = options.getString("pageSize") ?: "A4"
        val imageQuality = options.getInt("imageQuality")

        tempDir.mkdirs()
        val mediaFiles = extractMediaFromDocx(inputPath, tempDir)
        if (mediaFiles.isEmpty()) {
          throw IllegalArgumentException("Only image-based DOCX files can be converted offline.")
        }

        createPdfDocument(
          imagePaths = mediaFiles.map(File::getAbsolutePath),
          outputPath = outputPath,
          documentName = documentName,
          appName = appName,
          createdAt = createdAt,
          pageSize = pageSize,
          imageQuality = imageQuality,
        )
        tempDir.deleteRecursively()
        promise.resolve(outputPath)
      } catch (error: Exception) {
        tempDir.deleteRecursively()
        promise.reject("DOCX_TO_PDF_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun extractDocxImages(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputDir = options.getString("outputDir") ?: error("Missing outputDir")
        val tempDir = File(outputDir)
        tempDir.mkdirs()
        val mediaFiles = extractMediaFromDocx(inputPath, tempDir)
        if (mediaFiles.isEmpty()) {
          throw IllegalArgumentException("Only image-based DOCX files can be previewed offline.")
        }

        val result = Arguments.createArray()
        mediaFiles.forEach { file ->
          val bounds = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
          }
          BitmapFactory.decodeFile(file.absolutePath, bounds)
          result.pushMap(
            Arguments.createMap().apply {
              putString("path", file.absolutePath)
              putInt("width", bounds.outWidth)
              putInt("height", bounds.outHeight)
            },
          )
        }
        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("DOCX_PREVIEW_FAILED", error)
      }
    }
  }

  private fun readStringArray(array: ReadableArray?): List<String> {
    if (array == null || array.size() == 0) {
      throw IllegalArgumentException("Expected a non-empty string array")
    }

    return (0 until array.size()).map { index ->
      array.getString(index) ?: throw IllegalArgumentException("Invalid string value")
    }
  }

  private fun readIntArray(array: ReadableArray?): List<Int> {
    if (array == null || array.size() == 0) {
      throw IllegalArgumentException("Expected a non-empty integer array")
    }

    return (0 until array.size()).map { index -> array.getInt(index) }
  }

  private fun readOptionalIntArray(array: ReadableArray?): List<Int>? {
    if (array == null || array.size() == 0) {
      return null
    }

    return (0 until array.size()).map { index -> array.getInt(index) }
  }

  private fun renderPdfPagesToImages(
    inputPath: String,
    outputDir: String,
    format: String,
    quality: Int,
    maxLongEdge: Int,
    pageIndices: List<Int>?,
  ): List<RenderedImage> {
    val outputDirectory = File(outputDir)
    outputDirectory.mkdirs()
    val results = mutableListOf<RenderedImage>()

    ParcelFileDescriptor.open(File(inputPath), ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
      PdfRenderer(descriptor).use { renderer ->
        val indices = pageIndices ?: (0 until renderer.pageCount).toList()
        indices.forEach { pageIndex ->
          renderer.openPage(pageIndex).use { page ->
            val longEdge = max(page.width, page.height)
            val targetLongEdge = if (maxLongEdge > 0) maxLongEdge else 1800
            val scale = maxOf(1f, targetLongEdge.toFloat() / longEdge.toFloat())
            val bitmapWidth = max(1, (page.width * scale).roundToInt())
            val bitmapHeight = max(1, (page.height * scale).roundToInt())
            val bitmap = Bitmap.createBitmap(bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)

            val extension = if (format.lowercase() == "png") "png" else "jpg"
            val outputFile = File(outputDirectory, "page-${(pageIndex + 1).toString().padStart(3, '0')}.$extension")
            FileOutputStream(outputFile).use { stream ->
              if (extension == "png") {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
              } else {
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
              }
            }
            results += RenderedImage(outputFile.absolutePath, bitmap.width, bitmap.height)
            bitmap.recycle()
          }
        }
      }
    }

    return results
  }

  private fun extractMediaFromDocx(inputPath: String, tempDir: File): List<File> {
    val extracted = mutableListOf<File>()

    ZipInputStream(FileInputStream(inputPath)).use { zip ->
      var entry = zip.nextEntry
      while (entry != null) {
        if (!entry.isDirectory && entry.name.startsWith("word/media/")) {
          val file = File(tempDir, File(entry.name).name)
          FileOutputStream(file).use { output ->
            zip.copyTo(output)
          }
          extracted += file
        }
        zip.closeEntry()
        entry = zip.nextEntry
      }
    }

    return extracted.sortedBy { it.name }
  }

  private fun createPdfDocument(
    imagePaths: List<String>,
    outputPath: String,
    documentName: String,
    appName: String,
    createdAt: String,
    pageSize: String,
    imageQuality: Int,
    searchablePages: List<ParsedOcrPage>? = null,
    script: String? = null,
  ) {
    val document = PDDocument()
    val info = PDDocumentInformation().apply {
      title = documentName
      author = appName
      creator = appName
      producer = appName
      creationDate = GregorianCalendar().apply {
        time = java.util.Date.from(Instant.parse(createdAt))
      }
    }
    document.documentInformation = info

    val rectangle = if (pageSize == "LETTER") PDRectangle.LETTER else PDRectangle.A4
    val margin = 24f
    val searchableFont = searchablePages?.takeIf { it.isNotEmpty() }?.let {
      resolvePdfFont(document, script ?: "latin")
    }

    imagePaths.forEachIndexed { index, imagePath ->
      val bitmap = BitmapFactory.decodeFile(imagePath) ?: return@forEachIndexed
      val image = JPEGFactory.createFromImage(document, bitmap, imageQuality.coerceIn(50, 100) / 100f)
      val page = PDPage(rectangle)
      document.addPage(page)

      val availableWidth = rectangle.width - margin * 2f
      val availableHeight = rectangle.height - margin * 2f
      val scale = minOf(
        availableWidth / bitmap.width.toFloat(),
        availableHeight / bitmap.height.toFloat(),
      )
      val drawWidth = bitmap.width * scale
      val drawHeight = bitmap.height * scale
      val originX = (rectangle.width - drawWidth) / 2f
      val originY = (rectangle.height - drawHeight) / 2f

      PDPageContentStream(document, page).use { stream ->
        stream.drawImage(image, originX, originY, drawWidth, drawHeight)
        val searchablePage = searchablePages?.getOrNull(index)
        if (searchablePage != null && searchableFont != null) {
          addInvisibleTextLayer(
            stream = stream,
            font = searchableFont,
            page = searchablePage,
            imageWidth = bitmap.width,
            imageHeight = bitmap.height,
            originX = originX,
            originY = originY,
            drawWidth = drawWidth,
            drawHeight = drawHeight,
          )
        }
      }
      bitmap.recycle()
    }

    FileOutputStream(outputPath).use { outputStream ->
      document.save(outputStream)
    }
    document.close()
  }

  private fun resolvePdfFont(document: PDDocument, script: String): PDFont {
    val candidates =
      when (script) {
        "latin" ->
          listOf(
            "/system/fonts/Roboto-Regular.ttf",
            "/system/fonts/NotoSans-Regular.ttf",
            "/system/fonts/NotoSerif-Regular.ttf",
            "/system/fonts/DroidSans.ttf",
          )
        "devanagari" ->
          listOf(
            "/system/fonts/NotoSansDevanagari-Regular.otf",
            "/system/fonts/NotoSansDevanagari-Regular.ttf",
            "/system/fonts/NotoSerifDevanagari-Regular.otf",
            "/system/fonts/NotoSerifDevanagari-Regular.ttf",
          )
        "japanese" ->
          listOf(
            "/system/fonts/NotoSansJP-Regular.otf",
            "/system/fonts/NotoSansCJK-Regular.ttc",
            "/system/fonts/NotoSansCJKjp-Regular.otf",
          )
        "korean" ->
          listOf(
            "/system/fonts/NotoSansKR-Regular.otf",
            "/system/fonts/NotoSansCJK-Regular.ttc",
            "/system/fonts/NotoSansCJKkr-Regular.otf",
          )
        "chinese" ->
          listOf(
            "/system/fonts/NotoSansSC-Regular.otf",
            "/system/fonts/NotoSansTC-Regular.otf",
            "/system/fonts/NotoSansCJK-Regular.ttc",
            "/system/fonts/NotoSansCJKsc-Regular.otf",
          )
        else -> emptyList()
      }

    val fontFile = candidates.map(::File).firstOrNull(File::exists)
    if (fontFile != null) {
      return PDType0Font.load(document, fontFile)
    }

    if (script == "latin") {
      return PDType1Font.HELVETICA
    }

    throw IllegalStateException(
      "This device does not expose a compatible system font for searchable $script PDF output.",
    )
  }

  private fun addInvisibleTextLayer(
    stream: PDPageContentStream,
    font: PDFont,
    page: ParsedOcrPage,
    imageWidth: Int,
    imageHeight: Int,
    originX: Float,
    originY: Float,
    drawWidth: Float,
    drawHeight: Float,
  ) {
    val scaleX = drawWidth / imageWidth.toFloat()
    val scaleY = drawHeight / imageHeight.toFloat()

    page.orderedLines().forEach { line ->
      val text = sanitizePdfText(line.text)
      if (text.isBlank()) {
        return@forEach
      }

      val boxLeft = originX + (line.bounds.left * imageWidth.toFloat() * scaleX)
      val boxTop = originY + drawHeight - (line.bounds.top * imageHeight.toFloat() * scaleY)
      val boxRight = originX + (line.bounds.right * imageWidth.toFloat() * scaleX)
      val boxBottom = originY + drawHeight - (line.bounds.bottom * imageHeight.toFloat() * scaleY)
      val boxWidth = (boxRight - boxLeft).coerceAtLeast(4f)
      val boxHeight = abs(boxTop - boxBottom).coerceAtLeast(8f)
      val fontSize = boxHeight.coerceIn(7f, 28f)
      val baselineY = minOf(boxTop, boxBottom) + boxHeight * 0.18f

      stream.beginText()
      stream.setRenderingMode(RenderingMode.NEITHER)
      stream.setFont(font, fontSize)

      val measuredWidth =
        ((font.getStringWidth(text).toDouble() / 1000.0) * fontSize.toDouble()).toFloat()
          .coerceAtLeast(1f)
      val horizontalScaling = (boxWidth / measuredWidth * 100f).coerceIn(60f, 160f)
      stream.setHorizontalScaling(horizontalScaling)
      stream.newLineAtOffset(boxLeft, baselineY)
      stream.showText(text)
      stream.endText()
      stream.setHorizontalScaling(100f)
    }
  }

  private fun sanitizePdfText(text: String): String =
    text.replace(Regex("[\\u0000-\\u001F&&[^\\n\\t]]"), " ").replace("\n", " ").trim()

  private fun readOcrPages(array: ReadableArray?): List<ParsedOcrPage> {
    if (array == null || array.size() == 0) {
      throw IllegalArgumentException("Expected OCR page data for searchable PDF export")
    }

    return (0 until array.size()).map { pageIndex ->
      val page = array.getMap(pageIndex) ?: error("Missing OCR page")
      val blocksArray = page.getArray("blocks")
      val blocks = mutableListOf<ParsedOcrBlock>()

      for (blockIndex in 0 until (blocksArray?.size() ?: 0)) {
        val block = blocksArray?.getMap(blockIndex) ?: continue
        val lineArray = block.getArray("lines")
        val lines = mutableListOf<ParsedOcrLine>()

        for (lineIndex in 0 until (lineArray?.size() ?: 0)) {
          val line = lineArray?.getMap(lineIndex) ?: continue
          lines +=
            ParsedOcrLine(
              text = line.getString("text") ?: "",
              bounds = readBounds(line.getMap("bounds")),
            )
        }

        blocks +=
          ParsedOcrBlock(
            text = block.getString("text") ?: "",
            bounds = readBounds(block.getMap("bounds")),
            lines = lines,
          )
      }

      ParsedOcrPage(
        pageNumber = page.getInt("pageNumber"),
        width = page.getInt("width"),
        height = page.getInt("height"),
        text = page.getString("text") ?: "",
        blocks = blocks,
      )
    }
  }

  private fun readBounds(map: ReadableMap?): ParsedOcrBounds =
    ParsedOcrBounds(
      left = map?.getDouble("left")?.toFloat() ?: 0f,
      top = map?.getDouble("top")?.toFloat() ?: 0f,
      right = map?.getDouble("right")?.toFloat() ?: 1f,
      bottom = map?.getDouble("bottom")?.toFloat() ?: 1f,
    )

  private fun createDocxDocument(
    imagePaths: List<String>,
    outputPath: String,
    documentName: String,
    appName: String,
    createdAt: String,
  ) {
    val mediaEntries = imagePaths.mapIndexed { index, path ->
      val extension = File(path).extension.lowercase().ifBlank { "jpg" }
      Triple("word/media/image${index + 1}.$extension", extension, path)
    }

    ZipOutputStream(FileOutputStream(outputPath)).use { zip ->
      writeEntry(zip, "[Content_Types].xml", contentTypesXml(mediaEntries))
      writeEntry(zip, "_rels/.rels", rootRelsXml())
      writeEntry(zip, "docProps/app.xml", appPropsXml(appName))
      writeEntry(zip, "docProps/core.xml", corePropsXml(appName, documentName, createdAt))
      writeEntry(zip, "word/document.xml", documentXml(mediaEntries))
      writeEntry(zip, "word/_rels/document.xml.rels", documentRelsXml(mediaEntries))

      mediaEntries.forEach { entry ->
        zip.putNextEntry(ZipEntry(entry.first))
        FileInputStream(entry.third).use { input ->
          input.copyTo(zip)
        }
        zip.closeEntry()
      }
    }
  }

  private fun writeEntry(zip: ZipOutputStream, path: String, content: String) {
    zip.putNextEntry(ZipEntry(path))
    zip.write(content.toByteArray(Charsets.UTF_8))
    zip.closeEntry()
  }

  private fun contentTypesXml(mediaEntries: List<Triple<String, String, String>>): String {
    val defaults = buildString {
      append("""<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>""")
      append("""<Default Extension="xml" ContentType="application/xml"/>""")
      mediaEntries.map { it.second }.distinct().forEach { extension ->
        val contentType =
          when (extension) {
            "png" -> "image/png"
            else -> "image/jpeg"
          }
        append("""<Default Extension="$extension" ContentType="$contentType"/>""")
      }
    }

    return """
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        $defaults
        <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
        <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>
    """.trimIndent()
  }

  private fun rootRelsXml(): String {
    return """
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
        <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
      </Relationships>
    """.trimIndent()
  }

  private fun appPropsXml(appName: String): String {
    return """
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
        <Application>${xmlEscape(appName)}</Application>
      </Properties>
    """.trimIndent()
  }

  private fun corePropsXml(appName: String, documentName: String, createdAt: String): String {
    return """
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <dc:title>${xmlEscape(documentName)}</dc:title>
        <dc:creator>${xmlEscape(appName)}</dc:creator>
        <cp:lastModifiedBy>${xmlEscape(appName)}</cp:lastModifiedBy>
        <dcterms:created xsi:type="dcterms:W3CDTF">$createdAt</dcterms:created>
        <dcterms:modified xsi:type="dcterms:W3CDTF">$createdAt</dcterms:modified>
      </cp:coreProperties>
    """.trimIndent()
  }

  private fun documentRelsXml(mediaEntries: List<Triple<String, String, String>>): String {
    val relationships = buildString {
      mediaEntries.forEachIndexed { index, entry ->
        append(
          """<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${File(entry.first).name}"/>""",
        )
      }
    }

    return """
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        $relationships
      </Relationships>
    """.trimIndent()
  }

  private fun documentXml(mediaEntries: List<Triple<String, String, String>>): String {
    val body = buildString {
      mediaEntries.forEachIndexed { index, entry ->
        val bitmap = BitmapFactory.decodeFile(entry.third)
        val width = bitmap?.width ?: 1240
        val height = bitmap?.height ?: 1754
        bitmap?.recycle()

        val maxWidthEmu = 5_760_000L
        val scaledHeight = (maxWidthEmu.toDouble() * height.toDouble() / width.toDouble()).roundToInt()
        append(imageParagraphXml(index + 1, maxWidthEmu, scaledHeight.toLong()))
        if (index < mediaEntries.lastIndex) {
          append("""<w:p><w:r><w:br w:type="page"/></w:r></w:p>""")
        }
      }
    }

    return """
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
        <w:body>
          $body
          <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="450" w:footer="450" w:gutter="0"/>
          </w:sectPr>
        </w:body>
      </w:document>
    """.trimIndent()
  }

  private fun imageParagraphXml(index: Int, widthEmu: Long, heightEmu: Long): String {
    val uuid = UUID.randomUUID().toString().replace("-", "")
    return """
      <w:p>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="$widthEmu" cy="$heightEmu"/>
              <wp:docPr id="$index" name="Page $index"/>
              <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
              </wp:cNvGraphicFramePr>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="$index" name="Page $index"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="rId$index"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="$widthEmu" cy="$heightEmu"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
      <w:bookmarkStart w:id="$index" w:name="page_$uuid"/>
      <w:bookmarkEnd w:id="$index"/>
    """.trimIndent()
  }

  private fun xmlEscape(value: String): String {
    return value
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;")
      .replace("\"", "&quot;")
      .replace("'", "&apos;")
  }

  private data class RenderedImage(
    val path: String,
    val width: Int,
    val height: Int,
  )

  private data class ParsedOcrBounds(
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float,
  )

  private data class ParsedOcrLine(
    val text: String,
    val bounds: ParsedOcrBounds,
  )

  private data class ParsedOcrBlock(
    val text: String,
    val bounds: ParsedOcrBounds,
    val lines: List<ParsedOcrLine>,
  )

  private data class ParsedOcrPage(
    val pageNumber: Int,
    val width: Int,
    val height: Int,
    val text: String,
    val blocks: List<ParsedOcrBlock>,
  ) {
    fun orderedLines(): List<ParsedOcrLine> =
      blocks
        .flatMap { it.lines }
        .sortedWith(
          compareBy<ParsedOcrLine> { (it.bounds.top * 1000f).roundToInt() }
            .thenBy { it.bounds.left },
        )
  }
}
