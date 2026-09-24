package com.midazatlasapp.lan

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * Mini servidor HTTP del kiosko en la LAN (puerto 8790). La Comandera lee de aquí
 * las comandas cuando el backend no responde.
 *
 * Solo transporta: valida la clave, pasa cada request a JS (evento
 * `LanComandaRequest`) y espera su respuesta (`respond`). La lógica, el SQLite y
 * la forma de las comandas viven en JS (`src/shared/lan/`), una sola fuente de verdad.
 */
class LanComandaHttpServer(
    port: Int,
    @Volatile var authKey: String,
    private val dispatchToJs: (LanRequest) -> Boolean,
) : NanoHTTPD("0.0.0.0", port) {

    data class LanRequest(
        val requestId: String,
        val method: String,
        val path: String,
        val query: String,
        val headers: Map<String, String>,
        val body: String,
    )

    data class LanResponse(val status: Int, val body: String, val headers: Map<String, String>)

    companion object {
        private const val TAG = "LanComandaServer"
        private const val JS_TIMEOUT_MS = 8_000L
        private const val MAX_BODY_BYTES = 64 * 1024
        const val HEALTH_PATH = "/lan/v1/health"
        const val AUTH_HEADER = "x-kiosk-lan-key"
    }

    private val pending = ConcurrentHashMap<String, CompletableFuture<LanResponse>>()

    fun resolve(requestId: String, response: LanResponse): Boolean {
        val future = pending.remove(requestId) ?: return false
        return future.complete(response)
    }

    override fun serve(session: IHTTPSession): Response {
        val path = session.uri ?: "/"
        if (!path.startsWith("/lan/")) {
            return json(404, """{"statusCode":404,"message":"not_found"}""")
        }
        if (path != HEALTH_PATH && !isAuthorized(session.headers[AUTH_HEADER])) {
            return json(401, """{"statusCode":401,"message":"invalid_lan_key"}""")
        }

        val body = try {
            readBody(session)
        } catch (error: IllegalArgumentException) {
            return json(413, """{"statusCode":413,"message":"body_too_large"}""")
        }

        val requestId = UUID.randomUUID().toString()
        val future = CompletableFuture<LanResponse>()
        pending[requestId] = future
        val request = LanRequest(
            requestId = requestId,
            method = session.method.name,
            path = path,
            query = session.queryParameterString ?: "",
            headers = session.headers ?: emptyMap(),
            body = body,
        )
        if (!dispatchToJs(request)) {
            pending.remove(requestId)
            return json(503, """{"statusCode":503,"message":"kiosk_js_unavailable"}""")
        }

        return try {
            val response = future.get(JS_TIMEOUT_MS, TimeUnit.MILLISECONDS)
            json(response.status, response.body, response.headers)
        } catch (error: TimeoutException) {
            pending.remove(requestId)
            json(504, """{"statusCode":504,"message":"kiosk_js_unavailable"}""")
        } catch (error: Exception) {
            pending.remove(requestId)
            Log.w(TAG, "request $path failed", error)
            json(500, """{"statusCode":500,"message":"internal_error"}""")
        }
    }

    /** Comparación en tiempo constante: la clave no se deja adivinar por timing. */
    private fun isAuthorized(provided: String?): Boolean {
        val expected = authKey
        if (provided.isNullOrEmpty() || expected.isEmpty()) return false
        return MessageDigest.isEqual(provided.toByteArray(), expected.toByteArray())
    }

    /** NanoHTTPD no lee el body de PATCH: se lee a mano según Content-Length. */
    private fun readBody(session: IHTTPSession): String {
        val length = session.headers["content-length"]?.toIntOrNull() ?: 0
        if (length <= 0) return ""
        if (length > MAX_BODY_BYTES) throw IllegalArgumentException("body too large")
        val out = ByteArrayOutputStream(length)
        val buffer = ByteArray(4096)
        var remaining = length
        val input = session.inputStream
        while (remaining > 0) {
            val read = input.read(buffer, 0, minOf(buffer.size, remaining))
            if (read < 0) break
            out.write(buffer, 0, read)
            remaining -= read
        }
        return out.toString(Charsets.UTF_8.name())
    }

    private fun json(status: Int, body: String, headers: Map<String, String> = emptyMap()): Response {
        val response = newFixedLengthResponse(statusOf(status), "application/json; charset=utf-8", body)
        response.addHeader("Connection", "close")
        response.addHeader("Cache-Control", "no-store")
        headers.forEach { (name, value) -> response.addHeader(name, value) }
        return response
    }

    private fun statusOf(code: Int): Response.IStatus {
        Response.Status.lookup(code)?.let { return it }
        return object : Response.IStatus {
            override fun getDescription(): String = "$code"
            override fun getRequestStatus(): Int = code
        }
    }
}
