package com.bfmatch.api.notification

import com.bfmatch.api.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "notifications")
class Notification(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var type: NotificationType,

    @Column(nullable = false, length = 100)
    var title: String,

    @Column(nullable = false, length = 400)
    var body: String,

    @Column(length = 30)
    var targetType: String? = null,

    @Column
    var targetId: Long? = null,

    @Column(nullable = false)
    var isRead: Boolean = false,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),
)
