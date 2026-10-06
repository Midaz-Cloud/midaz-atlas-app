package com.midazatlasapp.device

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Debug
import android.os.Process
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.network.OkHttpClientProvider
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import okhttp3.Request

/**
 * Reads the kiosk hardware serial via system properties (ro.serialno).
 * Build.getSerial() often returns "unknown" on API 29+ even with READ_PHONE_STATE.
 */
class KioskDeviceModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "KioskDeviceModule"

  /**
   * Pide a HkaApp que arranque su servicio fiscal (API :8765) y se conecte sola a
   * la impresora, sin abrirla ni sacar al kiosko de primer plano. Broadcast
   * explícito al receiver de HkaApp; FLAG_INCLUDE_STOPPED_PACKAGES para que llegue
   * aunque HkaApp nunca se haya abierto desde que se encendió el equipo.
   * Resuelve false si HkaApp no está instalada.
   */
  @ReactMethod
  fun startFiscalService(promise: Promise) {
    try {
      val context = reactApplicationContext
      val installed = try {
        context.packageManager.getPackageInfo(HKA_PACKAGE, 0)
        true
      } catch (_: Exception) {
        false
      }
      if (!installed) {
        promise.resolve(false)
        return
      }
      val intent = Intent(HKA_START_ACTION).apply {
        component = ComponentName(HKA_PACKAGE, HKA_START_RECEIVER)
        addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES)
      }
      context.sendBroadcast(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("FISCAL_START_ERROR", e.message, e)
    }
  }

  /**
   * Descarga una URL directo a un archivo, sin pasar los bytes por JS. Antes la
   * caché de imágenes bajaba con fetch → arrayBuffer → base64 armado en JS
   * (medio millón de concatenaciones por PNG de 1 MB): dejaba el hilo JS al 100 %
   * durante minutos y cada toque del cliente esperaba en la cola. Escribe a
   * `<dest>.part` y renombra al final, así un corte nunca deja un archivo a medias.
   */
  @ReactMethod
  fun downloadToFile(url: String, destPath: String, timeoutMs: Double, promise: Promise) {
    downloadExecutor.execute {
      val dest = File(destPath)
      // Temporal único por llamada: dos productos con la misma foto (o la sync de
      // arranque y la UI a la vez) escribían el mismo `.part` y el segundo rename fallaba.
      val part = File("$destPath.${java.util.UUID.randomUUID()}.part")
      try {
        dest.parentFile?.mkdirs()
        val client = OkHttpClientProvider.getOkHttpClient()
          .newBuilder()
          .callTimeout(timeoutMs.toLong(), TimeUnit.MILLISECONDS)
          .build()
        val request = Request.Builder().url(url).header("Accept", "image/*,*/*;q=0.8").build()
        client.newCall(request).execute().use { response ->
          if (!response.isSuccessful) {
            promise.reject("HTTP_${response.code}", "HTTP ${response.code}")
            return@execute
          }
          val body = response.body
          if (body == null) {
            promise.reject("EMPTY_BODY", "Empty image body")
            return@execute
          }
          var total = 0L
          body.byteStream().use { input ->
            part.outputStream().use { output ->
              val buffer = ByteArray(64 * 1024)
              while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                output.write(buffer, 0, read)
                total += read
              }
            }
          }
          if (total <= 0L) {
            part.delete()
            promise.reject("EMPTY_BODY", "Empty image body")
            return@execute
          }
          if (dest.exists()) dest.delete()
          if (!part.renameTo(dest)) {
            if (dest.exists() && dest.length() > 0L) {
              // Otra descarga de la misma URL terminó primero: el archivo ya está.
              part.delete()
            } else {
              part.copyTo(dest, overwrite = true)
              part.delete()
            }
          }
          // Se guarda ya reducida: la tarjeta se ve a ~400 px y decodificar un PNG
          // de 1080 px por tarjeta era el retraso visible al abrir el catálogo.
          optimizeImageFile(dest)
          promise.resolve(dest.length().toDouble())
        }
      } catch (e: Exception) {
        part.delete()
        val timeout = e is java.io.InterruptedIOException
        promise.reject(
          if (timeout) "TIMEOUT" else "DOWNLOAD_ERROR",
          if (timeout) "Image cache timeout (native) $url" else (e.message ?: "download failed"),
          e,
        )
      }
    }
  }

  /**
   * Reduce una sola vez las imágenes que ya estaban en caché antes de esta versión.
   * Idempotente: una imagen ya reducida (≤ MAX_IMAGE_SIDE) no se toca. Resuelve
   * cuántas se reescribieron.
   */
  @ReactMethod
  fun optimizeCachedImages(rootPath: String, promise: Promise) {
    downloadExecutor.execute {
      try {
        var changed = 0
        File(rootPath).walkTopDown()
          .filter { it.isFile && !it.name.endsWith(".part") }
          .forEach { if (optimizeImageFile(it)) changed += 1 }
        promise.resolve(changed)
      } catch (e: Exception) {
        promise.reject("OPTIMIZE_ERROR", e.message, e)
      }
    }
  }

  /** true si la reescribió. Nunca deja el archivo roto: escribe a un temporal y renombra. */
  private fun optimizeImageFile(file: File): Boolean {
    return try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.path, bounds)
      val side = maxOf(bounds.outWidth, bounds.outHeight)
      if (side <= 0 || side <= MAX_IMAGE_SIDE) return false
      var sample = 1
      while (side / (sample * 2) >= MAX_IMAGE_SIDE) sample *= 2
      val decoded = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = sample })
        ?: return false
      val scale = MAX_IMAGE_SIDE.toFloat() / maxOf(decoded.width, decoded.height)
      val bitmap = if (scale < 1f) {
        Bitmap.createScaledBitmap(
          decoded,
          (decoded.width * scale).toInt().coerceAtLeast(1),
          (decoded.height * scale).toInt().coerceAtLeast(1),
          true,
        ).also { if (it !== decoded) decoded.recycle() }
      } else {
        decoded
      }
      val tmp = File("${file.path}.${java.util.UUID.randomUUID()}.opt")
      tmp.outputStream().use { out ->
        @Suppress("DEPRECATION")
        bitmap.compress(Bitmap.CompressFormat.WEBP, WEBP_QUALITY, out)
      }
      bitmap.recycle()
      if (tmp.length() <= 0L) {
        tmp.delete()
        return false
      }
      if (!tmp.renameTo(file)) {
        tmp.copyTo(file, overwrite = true)
        tmp.delete()
      }
      true
    } catch (_: Throwable) {
      false
    }
  }

  companion object {
    /** Lado máximo guardado: la tarjeta más grande (detalle) ronda 700 px en el AF910. */
    private const val MAX_IMAGE_SIDE = 720
    private const val WEBP_QUALITY = 85

    /** Pocas descargas a la vez: el AF910 tiene 4 núcleos lentos y Wi‑Fi compartido. */
    private val downloadExecutor = Executors.newFixedThreadPool(2)
    private const val HKA_PACKAGE = "com.thefactory.demoPP9"
    private const val HKA_START_ACTION = "com.thefactory.demoPP9.action.START_FISCAL_SERVICE"
    private const val HKA_START_RECEIVER = "com.thefactory.demoPP9.service.FiscalServiceStartReceiver"
  }

  /**
   * Memoria real del proceso del kiosko y del sistema, para la telemetría de
   * salud (heartbeat cada 5 min + historial local en el menú admin). Sirve para
   * ver si la app crece con las horas sin necesidad de `adb shell dumpsys meminfo`.
   * PSS (KB) es el número que reporta Android por app; `lowMemory` es la señal
   * con la que el sistema empieza a matar procesos de fondo (p.ej. HkaApp).
   */
  @ReactMethod
  fun getProcessMemory(promise: Promise) {
    try {
      val map = Arguments.createMap()
      map.putDouble("pssKb", Debug.getPss().toDouble())
      map.putDouble("nativeHeapKb", Debug.getNativeHeapAllocatedSize() / 1024.0)
      val runtime = Runtime.getRuntime()
      map.putDouble("javaHeapKb", (runtime.totalMemory() - runtime.freeMemory()) / 1024.0)
      val activityManager =
        reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      if (activityManager != null) {
        val info = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(info)
        map.putDouble("systemAvailKb", info.availMem / 1024.0)
        map.putDouble("systemTotalKb", info.totalMem / 1024.0)
        map.putBoolean("lowMemory", info.lowMemory)
      }
      val uptimeMs =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
          SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
        } else {
          -1L
        }
      map.putDouble("processUptimeMs", uptimeMs.toDouble())
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("PROCESS_MEMORY_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun getHardwareSerial(promise: Promise) {
    try {
      promise.resolve(resolveHardwareSerial() ?: "")
    } catch (e: Exception) {
      promise.reject("SERIAL_ERROR", e.message, e)
    }
  }

  private fun resolveHardwareSerial(): String? {
    readSystemProperty("ro.boot.serialno")?.takeIf(::isValidSerial)?.let { return it }
    readSystemProperty("ro.serialno")?.takeIf(::isValidSerial)?.let { return it }
    tryBuildSerial()?.takeIf(::isValidSerial)?.let { return it }
    return null
  }

  private fun isValidSerial(value: String): Boolean {
    val trimmed = value.trim()
    return trimmed.isNotEmpty() && !trimmed.equals("unknown", ignoreCase = true)
  }

  @SuppressLint("HardwareIds", "MissingPermission")
  private fun tryBuildSerial(): String? {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Build.getSerial()
      } else {
        @Suppress("DEPRECATION")
        Build.SERIAL
      }
    } catch (_: SecurityException) {
      null
    }
  }

  private fun readSystemProperty(key: String): String? {
    return try {
      val clazz = Class.forName("android.os.SystemProperties")
      val get = clazz.getMethod("get", String::class.java, String::class.java)
      val value = get.invoke(null, key, "") as String
      value.ifBlank { null }
    } catch (_: Exception) {
      null
    }
  }
}
