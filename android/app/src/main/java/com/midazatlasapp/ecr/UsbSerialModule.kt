package com.midazatlasapp.ecr

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets

class UsbSerialModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "UsbSerialModule"
        private const val ACTION_USB_PERMISSION = "com.midazatlasapp.USB_PERMISSION"
        private const val HEX_PREVIEW_BYTES = 48
    }

    private var serialPort: UsbSerialPort? = null
    private var usbConnection: android.hardware.usb.UsbDeviceConnection? = null
    @Volatile private var keepReading = false
    private var readThread: Thread? = null

    /**
     * Generación del lector. `keepReading` solo no alcanza: `serialPort.read()`
     * es una transferencia bulk bloqueante que ignora `interrupt()`, así que un
     * hilo viejo despierta hasta 1 s después de que lo mandaron a parar — y para
     * entonces `startReadThread()` ya devolvió `keepReading` a `true`, con lo que
     * el viejo seguía vivo. Dos hilos leyendo el mismo puerto se reparten los
     * bytes y sus chunks llegan mezclados a `rxByteBuffer`: así salió
     * `"daa":{` en vez de `"data":{` y `PPAROVED` en vez de `APPROVED` en el
     * cobro con tarjeta del 27/8/2026, que dejó la venta perdida con el dinero
     * ya cobrado.
     */
    @Volatile private var readGeneration = 0
    private val rxByteBuffer = ByteArrayOutputStream()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var firstSend = true

    private var permissionReceiverRegistered = false
    private var usbFilterRegistered = false

    private var diagnosticEnabled = false
    private var deviceVid = 0
    private var devicePid = 0

    private var currentMessageChunkCount = 0
    private var currentMessageBytes = 0
    private var messageAssemblyStartedAt = 0L

    override fun getName(): String = "UsbSerialModule"

    @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}
    @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {}

    @ReactMethod
    fun setDiagnosticEnabled(enabled: Boolean, promise: Promise) {
        diagnosticEnabled = enabled
        addLog("DIAG modo diagnóstico ECR: ${if (enabled) "ON" else "OFF"}")
        if (enabled) {
            logUsbDeviceInventory()
        }
        promise.resolve(enabled)
    }

    @ReactMethod
    fun isDiagnosticEnabled(promise: Promise) {
        promise.resolve(diagnosticEnabled)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun addLog(text: String) {
        Log.d(TAG, text)
        mainHandler.post {
            sendEvent("onUsbLog", Arguments.createMap().apply { putString("message", text) })
        }
    }

    private fun logUsbDeviceInventory() {
        val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
        val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
        if (drivers.isEmpty()) {
            addLog("DIAG sin dispositivos USB serial")
            return
        }
        drivers.forEachIndexed { index, driver ->
            val d = driver.device
            addLog(
                "DIAG USB[$index] VID=${d.vendorId} PID=${d.productId} " +
                    "ports=${driver.ports.size} name=${d.deviceName}",
            )
        }
        addLog("DIAG puerto activo: VID=$deviceVid PID=$devicePid")
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        addLog("initialize() llamado")
        try {
            if (!permissionReceiverRegistered) {
                reactContext.registerReceiver(usbPermissionReceiver, IntentFilter(ACTION_USB_PERMISSION))
                permissionReceiverRegistered = true
            }
            registerUsbFilter()

            val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
            val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)

            if (drivers.isEmpty()) {
                addLog("No se detectaron dispositivos USB serial, esperando conexión...")
                promise.resolve(true)
                return
            }

            if (diagnosticEnabled) {
                logUsbDeviceInventory()
            }

            val driver = drivers[0]
            val device = driver.device
            addLog("Dispositivo encontrado: VID=${device.vendorId} PID=${device.productId}")

            if (usbManager.hasPermission(device)) {
                addLog("Permiso ya concedido, abriendo...")
                openDevice(device, driver.ports[0])
            } else {
                addLog("Solicitando permiso USB...")
                val intent = PendingIntent.getBroadcast(
                    reactContext,
                    0,
                    Intent(ACTION_USB_PERMISSION),
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
                )
                usbManager.requestPermission(device, intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            addLog("Error en initialize: ${e.message}")
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestUsbPermission(promise: Promise) {
        try {
            tryFindAndOpen()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun close(promise: Promise) {
        closePort()
        promise.resolve(true)
    }

    @ReactMethod
    fun sendLine(line: String, promise: Promise) {
        sendRaw(line + "\n", promise)
    }

    @ReactMethod
    fun sendRaw(text: String, promise: Promise) {
        if (serialPort == null) {
            promise.reject("NOT_OPEN", "El puerto no está abierto")
            return
        }
        try {
            if (firstSend) {
                firstSend = false
                Thread.sleep(300)
            }
            val data = text.toByteArray(StandardCharsets.UTF_8)
            serialPort!!.write(data, 2000)
            if (diagnosticEnabled) {
                addLog("DIAG TX (${data.size} B): ${text.replace("\n", "\\n")}")
            } else {
                addLog("TX: ${text.replace("\n", "\\n")}")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            addLog("Error enviando: ${e.message}")
            promise.reject("WRITE_ERROR", e.message)
        }
    }

    private fun openDevice(device: UsbDevice, port: UsbSerialPort) {
        val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
        val connection = usbManager.openDevice(device)
        if (connection == null) {
            addLog("No se pudo abrir la conexión USB. ¿Falta permiso?")
            return
        }

        try {
            port.open(connection)
            port.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
            try {
                port.dtr = true
                port.rts = true
            } catch (_: Exception) {
                addLog("DIAG DTR/RTS no disponibles en este driver")
            }
            serialPort = port
            usbConnection = connection
            deviceVid = device.vendorId
            devicePid = device.productId
            firstSend = true
            rxByteBuffer.reset()
            resetMessageAssemblyStats()

            addLog("Puerto abierto — 115200/8/N/1 VID=$deviceVid PID=$devicePid")
            sendEvent("onUsbStatusChange", Arguments.createMap().apply { putBoolean("isOpen", true) })

            startReadThread()
        } catch (e: Exception) {
            addLog("Error abriendo puerto: ${e.message}")
            closePort()
        }
    }

    private fun startReadThread() {
        stopReadThread()
        val generation = ++readGeneration
        keepReading = true
        // rxByteBuffer se toca solo desde el main thread (onRxChunk/processBuffer).
        mainHandler.post { rxByteBuffer.reset() }

        readThread = Thread {
            val buffer = ByteArray(4096)
            while (keepReading && generation == readGeneration) {
                try {
                    val len = serialPort?.read(buffer, 1000) ?: break
                    if (len > 0) {
                        // Un lector de otra generación no puede aportar bytes: los
                        // suyos van mezclados con los del lector vigente.
                        if (generation != readGeneration) break
                        val rx = buffer.copyOf(len)
                        mainHandler.post {
                            if (generation == readGeneration) {
                                onRxChunk(rx)
                            }
                        }
                    }
                } catch (e: Exception) {
                    if (keepReading && generation == readGeneration) {
                        mainHandler.post { addLog("Error leyendo: ${e.message}") }
                    }
                    break
                }
            }
        }
        readThread!!.start()
    }

    private fun onRxChunk(rx: ByteArray) {
        if (currentMessageChunkCount == 0) {
            messageAssemblyStartedAt = System.currentTimeMillis()
        }
        currentMessageChunkCount += 1
        currentMessageBytes += rx.size

        if (diagnosticEnabled) {
            logRxChunkDiagnostic(rx)
        }

        rxByteBuffer.write(rx, 0, rx.size)
        processBuffer()
    }

    private fun logRxChunkDiagnostic(rx: ByteArray) {
        val ascii = String(rx, StandardCharsets.UTF_8).replace("\n", "\\n")
        val hex = rx.take(32).joinToString(" ") { b -> "%02X".format(b) }
        addLog(
            "DIAG RX chunk #$currentMessageChunkCount +${rx.size}B " +
                "(msg ${currentMessageBytes}B) hex=[$hex] ascii=[$ascii]",
        )
        sendEvent(
            "onUsbDataReceived",
            Arguments.createMap().apply {
                putString("ascii", ascii)
                putInt("bytes", rx.size)
                putInt("chunkIndex", currentMessageChunkCount)
            },
        )
    }

    private fun stopReadThread() {
        keepReading = false
        readGeneration += 1
        val previous = readThread
        readThread = null
        previous?.interrupt()

        // Esperar a que el lector viejo salga ANTES de abrir otro sobre el mismo
        // puerto: mientras siga dentro de `read()` se queda con bytes que el
        // nuevo ya no va a ver. El timeout de lectura es de 1 s, así que 2 s
        // alcanzan; si no murió, al menos la guarda de generación descarta lo
        // que lea. `connect()` corre en el hilo de NativeModules, no en el main.
        if (previous != null && previous != Thread.currentThread()) {
            try {
                previous.join(2000)
                if (previous.isAlive) {
                    mainHandler.post { addLog("Lector previo no terminó en 2s (gen $readGeneration)") }
                }
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
            }
        }
    }

    private fun resetMessageAssemblyStats() {
        currentMessageChunkCount = 0
        currentMessageBytes = 0
        messageAssemblyStartedAt = 0L
    }

    private fun extractLastBalancedJson(line: String): String? {
        val text = line.trim()
        if (!text.contains('{') || !text.contains('}')) {
            return null
        }

        var best: String? = null
        var end = text.length - 1
        while (end >= 0) {
            if (text[end] == '}') {
                var depth = 0
                var start = end
                while (start >= 0) {
                    when (text[start]) {
                        '}' -> depth++
                        '{' -> {
                            depth--
                            if (depth == 0) {
                                val candidate = text.substring(start, end + 1)
                                if (best == null || candidate.length > best.length) {
                                    best = candidate
                                }
                                break
                            }
                        }
                    }
                    start--
                }
            }
            end--
        }
        return best
    }

    private fun processBuffer() {
        var changed = true
        while (changed && rxByteBuffer.size() > 0) {
            changed = false
            val rawBytes = rxByteBuffer.toByteArray()
            val current = String(rawBytes, StandardCharsets.UTF_8)
            val trimmed = current.trimStart()
            val offset = current.length - trimmed.length

            if (trimmed.isEmpty()) {
                rxByteBuffer.reset()
                break
            }

            if (trimmed.startsWith("[")) {
                var depth = 0
                var matchIdx = -1
                for (i in trimmed.indices) {
                    when (trimmed[i]) {
                        '[' -> depth++
                        ']' -> {
                            depth--
                            if (depth == 0) {
                                matchIdx = i
                                break
                            }
                        }
                    }
                }
                if (matchIdx >= 0) {
                    val json = trimmed.substring(0, matchIdx + 1)
                    consumeFromBuffer(offset + matchIdx + 1)
                    processLine(json)
                    changed = true
                } else {
                    // Corrupted array prefix with a complete object inside — extract it.
                    val balanced = extractLastBalancedJson(trimmed)
                    if (balanced != null) {
                        val idx = trimmed.lastIndexOf(balanced)
                        if (idx >= 0) {
                            consumeFromBuffer(offset + idx + balanced.length)
                            processLine(balanced)
                            changed = true
                        }
                    }
                }
            } else if (trimmed.startsWith("{")) {
                var braces = 0
                var matchIdx = -1
                for (i in trimmed.indices) {
                    if (trimmed[i] == '{') braces++
                    else if (trimmed[i] == '}') {
                        braces--
                        if (braces == 0) {
                            matchIdx = i
                            break
                        }
                    }
                }
                if (matchIdx >= 0) {
                    val json = trimmed.substring(0, matchIdx + 1)
                    consumeFromBuffer(offset + matchIdx + 1)
                    processLine(json)
                    changed = true
                }
            } else {
                // Leading noise before JSON (e.g. garbage then `{...}`).
                val balanced = extractLastBalancedJson(trimmed)
                if (balanced != null) {
                    val idx = trimmed.lastIndexOf(balanced)
                    if (idx >= 0) {
                        consumeFromBuffer(offset + idx + balanced.length)
                        processLine(
                            if (idx > 0) trimmed.substring(0, idx) + balanced else balanced,
                        )
                        changed = true
                        continue
                    }
                }
                val nl = current.indexOf("\n")
                if (nl >= 0) {
                    val line = current.substring(0, nl).trim()
                    consumeFromBuffer(nl + 1)
                    if (line.isNotEmpty()) processLine(line)
                    changed = true
                }
            }
        }
    }

    private fun consumeFromBuffer(charCount: Int) {
        val raw = rxByteBuffer.toByteArray()
        val current = String(raw, StandardCharsets.UTF_8)
        val remaining = current.substring(charCount.coerceAtMost(current.length))
        rxByteBuffer.reset()
        if (remaining.isNotEmpty()) {
            rxByteBuffer.write(remaining.toByteArray(StandardCharsets.UTF_8))
        }
    }

    private fun processLine(line: String) {
        val trimmed = line.trim()
        val assemblyMs =
            if (messageAssemblyStartedAt > 0L) {
                System.currentTimeMillis() - messageAssemblyStartedAt
            } else {
                0L
            }

        if (diagnosticEnabled) {
            emitDiagnosticSnapshot(trimmed, assemblyMs)
        }

        addLog("MENSAJE: [$trimmed]")
        sendEvent("onUsbLineReceived", Arguments.createMap().apply { putString("line", trimmed) })

        // Prefer the last balanced {...} inside noisy USB lines (Conviase strategy).
        val balanced = extractLastBalancedJson(trimmed)
        val commandPayload =
            balanced
                ?: if (trimmed.startsWith("{") || trimmed.startsWith("[")) trimmed else null

        if (commandPayload != null) {
            var type = "payment"
            var strictJsonValid = false
            try {
                type = when {
                    commandPayload.startsWith("[") -> {
                        val arr = org.json.JSONArray(commandPayload)
                        strictJsonValid = true
                        if (arr.length() > 0) {
                            arr.getJSONObject(0).optString("type", "payment")
                        } else {
                            "payment"
                        }
                    }
                    else -> {
                        strictJsonValid = true
                        org.json.JSONObject(commandPayload).optString("type", "payment")
                    }
                }
            } catch (e: Exception) {
                addLog("Error parseando JSON: ${e.message}")
                if (diagnosticEnabled) {
                    addLog("DIAG JSON inválido — usar parser heurístico JS si responseCode=00")
                }
                // Still emit extracted object for JS heuristic even when native JSONObject fails.
                if (balanced != null) {
                    type = if (balanced.contains("\"type\"")) "command" else "unknown"
                }
            }
            sendEvent(
                "onUsbCommandReceived",
                Arguments.createMap().apply {
                    putString("type", type)
                    putString("payload", commandPayload)
                    putBoolean("strictJsonValid", strictJsonValid)
                },
            )
            resetMessageAssemblyStats()
            return
        }

        resetMessageAssemblyStats()

        when (line) {
            "PING" -> {
                val data = "PONG\n".toByteArray(StandardCharsets.UTF_8)
                try {
                    serialPort?.write(data, 2000)
                } catch (e: Exception) {
                    addLog("Error PONG: ${e.message}")
                }
            }
            "HELLO" -> {
                val data = "HELLO_ACK\n".toByteArray(StandardCharsets.UTF_8)
                try {
                    serialPort?.write(data, 2000)
                } catch (e: Exception) {
                    addLog("Error HELLO_ACK: ${e.message}")
                }
            }
        }
    }

    private fun emitDiagnosticSnapshot(payload: String, assemblyMs: Long) {
        val payloadBytes = payload.toByteArray(StandardCharsets.UTF_8)
        val hexPreview =
            payloadBytes
                .take(HEX_PREVIEW_BYTES)
                .joinToString(" ") { b -> "%02X".format(b) }
        val strictJsonValid =
            try {
                if (payload.startsWith("[")) {
                    org.json.JSONArray(payload)
                } else {
                    org.json.JSONObject(payload)
                }
                true
            } catch (_: Exception) {
                false
            }
        val hasResponseCode00 =
            Regex("""response[a-z0-9"._-]{0,20}00""", RegexOption.IGNORE_CASE)
                .containsMatchIn(payload)
        val hasApprovedHint = payload.contains("APPROVED", ignoreCase = true)

        addLog(
            "DIAG mensaje ensamblado: ${payloadBytes.size}B, " +
                "chunks=$currentMessageChunkCount, ${assemblyMs}ms, " +
                "strictJson=$strictJsonValid, code00=$hasResponseCode00, approved=$hasApprovedHint",
        )

        sendEvent(
            "onUsbDiagnostic",
            Arguments.createMap().apply {
                putInt("totalBytes", currentMessageBytes)
                putInt("chunkCount", currentMessageChunkCount)
                putDouble("assemblyMs", assemblyMs.toDouble())
                putInt("payloadChars", payload.length)
                putBoolean("strictJsonValid", strictJsonValid)
                putBoolean("hasResponseCode00", hasResponseCode00)
                putBoolean("hasApprovedHint", hasApprovedHint)
                putString("hexPreview", hexPreview)
                putInt("vid", deviceVid)
                putInt("pid", devicePid)
            },
        )
    }

    private fun closePort() {
        stopReadThread()
        try {
            serialPort?.close()
        } catch (e: Exception) {
            Log.e(TAG, "close port", e)
        }
        try {
            usbConnection?.close()
        } catch (e: Exception) {
            Log.e(TAG, "close conn", e)
        }
        serialPort = null
        usbConnection = null
        firstSend = true
        rxByteBuffer.reset()
        resetMessageAssemblyStats()
        addLog("Puerto cerrado")
        mainHandler.post {
            sendEvent("onUsbStatusChange", Arguments.createMap().apply { putBoolean("isOpen", false) })
        }
    }

    private fun tryFindAndOpen() {
        val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
        val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
        if (drivers.isEmpty()) {
            addLog("No se encontró dispositivo USB serial")
            return
        }

        val driver = drivers[0]
        val device = driver.device

        if (usbManager.hasPermission(device)) {
            openDevice(device, driver.ports[0])
        } else {
            val intent = PendingIntent.getBroadcast(
                reactContext,
                0,
                Intent(ACTION_USB_PERMISSION),
                PendingIntent.FLAG_IMMUTABLE,
            )
            usbManager.requestPermission(device, intent)
        }
    }

    private fun registerUsbFilter() {
        if (usbFilterRegistered) return
        val filter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        reactContext.registerReceiver(usbAttachReceiver, filter)
        usbFilterRegistered = true
    }

    private val usbPermissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (ACTION_USB_PERMISSION != intent.action) return
            synchronized(this) {
                @Suppress("DEPRECATION")
                val device: UsbDevice? =
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                if (granted && device != null) {
                    addLog("Permiso concedido VID=${device.vendorId} PID=${device.productId}")
                    val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
                    val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
                    val driver = drivers.firstOrNull { it.device == device } ?: return
                    openDevice(device, driver.ports[0])
                } else {
                    addLog("Permiso USB denegado")
                }
            }
        }
    }

    private val usbAttachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    addLog("USB conectado")
                    Thread {
                        Thread.sleep(400)
                        tryFindAndOpen()
                    }.start()
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    addLog("USB desconectado")
                    closePort()
                }
            }
        }
    }

    override fun invalidate() {
        super.invalidate()
        closePort()
        if (permissionReceiverRegistered) {
            try {
                reactContext.unregisterReceiver(usbPermissionReceiver)
            } catch (_: Exception) {
            }
            permissionReceiverRegistered = false
        }
        if (usbFilterRegistered) {
            try {
                reactContext.unregisterReceiver(usbAttachReceiver)
            } catch (_: Exception) {
            }
            usbFilterRegistered = false
        }
    }
}
