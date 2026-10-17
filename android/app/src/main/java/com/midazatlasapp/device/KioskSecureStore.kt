package com.midazatlasapp.device

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Almacén seguro del kiosko: valores cifrados con AES-GCM usando una llave del
 * AndroidKeyStore (no exportable) y guardados en SharedPreferences privadas.
 * Guarda el secreto del equipo (vínculo por equipo) y el token de sesión.
 * Formato por valor: base64(iv) + ":" + base64(texto cifrado).
 */
class KioskSecureStore(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun set(key: String, value: String) {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, secretKey())
    val encrypted = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
    val packed = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
      Base64.encodeToString(encrypted, Base64.NO_WRAP)
    // commit(): el secreto tiene que estar en disco antes de confirmar el vínculo.
    check(prefs.edit().putString(key, packed).commit()) { "No se pudo guardar $key" }
  }

  /** null si no existe o no se puede descifrar (llave invalidada): se trata como "no hay valor". */
  @Synchronized
  fun get(key: String): String? {
    val packed = prefs.getString(key, null) ?: return null
    return try {
      val parts = packed.split(":")
      if (parts.size != 2) return null
      val iv = Base64.decode(parts[0], Base64.NO_WRAP)
      val data = Base64.decode(parts[1], Base64.NO_WRAP)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, iv))
      String(cipher.doFinal(data), StandardCharsets.UTF_8)
    } catch (_: Exception) {
      null
    }
  }

  @Synchronized
  fun remove(key: String) {
    prefs.edit().remove(key).commit()
  }

  private fun secretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    (keyStore.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    generator.init(
      KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build(),
    )
    return generator.generateKey()
  }

  companion object {
    const val DEVICE_SECRET_KEY = "device_secret"
    private const val PREFS = "kiosk_secure_store"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val ALIAS = "midaz_kiosk_secure_store_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val TAG_BITS = 128
  }
}
