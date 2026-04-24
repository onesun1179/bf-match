package com.bfmatch.api.notification

import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.Message
import com.google.firebase.messaging.Notification as FcmNotification
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class FcmService {
    private val log = LoggerFactory.getLogger(javaClass)

    fun sendPush(token: String, title: String, body: String, data: Map<String, String> = emptyMap()) {
        if (FirebaseApp.getApps().isEmpty()) return
        try {
            val message = Message.builder()
                .setToken(token)
                .setNotification(FcmNotification.builder().setTitle(title).setBody(body).build())
                .putAllData(data)
                .build()
            FirebaseMessaging.getInstance().send(message)
        } catch (e: Exception) {
            log.warn("FCM send failed for token ${token.take(20)}...: ${e.message}")
        }
    }
}
