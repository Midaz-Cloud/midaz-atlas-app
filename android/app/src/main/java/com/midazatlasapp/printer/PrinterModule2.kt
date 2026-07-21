package com.midazatlasapp.printer

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import net.posprinter.IPOSListener
import net.posprinter.POSConnect
import net.posprinter.POSPrinter
import org.json.JSONObject

class PrinterModule2(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {
    private var printer: POSPrinter? = null
    private val TAG = "PrinterModule2"
    private var curConnect: net.posprinter.IDeviceConnection? = null

    /** Extra wait after the SDK print queue is empty (USB in-flight). */
    private val postPrintDrainMs = 400L

    /**
     * POS SDK queues [sendData] in a background thread. [IDeviceConnection.close] clears that queue,
     * so disconnecting immediately drops the ticket.
     */
    private fun waitForPrintQueueDrain(maxWaitMs: Long = 8000) {
        val conn = curConnect ?: return
        var clazz: Class<*>? = conn.javaClass
        while (clazz != null) {
            try {
                val field = clazz.getDeclaredField("d")
                field.isAccessible = true
                @Suppress("UNCHECKED_CAST")
                val queue =
                        field.get(conn) as java.util.concurrent.LinkedBlockingQueue<ByteArray>
                val deadline = System.currentTimeMillis() + maxWaitMs
                while (System.currentTimeMillis() < deadline) {
                    if (queue.isEmpty()) {
                        Log.d(TAG, "Print queue drained")
                        Thread.sleep(postPrintDrainMs)
                        return
                    }
                    Thread.sleep(50)
                }
                Log.w(TAG, "Print queue still has ${queue.size} chunk(s) after ${maxWaitMs}ms")
                return
            } catch (_: NoSuchFieldException) {
                clazz = clazz.superclass
            } catch (e: Exception) {
                Log.w(TAG, "waitForPrintQueueDrain reflection failed, using fallback sleep", e)
                Thread.sleep(2000)
                return
            }
        }
        Log.w(TAG, "Print queue field not found, using fallback sleep")
        Thread.sleep(2000)
    }

    private fun finishPrintJob() {
        waitForPrintQueueDrain()
    }

    /** CP1252 / ESC/POS: strip accents and non-ASCII to avoid mojibake (e.g. CJK glyphs). */
    private fun sanitizePrinterText(text: String): String {
        var result =
                text.replace('ñ', 'n')
                        .replace('Ñ', 'N')
                        .replace('¿', '?')
                        .replace('¡', '!')
        result =
                java.text.Normalizer.normalize(result, java.text.Normalizer.Form.NFD)
                        .replace(Regex("\\p{M}+"), "")
        return result.replace(Regex("[^\\t\\n\\r\\x20-\\x7E]"), "")
    }

    init {
        Log.d(TAG, "Iniciando mÃ³dulo de impresora...")
        try {
            if (reactContext.applicationContext == null) {
                Log.e(TAG, "Error: Contexto de aplicaciÃ³n es nulo")
                sendEvent("printerError", "Error: Contexto de aplicaciÃ³n es nulo")
            } else {
                POSConnect.init(reactContext.applicationContext)
                Log.d(
                        TAG,
                        "InicializaciÃ³n completada con contexto: ${reactContext.applicationContext}"
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error crÃ­tico durante la inicializaciÃ³n del mÃ³dulo", e)
            e.printStackTrace()
            sendEvent("printerError", "Error al inicializar mÃ³dulo: ${e.message}")
        }
    }

    @ReactMethod
    fun connectPrinter(promise: Promise) {
        try {
            Log.d(TAG, "Conectando a impresora USB...")
            curConnect?.let {
                Log.d(TAG, "Cerrando conexiÃ³n existente")
                // it.close() // Avoid closing immediately if re-using, but safe to recreate
            }

            Log.d(TAG, "Creando nueva conexiÃ³n USB")
            curConnect = POSConnect.createDevice(POSConnect.DEVICE_TYPE_USB)

            val usbList = POSConnect.getUsbDevices(reactApplicationContext)
            Log.d(TAG, "Dispositivos USB encontrados: ${usbList.size}")

            if (usbList.isEmpty()) {
                Log.e(TAG, "No se encontraron impresoras USB")
                promise.reject("NO_USB_DEVICE", "No se encontraron impresoras USB")
                return
            }

            Log.d(TAG, "Intentando conectar al dispositivo USB: ${usbList[0]}")
            curConnect?.connect(
                    usbList[0],
                    object : IPOSListener {
                        override fun onStatus(code: Int, msg: String?) {
                            when (code) {
                                POSConnect.CONNECT_SUCCESS -> {
                                    Log.d(
                                            TAG,
                                            "ConexiÃ³n exitosa - Creando nueva instancia de impresora"
                                    )
                                    printer = POSPrinter(curConnect)
                                    Log.d(TAG, "Instancia de impresora creada: ${printer != null}")
                                    sendEvent(
                                            "printerConnected",
                                            "Impresora conectada exitosamente"
                                    )
                                    promise.resolve("Impresora conectada exitosamente")
                                }
                                POSConnect.CONNECT_FAIL -> {
                                    Log.e(TAG, "FallÃ³ la conexiÃ³n con mensaje: $msg")
                                    sendEvent("printerError", "FallÃ³ la conexiÃ³n: $msg")
                                    promise.reject("CONNECTION_FAILED", msg)
                                }
                                else -> connectListener.onStatus(code, msg)
                            }
                        }
                    }
            )
            Log.d(TAG, "Solicitud de conexiÃ³n enviada")
        } catch (e: Exception) {
            Log.e(TAG, "Error al conectar con la impresora", e)
            e.printStackTrace()
            promise.reject("CONNECTION_ERROR", e.message)
        }
    }

    override fun getName(): String {
        return "PrinterModule2"
    }

    private val connectListener = IPOSListener { code, msg ->
        Log.d(TAG, "CÃ³digo de estado de conexiÃ³n recibido: $code, mensaje: $msg")
        when (code) {
            POSConnect.CONNECT_SUCCESS -> {
                Log.d(TAG, "ConexiÃ³n exitosa - Creando nueva instancia de impresora")
                printer = POSPrinter(curConnect)
                Log.d(TAG, "Instancia de impresora creada: ${printer != null}")
                sendEvent("printerConnected", "Impresora conectada exitosamente")
            }
            POSConnect.CONNECT_FAIL -> {
                Log.e(TAG, "FallÃ³ la conexiÃ³n con mensaje: $msg")
                sendEvent("printerError", "FallÃ³ la conexiÃ³n: $msg")
            }
            POSConnect.CONNECT_INTERRUPT -> {
                Log.e(TAG, "ConexiÃ³n interrumpida")
                sendEvent("printerError", "ConexiÃ³n interrumpida")
            }
            POSConnect.SEND_FAIL -> {
                Log.e(TAG, "FallÃ³ el envÃ­o")
                sendEvent("printerError", "FallÃ³ el envÃ­o de datos")
            }
            POSConnect.USB_DETACHED -> {
                Log.d(TAG, "Dispositivo USB desconectado")
                sendEvent("printerStatus", "Dispositivo USB desconectado")
            }
            POSConnect.USB_ATTACHED -> {
                Log.d(TAG, "Dispositivo USB conectado")
                sendEvent("printerStatus", "Dispositivo USB conectado")
            }
        }
    }

    @ReactMethod
    fun printText(text: String, merchantName: String, qrValue: String, promise: Promise) {
        try {
            Log.d(TAG, "Iniciando proceso de impresiÃ³n...")

            if (printer == null || curConnect?.isConnect != true) {
                Log.e(TAG, "Impresora no conectada")
                promise.reject("NOT_CONNECTED", "Impresora no conectada")
                return
            }

            // Comandos ESC/POS
            val ESC_INIT = byteArrayOf(0x1B, 0x40)
            val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
            val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
            val BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
            val BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
            val DOUBLE_HEIGHT = byteArrayOf(0x1B, 0x21, 0x10)
            val NORMAL_SIZE = byteArrayOf(0x1B, 0x21, 0x00)
            val CUT_PAPER = byteArrayOf(0x1D, 0x56, 0x01)

            // ConfiguraciÃ³n de caracteres
            val SET_LATIN = byteArrayOf(0x1B, 0x52, 0x08)
            val CODEPAGE = byteArrayOf(0x1B, 0x74, 0x10) // WPC1252
            val FONT_ENCODING = java.nio.charset.Charset.forName("Cp1252")
            val safeBody = sanitizePrinterText(text)
            val trackingQr = sanitizePrinterText(qrValue.trim())

            printer?.apply {
                // Inicializar impresora
                sendData(ESC_INIT)
                sendData(SET_LATIN)
                sendData(CODEPAGE)

                if (trackingQr.isNotEmpty()) {
                    printTrackingQrTop(trackingQr, ALIGN_CENTER, FONT_ENCODING)
                }

                val merchantLabel = sanitizePrinterText(merchantName.trim())
                val isSettlementTicket = merchantLabel.contains("CIERRE", ignoreCase = true)

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // ENCABEZADO (sin logo legacy DISCONNECT)
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_CENTER)
                sendData(DOUBLE_HEIGHT)
                sendData(BOLD_ON)
                val headerTitle = if (isSettlementTicket) "CIERRE DE LOTE\n" else "COMPROBANTE\n"
                sendData(headerTitle.toByteArray(FONT_ENCODING))
                sendData(BOLD_OFF)
                sendData(NORMAL_SIZE)

                if (merchantLabel.isNotEmpty()) {
                    sendData(BOLD_ON)
                    sendData("$merchantLabel\n".toByteArray(FONT_ENCODING))
                    sendData(BOLD_OFF)
                }
                sendData("\n".toByteArray(FONT_ENCODING))

                // Fecha y hora
                val currentDateTime =
                        java.text.SimpleDateFormat(
                                        "dd/MM/yyyy HH:mm:ss",
                                        java.util.Locale("es", "ES")
                                )
                                .format(java.util.Date())

                sendData("Fecha: $currentDateTime\n".toByteArray(FONT_ENCODING))
                sendData("--------------------------------\n".toByteArray(FONT_ENCODING))

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 3: CONTENIDO PRINCIPAL
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_LEFT)
                sendData(safeBody.toByteArray(FONT_ENCODING))
                sendData("\n".toByteArray(FONT_ENCODING))

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 4: PIE DE PÃGINA
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_CENTER)
                sendData("--------------------------------\n".toByteArray(FONT_ENCODING))
                if (!isSettlementTicket) {
                    sendData(BOLD_ON)
                    sendData("! Gracias por su compra !\n".toByteArray(FONT_ENCODING))
                    sendData(BOLD_OFF)
                    sendData("Conserve este comprobante\n".toByteArray(FONT_ENCODING))
                }
                sendData("\n\n\n".toByteArray(FONT_ENCODING))

                // Cortar papel
                sendData(CUT_PAPER)
                finishPrintJob()

                Log.d(TAG, "ImpresiÃ³n completada exitosamente (body ${text.length} chars)")
                promise.resolve("ImpresiÃ³n exitosa")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error durante la impresiÃ³n", e)
            promise.reject("PRINT_ERROR", "Error al imprimir: ${e.message}")
        }
    }

    /** Pixel size of tracking QR bitmap printed at ticket top. */
    private val trackingQrSizePx = 240

    /**
     * QR de tracking al inicio del ticket (UPDATE-8 · printQrEnabled).
     * Renders [qrValue] as a bitmap via ZXing and prints with [printBitmap]
     * (same path as logos). Never prints the URL as plain text.
     */
    private fun printTrackingQrTop(
            qrValue: String,
            alignCenter: ByteArray,
            encoding: java.nio.charset.Charset,
    ) {
        val bitmap =
                try {
                    encodeTrackingQrBitmap(qrValue, trackingQrSizePx)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to encode tracking QR bitmap", e)
                    return
                }

        try {
            printer?.apply {
                sendData(alignCenter)
                try {
                    val printBitmapMethod =
                            this::class.java.getMethod(
                                    "printBitmap",
                                    android.graphics.Bitmap::class.java,
                                    Int::class.java,
                                    Int::class.java
                            )
                    printBitmapMethod.invoke(this, bitmap, 1, bitmap.width)
                } catch (e: Exception) {
                    Log.w(TAG, "printBitmap unavailable for tracking QR; skipping QR", e)
                }
                sendData("\n".toByteArray(encoding))
            }
        } finally {
            bitmap.recycle()
        }
    }

    /** Builds a black-on-white QR [Bitmap] for the tracking URL. */
    private fun encodeTrackingQrBitmap(content: String, sizePx: Int): android.graphics.Bitmap {
        val hints =
                mapOf(
                        com.google.zxing.EncodeHintType.MARGIN to 1,
                        com.google.zxing.EncodeHintType.ERROR_CORRECTION to
                                com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.M,
                )
        val matrix =
                com.google.zxing.qrcode.QRCodeWriter()
                        .encode(
                                content,
                                com.google.zxing.BarcodeFormat.QR_CODE,
                                sizePx,
                                sizePx,
                                hints,
                        )
        val width = matrix.width
        val height = matrix.height
        val pixels = IntArray(width * height)
        for (y in 0 until height) {
            val offset = y * width
            for (x in 0 until width) {
                pixels[offset + x] =
                        if (matrix.get(x, y)) {
                            android.graphics.Color.BLACK
                        } else {
                            android.graphics.Color.WHITE
                        }
            }
        }
        return android.graphics.Bitmap.createBitmap(
                        width,
                        height,
                        android.graphics.Bitmap.Config.ARGB_8888,
                )
                .also { it.setPixels(pixels, 0, width, 0, 0, width, height) }
    }

    /** Imprime el logo de la empresa */
    private fun printLogo(alignCenter: ByteArray, encoding: java.nio.charset.Charset) {
        try {
            val logoResId =
                    reactApplicationContext.resources.getIdentifier(
                            "logo_DISCONNECT",
                            "drawable",
                            reactApplicationContext.packageName
                    )

            if (logoResId > 0) {
                val options =
                        android.graphics.BitmapFactory.Options().apply {
                            inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888
                        }

                val logoBitmap =
                        android.graphics.BitmapFactory.decodeResource(
                                reactApplicationContext.resources,
                                logoResId,
                                options
                        )

                logoBitmap?.let { bitmap ->
                    val maxWidth = 384
                    val scaledBitmap =
                            if (bitmap.width > maxWidth) {
                                android.graphics.Bitmap.createScaledBitmap(
                                        bitmap,
                                        maxWidth,
                                        (bitmap.height * (maxWidth.toFloat() / bitmap.width))
                                                .toInt(),
                                        true
                                )
                            } else {
                                bitmap
                            }

                    printer?.apply {
                        sendData(alignCenter)
                        try {
                            val printBitmapMethod =
                                    this::class.java.getMethod(
                                            "printBitmap",
                                            android.graphics.Bitmap::class.java,
                                            Int::class.java,
                                            Int::class.java
                                    )
                            printBitmapMethod.invoke(this, scaledBitmap, 1, scaledBitmap.width)
                        } catch (e: Exception) {
                            sendData("DISCONNECT\n".toByteArray(encoding))
                        }
                        sendData("\n".toByteArray(encoding))
                    }

                    if (scaledBitmap != bitmap) scaledBitmap.recycle()
                    bitmap.recycle()
                }
            } else {
                // Logo de texto alternativo
                printer?.apply {
                    sendData(alignCenter)
                    sendData(byteArrayOf(0x1B, 0x45, 0x01)) // Bold ON
                    sendData("DISCONNECT\n".toByteArray(encoding))
                    sendData(byteArrayOf(0x1B, 0x45, 0x00)) // Bold OFF
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al imprimir logo", e)
            printer?.apply {
                sendData(alignCenter)
                sendData("DISCONNECT\n".toByteArray(encoding))
            }
        }
    }

    @ReactMethod
    fun printPaymentReceipt(paymentJson: String, promise: Promise) {
        try {
            Log.d(TAG, "Iniciando impresiÃ³n de recibo de pago...")

            if (printer == null || curConnect?.isConnect != true) {
                Log.e(TAG, "Impresora no conectada")
                promise.reject("NOT_CONNECTED", "Impresora no conectada")
                return
            }

            // Parsear datos del pago
            val paymentData = JSONObject(paymentJson)
            val reference = paymentData.optString("referenceNumber", "N/A")
            val amount = paymentData.optString("amount", "0.00")
            val responseMessage = paymentData.optString("responseMessage", "APPROVED")
            val terminalID = paymentData.optString("terminalID", "N/A")
            val merchantID = paymentData.optString("merchantID", "N/A")
            val rrn = paymentData.optString("RRN", "N/A")
            val traceNumber = paymentData.optString("traceNumber", "N/A")
            val batchNum = paymentData.optString("batchNum", "N/A")
            val date = paymentData.optString("date", "N/A")
            val time = paymentData.optString("time", "N/A")
            val cardId = paymentData.optString("cardId", "N/A")
            val cardNumber = paymentData.optString("cardNumber", "****")
            val paymentType = paymentData.optString("paymentType", "POS")
            val mobileBank = paymentData.optString("mobileBank", "")
            val mobilePhone = paymentData.optString("mobilePhone", "")

            // Comandos ESC/POS
            val ESC_INIT = byteArrayOf(0x1B, 0x40)
            val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
            val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
            val NORMAL_SIZE = byteArrayOf(0x1B, 0x21, 0x00)
            val SMALL_SIZE = byteArrayOf(0x1B, 0x21, 0x01)
            val DOUBLE_HEIGHT = byteArrayOf(0x1B, 0x21, 0x10)
            val BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
            val BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
            val FEED_LINE = byteArrayOf(0x0A)
            val CUT_PAPER = byteArrayOf(0x1D, 0x56, 0x01)

            // ConfiguraciÃ³n de caracteres
            val SET_LATIN = byteArrayOf(0x1B, 0x52, 0x08)
            val CODEPAGE = byteArrayOf(0x1B, 0x74, 0x10) // WPC1252
            val FONT_ENCODING = java.nio.charset.Charset.forName("Cp1252")

            printer?.apply {
                // Inicializar impresora
                sendData(ESC_INIT)
                sendData(SET_LATIN)
                sendData(CODEPAGE)

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 1: LOGO
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                printPaymentLogo(ALIGN_CENTER, FONT_ENCODING)

                // Fecha y hora del sistema
                val currentDateTime =
                        java.text.SimpleDateFormat(
                                        "dd/MM/yyyy HH:mm:ss",
                                        java.util.Locale("es", "ES")
                                )
                                .format(java.util.Date())

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 2: ENCABEZADO
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_CENTER)
                sendData("--------------------------------\n".toByteArray(FONT_ENCODING))
                sendData(DOUBLE_HEIGHT)
                sendData(BOLD_ON)
                sendData("RECIBO DE PAGO\n".toByteArray(FONT_ENCODING))
                sendData(BOLD_OFF)
                sendData(NORMAL_SIZE)
                sendData("Punto de Venta\n".toByteArray(FONT_ENCODING))
                sendData("--------------------------------\n\n".toByteArray(FONT_ENCODING))

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 3: INFORMACIÃ“N DEL COMERCIO
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_LEFT)
                sendData(SMALL_SIZE)
                sendData("Comercio: DISCONNECT\n".toByteArray(FONT_ENCODING))
                if (paymentType != "PAGO_MOVIL") {
                    sendData("Terminal: $terminalID\n".toByteArray(FONT_ENCODING))
                    sendData("Afiliado: $merchantID\n".toByteArray(FONT_ENCODING))
                    sendData("\n".toByteArray(FONT_ENCODING))
                }
                sendData("Fecha Sistema: $currentDateTime\n".toByteArray(FONT_ENCODING))
                sendData("Fecha Trans.: $date $time\n".toByteArray(FONT_ENCODING))
                sendData("\n".toByteArray(FONT_ENCODING))

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 4: ESTADO Y MONTO
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_CENTER)
                sendData(NORMAL_SIZE)

                // Estado de la transacciÃ³n
                sendData(BOLD_ON)
                val statusText =
                        when (responseMessage.uppercase()) {
                            "APPROVED" -> "APROBADO"
                            else -> sanitizePrinterText(responseMessage)
                        }
                sendData("$statusText\n".toByteArray(FONT_ENCODING))
                sendData(BOLD_OFF)
                sendData("\n".toByteArray(FONT_ENCODING))

                // Monto
                val amountInBolivares = amount.toDoubleOrNull()?.div(100) ?: 0.0
                sendData(DOUBLE_HEIGHT)
                sendData(BOLD_ON)
                sendData("Bs. %.2f\n".format(amountInBolivares).toByteArray(FONT_ENCODING))
                sendData(BOLD_OFF)
                sendData(NORMAL_SIZE)
                sendData("\n".toByteArray(FONT_ENCODING))

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 5: DETALLES DE LA TRANSACCIÃ“N
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                sendData(ALIGN_LEFT)
                sendData(SMALL_SIZE)
                sendData("--------------------------------\n".toByteArray(FONT_ENCODING))
                sendData("DETALLES DE TRANSACCION\n".toByteArray(FONT_ENCODING))
                sendData("--------------------------------\n".toByteArray(FONT_ENCODING))

                if (paymentType == "PAGO_MOVIL") {
                    printReceiptLine("Referencia", reference, FONT_ENCODING)
                    printReceiptLine("Banco", mobileBank, FONT_ENCODING)
                    printReceiptLine("Telefono", mobilePhone, FONT_ENCODING)
                } else {
                    if (cardId != "N/A") {
                        printReceiptLine("ID Tarjeta", cardId, FONT_ENCODING)
                    }
                    printReceiptLine("Referencia", reference, FONT_ENCODING)
                    printReceiptLine("RRN", rrn, FONT_ENCODING)
                    printReceiptLine("Trace", traceNumber, FONT_ENCODING)
                    printReceiptLine("Lote", batchNum, FONT_ENCODING)

                    if (cardNumber != "****") {
                        printReceiptLine("Tarjeta", cardNumber, FONT_ENCODING)
                    }
                }

                sendData("\n".toByteArray(FONT_ENCODING))

                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // SECCIÃ“N 6: PIE DE PÃGINA
                // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                // sendData(ALIGN_CENTER)
                // sendData(NORMAL_SIZE)
                // sendData("--------------------------------\n".toByteArray(FONT_ENCODING))
                // sendData(BOLD_ON)
                // sendData("Â¡ Gracias por su compra!\n".toByteArray(FONT_ENCODING))
                // sendData(BOLD_OFF)
                // sendData("Conserve este comprobante\n".toByteArray(FONT_ENCODING))

                // Espacio en blanco inferior (mÃ­nimo 2-3 lÃ­neas)
                sendData("\n\n\n".toByteArray(FONT_ENCODING))

                sendData(CUT_PAPER)
                finishPrintJob()

                Log.d(TAG, "Recibo de pago impreso exitosamente")
                promise.resolve("Recibo impreso exitosamente")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al imprimir recibo de pago", e)
            e.printStackTrace()
            promise.reject("PRINT_ERROR", "Error al imprimir: ${e.message}")
        }
    }

    /** Imprime el logo para recibos de pago */
    private fun printPaymentLogo(alignCenter: ByteArray, encoding: java.nio.charset.Charset) {
        try {
            val logoResId =
                    reactApplicationContext.resources.getIdentifier(
                            "logo_DISCONNECT",
                            "drawable",
                            reactApplicationContext.packageName
                    )

            if (logoResId > 0) {
                val options =
                        android.graphics.BitmapFactory.Options().apply {
                            inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888
                        }

                val logoBitmap =
                        android.graphics.BitmapFactory.decodeResource(
                                reactApplicationContext.resources,
                                logoResId,
                                options
                        )

                logoBitmap?.let { bitmap ->
                    if (bitmap.width > 0 && bitmap.height > 0) {
                        val maxWidth = 384
                        val scaledBitmap =
                                if (bitmap.width > maxWidth) {
                                    android.graphics.Bitmap.createScaledBitmap(
                                            bitmap,
                                            maxWidth,
                                            (bitmap.height * (maxWidth.toFloat() / bitmap.width))
                                                    .toInt(),
                                            true
                                    )
                                } else {
                                    bitmap
                                }

                        printer?.apply {
                            sendData(alignCenter)
                            try {
                                val printBitmapMethod =
                                        this::class.java.getMethod(
                                                "printBitmap",
                                                android.graphics.Bitmap::class.java,
                                                Int::class.java,
                                                Int::class.java
                                        )
                                printBitmapMethod.invoke(this, scaledBitmap, 1, scaledBitmap.width)
                            } catch (e: Exception) {
                                sendData("DISCONNECT\n".toByteArray(encoding))
                            }
                            sendData("\n".toByteArray(encoding))
                        }

                        if (scaledBitmap != bitmap) scaledBitmap.recycle()
                        bitmap.recycle()
                    }
                }
            } else {
                // Logo de texto alternativo
                printer?.apply {
                    sendData(alignCenter)
                    sendData(byteArrayOf(0x1B, 0x45, 0x01)) // Bold ON
                    sendData("DISCONNECT\n".toByteArray(encoding))
                    sendData(byteArrayOf(0x1B, 0x45, 0x00)) // Bold OFF
                    sendData("\n".toByteArray(encoding))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al imprimir logo de pago", e)
            printer?.apply {
                sendData(alignCenter)
                sendData("DISCONNECT\n".toByteArray(encoding))
            }
        }
    }

    /** Imprime una lÃ­nea de recibo con formato: "Label: Value" */
    private fun printReceiptLine(label: String, value: String, encoding: java.nio.charset.Charset) {
        printer?.apply {
            val line =
                    String.format(
                            "%-12s: %s\n",
                            sanitizePrinterText(label),
                            sanitizePrinterText(value),
                    )
            sendData(line.toByteArray(encoding))
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            Log.d(TAG, "Disconnecting printer...")

            finishPrintJob()

            curConnect?.close()
            Log.d(TAG, "Connection closed")

            curConnect = null
            printer = null
            Log.d(TAG, "Printer references cleared")

            promise.resolve("Printer disconnected successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting printer", e)
            e.printStackTrace()
            promise.reject("DISCONNECT_ERROR", e.message)
        }
    }

    private fun sendEvent(eventName: String, params: String) {
        try {
            if (reactApplicationContext.hasActiveCatalystInstance()) {
                reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, params)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event $eventName", e)
        }
    }
}

