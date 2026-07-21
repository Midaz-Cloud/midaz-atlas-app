package com.midazatlasapp.device

import android.annotation.SuppressLint
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
