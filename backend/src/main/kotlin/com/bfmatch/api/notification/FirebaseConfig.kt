package com.bfmatch.api.notification

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource

@Configuration
class FirebaseConfig {
    private val log = LoggerFactory.getLogger(javaClass)

    @PostConstruct
    fun init() {
        if (FirebaseApp.getApps().isNotEmpty()) return
        try {
            val resource = ClassPathResource("firebase-service-account.json")
            if (!resource.exists()) {
                log.warn("firebase-service-account.json not found — FCM push disabled")
                return
            }
            val options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(resource.inputStream))
                .build()
            FirebaseApp.initializeApp(options)
            log.info("Firebase initialized successfully")
        } catch (e: Exception) {
            log.warn("Firebase initialization failed — FCM push disabled: ${e.message}")
        }
    }
}
