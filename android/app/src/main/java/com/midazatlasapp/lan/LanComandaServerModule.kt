package com.midazatlasapp.lan

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.net.Inet4Address
import java.net.NetworkInterface

/**
 * Puente JS ↔ servidor LAN de comandas. JS arranca el servidor con la clave de
 * GET /kiosk/config (`lanComanda.sharedKey`), recibe cada request como evento
 * `LanComandaRequest` y contesta con `respond(requestId, status, body, headers)`.
 */
class LanComandaServerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "LanComandaServer"
        const val EVENT_REQUEST = "LanComandaRequest"
    }

    @Volatile private var server: LanComandaHttpServer? = null
    @Volatile private var listenerCount = 0

    override fun getName(): String = "LanComandaServerModule"

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        listenerCount += 1
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount = maxOf(0, listenerCount - count)
    }

    @ReactMethod
    fun start(port: Int, authKey: String, promise: Promise) {
        try {
            val current = server
            if (current != null && current.isAlive && current.listeningPort == port) {
                current.authKey = authKey
                promise.resolve(port)
                return
            }
            current?.stop()
            val next = LanComandaHttpServer(port, authKey, ::emitRequest)
            // daemon=false: el hilo del servidor no muere con el de JS.
            next.start(5_000, false)
            server = next
            Log.i(TAG, "listening on 0.0.0.0:$port")
            promise.resolve(port)
        } catch (error: Exception) {
            Log.e(TAG, "start failed", error)
            promise.reject("LAN_SERVER_START_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        server?.stop()
        server = null
        promise.resolve(null)
    }

    @ReactMethod
    fun setAuthKey(authKey: String, promise: Promise) {
        server?.authKey = authKey
        promise.resolve(null)
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(server?.isAlive == true)
    }

    @ReactMethod
    fun respond(requestId: String, status: Int, body: String, headers: ReadableMap?, promise: Promise) {
        val headerMap = mutableMapOf<String, String>()
        headers?.toHashMap()?.forEach { (name, value) ->
            if (value != null) headerMap[name] = value.toString()
        }
        val delivered = server?.resolve(
            requestId,
            LanComandaHttpServer.LanResponse(status, body, headerMap),
        ) ?: false
        promise.resolve(delivered)
    }

    /** IPv4 de la LAN (wlan/eth), sin loopback ni VPN: la que se muestra en el panel y va en el heartbeat. */
    @ReactMethod
    fun getLanAddresses(promise: Promise) {
        val result = Arguments.createArray()
        try {
            NetworkInterface.getNetworkInterfaces()?.toList()?.forEach { nic ->
                if (!nic.isUp || nic.isLoopback || nic.isVirtual) return@forEach
                if (nic.name.startsWith("tun") || nic.name.startsWith("ppp")) return@forEach
                nic.inetAddresses.toList()
                    .filterIsInstance<Inet4Address>()
                    .filter { it.isSiteLocalAddress }
                    .forEach { address ->
                        result.pushMap(Arguments.createMap().apply {
                            putString("interface", nic.name)
                            putString("address", address.hostAddress)
                        })
                    }
            }
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("LAN_ADDRESSES_FAILED", error.message, error)
        }
    }

    private fun emitRequest(request: LanComandaHttpServer.LanRequest): Boolean {
        if (!reactContext.hasActiveReactInstance()) return false
        return try {
            val headers = Arguments.createMap()
            request.headers.forEach { (name, value) ->
                if (name != LanComandaHttpServer.AUTH_HEADER) headers.putString(name, value)
            }
            val payload = Arguments.createMap().apply {
                putString("requestId", request.requestId)
                putString("method", request.method)
                putString("path", request.path)
                putString("query", request.query)
                putMap("headers", headers)
                putString("body", request.body)
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_REQUEST, payload)
            true
        } catch (error: Exception) {
            Log.w(TAG, "emit failed", error)
            false
        }
    }

    override fun invalidate() {
        super.invalidate()
        server?.stop()
        server = null
    }
}
