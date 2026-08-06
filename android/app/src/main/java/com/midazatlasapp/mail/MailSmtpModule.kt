package com.midazatlasapp.mail

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.util.Properties
import javax.activation.DataHandler
import javax.activation.FileDataSource
import javax.mail.Authenticator
import javax.mail.Message
import javax.mail.PasswordAuthentication
import javax.mail.Session
import javax.mail.Transport
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeBodyPart
import javax.mail.internet.MimeMessage
import javax.mail.internet.MimeMultipart
import kotlin.concurrent.thread

/**
 * Sends email via SMTP (SSL/TLS) with optional file attachments.
 * Used for POS settlement Excel reports from the kiosk.
 */
class MailSmtpModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MailSmtpModule"

  @ReactMethod
  fun sendMail(options: ReadableMap, promise: Promise) {
    thread(name = "MailSmtpSend") {
      try {
        val host = requiredString(options, "host")
        val port = if (options.hasKey("port")) options.getInt("port") else 465
        val secure = if (options.hasKey("secure")) options.getBoolean("secure") else port == 465
        val user = requiredString(options, "user")
        val pass = requiredString(options, "pass")
        val fromAddress = requiredString(options, "fromAddress")
        val fromName =
          if (options.hasKey("fromName") && !options.isNull("fromName")) {
            options.getString("fromName")
          } else {
            null
          }
        val to = requiredString(options, "to")
        val subject =
          if (options.hasKey("subject") && !options.isNull("subject")) {
            options.getString("subject") ?: ""
          } else {
            ""
          }
        val bodyText =
          if (options.hasKey("bodyText") && !options.isNull("bodyText")) {
            options.getString("bodyText") ?: ""
          } else {
            ""
          }
        val bodyHtml =
          if (options.hasKey("bodyHtml") && !options.isNull("bodyHtml")) {
            options.getString("bodyHtml")
          } else {
            null
          }

        val props = Properties()
        props["mail.smtp.host"] = host
        props["mail.smtp.port"] = port.toString()
        props["mail.smtp.auth"] = "true"
        if (secure) {
          props["mail.smtp.ssl.enable"] = "true"
          props["mail.smtp.socketFactory.port"] = port.toString()
          props["mail.smtp.socketFactory.class"] = "javax.net.ssl.SSLSocketFactory"
          props["mail.smtp.socketFactory.fallback"] = "false"
        } else {
          props["mail.smtp.starttls.enable"] = "true"
        }
        // Corporate SMTP may present intermediate/self-signed chains on kiosk LAN.
        props["mail.smtp.ssl.trust"] = host

        val session =
          Session.getInstance(
            props,
            object : Authenticator() {
              override fun getPasswordAuthentication(): PasswordAuthentication {
                return PasswordAuthentication(user, pass)
              }
            },
          )

        val message = MimeMessage(session)
        if (fromName.isNullOrBlank()) {
          message.setFrom(InternetAddress(fromAddress))
        } else {
          message.setFrom(InternetAddress(fromAddress, fromName))
        }
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to, false))
        message.subject = subject

        val multipart = MimeMultipart()
        val textPart = MimeBodyPart()
        if (!bodyHtml.isNullOrBlank()) {
          textPart.setContent(bodyHtml, "text/html; charset=utf-8")
        } else {
          textPart.setText(bodyText, "utf-8")
        }
        multipart.addBodyPart(textPart)

        if (options.hasKey("attachments") && !options.isNull("attachments")) {
          val attachments: ReadableArray = options.getArray("attachments")!!
          for (i in 0 until attachments.size()) {
            val item = attachments.getMap(i) ?: continue
            val path = item.getString("path") ?: continue
            val name =
              if (item.hasKey("name") && !item.isNull("name")) {
                item.getString("name") ?: path.substringAfterLast('/')
              } else {
                path.substringAfterLast('/')
              }
            val filePart = MimeBodyPart()
            val dataSource = FileDataSource(path)
            filePart.dataHandler = DataHandler(dataSource)
            filePart.fileName = name
            multipart.addBodyPart(filePart)
          }
        }

        message.setContent(multipart)
        Transport.send(message)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("SMTP_SEND_ERROR", e.message ?: "Error al enviar correo SMTP", e)
      }
    }
  }

  private fun requiredString(options: ReadableMap, key: String): String {
    if (!options.hasKey(key) || options.isNull(key)) {
      throw IllegalArgumentException("Falta el campo SMTP: $key")
    }
    return options.getString(key)?.trim()?.takeIf { it.isNotEmpty() }
      ?: throw IllegalArgumentException("Campo SMTP vacío: $key")
  }
}
