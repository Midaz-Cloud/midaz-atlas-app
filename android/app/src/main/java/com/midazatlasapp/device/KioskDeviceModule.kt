package com.midazatlasapp.device

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

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

  companion object {
    private const val HKA_PACKAGE = "com.thefactory.demoPP9"
    private const val HKA_START_ACTION = "com.thefactory.demoPP9.action.START_FISCAL_SERVICE"
    private const val HKA_START_RECEIVER = "com.thefactory.demoPP9.service.FiscalServiceStartReceiver"
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
