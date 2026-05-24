package com.hexmon.kaagaz.nativebridge

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class KaagazImageProcessorModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "KaagazImageProcessor"

  @ReactMethod
  fun applyCropAndProcess(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val thumbnailPath = options.getString("thumbnailPath") ?: error("Missing thumbnailPath")
        val colorMode = options.getString("colorMode") ?: "color"
        val jpegQuality = options.getInt("jpegQuality")
        val cropPoints = readCropPoints(options.getArray("cropPoints"))

        File(outputPath).parentFile?.mkdirs()
        File(thumbnailPath).parentFile?.mkdirs()

        val sourceBitmap = loadBitmapWithOrientation(inputPath)
        val croppedBitmap = cropPerspective(sourceBitmap, cropPoints)
        val processedBitmap = runDocumentEnhancement(croppedBitmap, colorMode)

        saveJpeg(processedBitmap, outputPath, jpegQuality)
        val thumbBitmap = createThumbnail(processedBitmap, 360)
        saveJpeg(thumbBitmap, thumbnailPath, 82)

        val result =
          buildResult(
            outputPath = outputPath,
            thumbnailPath = thumbnailPath,
            width = processedBitmap.width,
            height = processedBitmap.height,
          )

        recycleSafely(sourceBitmap)
        recycleSafely(croppedBitmap, sourceBitmap)
        recycleSafely(processedBitmap, croppedBitmap)
        recycleSafely(thumbBitmap, processedBitmap)

        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("IMAGE_PROCESSING_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun processImage(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val inputPath = options.getString("inputPath") ?: error("Missing inputPath")
        val outputPath = options.getString("outputPath") ?: error("Missing outputPath")
        val thumbnailPath = options.getString("thumbnailPath")
        val colorMode = options.getString("colorMode") ?: "color"
        val jpegQuality = options.getInt("jpegQuality")
        val rotateDegrees = options.getInt("rotateDegrees")
        val maxLongEdge = options.getInt("maxLongEdge")
        val enhance = options.getBoolean("enhance")

        File(outputPath).parentFile?.mkdirs()
        thumbnailPath?.let { File(it).parentFile?.mkdirs() }

        val sourceBitmap = loadBitmapWithOrientation(inputPath)
        val rotatedBitmap = rotateBitmap(sourceBitmap, rotateDegrees)
        val sizedBitmap = scaleDown(rotatedBitmap, maxLongEdge)
        val processedBitmap =
          if (enhance) runDocumentEnhancement(sizedBitmap, colorMode) else sizedBitmap

        saveJpeg(processedBitmap, outputPath, jpegQuality)

        if (thumbnailPath != null) {
          val thumbBitmap = createThumbnail(processedBitmap, 360)
          saveJpeg(thumbBitmap, thumbnailPath, 82)
          recycleSafely(thumbBitmap, processedBitmap)
        }

        val result =
          buildResult(
            outputPath = outputPath,
            thumbnailPath = thumbnailPath,
            width = processedBitmap.width,
            height = processedBitmap.height,
          )

        recycleSafely(sourceBitmap)
        recycleSafely(rotatedBitmap, sourceBitmap)
        recycleSafely(sizedBitmap, rotatedBitmap)
        recycleSafely(processedBitmap, sizedBitmap)

        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("IMAGE_PROCESSING_FAILED", error)
      }
    }
  }

  private fun buildResult(
    outputPath: String,
    thumbnailPath: String?,
    width: Int,
    height: Int,
  ) = Arguments.createMap().apply {
    putString("processedImagePath", outputPath)
    putString("thumbnailPath", thumbnailPath ?: outputPath)
    putInt("width", width)
    putInt("height", height)
  }

  private fun recycleSafely(bitmap: Bitmap, reference: Bitmap? = null) {
    if (reference == bitmap) {
      return
    }
    if (!bitmap.isRecycled) {
      bitmap.recycle()
    }
  }

  private fun readCropPoints(pointsArray: ReadableArray?): FloatArray {
    if (pointsArray == null || pointsArray.size() != 4) {
      throw IllegalArgumentException("cropPoints must contain four points")
    }

    val values = FloatArray(8)
    for (index in 0 until 4) {
      val point = pointsArray.getMap(index) ?: throw IllegalArgumentException("Invalid crop point")
      values[index * 2] = point.getDouble("x").toFloat()
      values[index * 2 + 1] = point.getDouble("y").toFloat()
    }

    return values
  }

  private fun loadBitmapWithOrientation(path: String): Bitmap {
    val bitmap = BitmapFactory.decodeFile(path) ?: throw IllegalStateException("Cannot decode image")
    val matrix = Matrix()
    val exif = ExifInterface(path)
    when (exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
    }

    return if (matrix.isIdentity) {
      bitmap
    } else {
      val adjusted = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      bitmap.recycle()
      adjusted
    }
  }

  private fun rotateBitmap(source: Bitmap, degrees: Int): Bitmap {
    val normalized = ((degrees % 360) + 360) % 360
    if (normalized == 0) {
      return source
    }

    val matrix = Matrix().apply { postRotate(normalized.toFloat()) }
    return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
  }

  private fun scaleDown(source: Bitmap, maxLongEdge: Int): Bitmap {
    if (maxLongEdge <= 0) {
      return source
    }

    val longEdge = max(source.width, source.height)
    if (longEdge <= maxLongEdge) {
      return source
    }

    val scale = maxLongEdge.toFloat() / longEdge.toFloat()
    val targetWidth = max(1, (source.width * scale).roundToInt())
    val targetHeight = max(1, (source.height * scale).roundToInt())
    return Bitmap.createScaledBitmap(source, targetWidth, targetHeight, true)
  }

  private fun cropPerspective(bitmap: Bitmap, points: FloatArray): Bitmap {
    val outputSize = computeOutputSize(points)
    val destination = floatArrayOf(
      0f,
      0f,
      outputSize.first.toFloat(),
      0f,
      outputSize.first.toFloat(),
      outputSize.second.toFloat(),
      0f,
      outputSize.second.toFloat(),
    )
    val matrix = Matrix()
    matrix.setPolyToPoly(points, 0, destination, 0, 4)

    val output = Bitmap.createBitmap(
      max(1, outputSize.first),
      max(1, outputSize.second),
      Bitmap.Config.ARGB_8888,
    )
    val canvas = Canvas(output)
    canvas.drawColor(Color.WHITE)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      isFilterBitmap = true
      isDither = true
    }
    canvas.drawBitmap(bitmap, matrix, paint)
    return output
  }

  private fun computeOutputSize(points: FloatArray): Pair<Int, Int> {
    val topWidth = distance(points[0], points[1], points[2], points[3])
    val bottomWidth = distance(points[6], points[7], points[4], points[5])
    val leftHeight = distance(points[0], points[1], points[6], points[7])
    val rightHeight = distance(points[2], points[3], points[4], points[5])
    return Pair(max(topWidth, bottomWidth).roundToInt(), max(leftHeight, rightHeight).roundToInt())
  }

  private fun distance(x1: Float, y1: Float, x2: Float, y2: Float): Float {
    return kotlin.math.hypot((x2 - x1).toDouble(), (y2 - y1).toDouble()).toFloat()
  }

  private fun runDocumentEnhancement(source: Bitmap, colorMode: String): Bitmap {
    return if (colorMode == "bw") {
      applyAdaptiveThreshold(source)
    } else {
      enhanceColorDocument(source)
    }
  }

  private fun enhanceColorDocument(source: Bitmap): Bitmap {
    val width = source.width
    val height = source.height
    val pixels = IntArray(width * height)
    source.getPixels(pixels, 0, width, 0, 0, width, height)

    var luminanceTotal = 0L
    pixels.forEach { pixel ->
      val lum =
        (0.299f * Color.red(pixel) + 0.587f * Color.green(pixel) + 0.114f * Color.blue(pixel)).roundToInt()
      luminanceTotal += lum
    }

    val averageLum = luminanceTotal.toFloat() / pixels.size.toFloat()
    val brightnessDelta = 206f - averageLum
    val contrast = 1.08f
    val saturation = 1.04f

    for (index in pixels.indices) {
      val pixel = pixels[index]
      val alpha = Color.alpha(pixel)
      val red = adjustChannel(Color.red(pixel), brightnessDelta, contrast)
      val green = adjustChannel(Color.green(pixel), brightnessDelta, contrast)
      val blue = adjustChannel(Color.blue(pixel), brightnessDelta, contrast)
      val lum = 0.299f * red + 0.587f * green + 0.114f * blue
      val finalRed = clampColor((lum + (red - lum) * saturation).roundToInt())
      val finalGreen = clampColor((lum + (green - lum) * saturation).roundToInt())
      val finalBlue = clampColor((lum + (blue - lum) * saturation).roundToInt())
      pixels[index] = Color.argb(alpha, finalRed, finalGreen, finalBlue)
    }

    return Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
  }

  private fun adjustChannel(value: Int, brightnessDelta: Float, contrast: Float): Int {
    val adjusted = (((value - 128f) * contrast) + 128f + brightnessDelta).roundToInt()
    return clampColor(adjusted)
  }

  private fun applyAdaptiveThreshold(source: Bitmap): Bitmap {
    val width = source.width
    val height = source.height
    val pixels = IntArray(width * height)
    val grayscale = IntArray(width * height)
    val integral = LongArray(width * height)
    source.getPixels(pixels, 0, width, 0, 0, width, height)

    for (y in 0 until height) {
      var rowSum = 0L
      for (x in 0 until width) {
        val index = y * width + x
        val pixel = pixels[index]
        val gray =
          (0.299f * Color.red(pixel) + 0.587f * Color.green(pixel) + 0.114f * Color.blue(pixel))
            .roundToInt()
        grayscale[index] = gray
        rowSum += gray.toLong()
        integral[index] = rowSum + if (y > 0) integral[index - width] else 0L
      }
    }

    val output = IntArray(width * height)
    val window = max(16, min(width, height) / 12)
    val half = window / 2

    for (y in 0 until height) {
      val top = max(0, y - half)
      val bottom = min(height - 1, y + half)
      for (x in 0 until width) {
        val left = max(0, x - half)
        val right = min(width - 1, x + half)
        val area = (right - left + 1) * (bottom - top + 1)
        val sum = regionSum(integral, width, left, top, right, bottom)
        val threshold = (sum.toFloat() / area.toFloat()) * 0.88f
        val value = if (grayscale[y * width + x] > threshold) 255 else 0
        output[y * width + x] = Color.argb(255, value, value, value)
      }
    }

    return Bitmap.createBitmap(output, width, height, Bitmap.Config.ARGB_8888)
  }

  private fun regionSum(
    integral: LongArray,
    width: Int,
    left: Int,
    top: Int,
    right: Int,
    bottom: Int,
  ): Long {
    val bottomRight = integral[bottom * width + right]
    val topRight = if (top > 0) integral[(top - 1) * width + right] else 0
    val bottomLeft = if (left > 0) integral[bottom * width + (left - 1)] else 0
    val topLeft =
      if (top > 0 && left > 0) integral[(top - 1) * width + (left - 1)] else 0
    return bottomRight - topRight - bottomLeft + topLeft
  }

  private fun createThumbnail(source: Bitmap, maxDimension: Int): Bitmap {
    val aspect = source.width.toFloat() / source.height.toFloat()
    val width: Int
    val height: Int
    if (source.width >= source.height) {
      width = maxDimension
      height = max(1, (maxDimension / aspect).roundToInt())
    } else {
      height = maxDimension
      width = max(1, (maxDimension * aspect).roundToInt())
    }

    return Bitmap.createScaledBitmap(source, width, height, true)
  }

  private fun saveJpeg(bitmap: Bitmap, outputPath: String, quality: Int) {
    FileOutputStream(outputPath).use { outputStream ->
      bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
      outputStream.flush()
    }
  }

  private fun clampColor(value: Int): Int = max(0, min(255, value))
}
