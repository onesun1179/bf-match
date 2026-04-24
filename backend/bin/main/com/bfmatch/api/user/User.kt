package com.bfmatch.api.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var authProvider: AuthProvider,

    @Column(nullable = false, length = 100)
    var providerUserId: String,

    @Column(length = 255)
    var email: String? = null,

    @Column(nullable = false, length = 60, unique = true)
    var nickname: String,

    @Column(length = 255)
    var password: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    var gender: Gender? = null,

    @Column(length = 30)
    var regionCode: String? = null,

    @Column(length = 120)
    var preferredCourt: String? = null,

    @Column(nullable = false)
    var notificationEnabled: Boolean = true,

    @Column(length = 100)
    var currentSessionId: String? = null,
)
