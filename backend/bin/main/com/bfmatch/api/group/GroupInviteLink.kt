package com.bfmatch.api.group

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
import java.util.UUID

enum class InviteLinkStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    EXPIRED,
}

@Entity
@Table(name = "group_invite_links")
class GroupInviteLink(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    var group: MatchGroup,

    @ManyToOne(optional = false)
    @JoinColumn(name = "inviter_user_id", nullable = false)
    var inviter: User,

    @Column(nullable = false, unique = true, length = 36)
    var token: String = UUID.randomUUID().toString(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: InviteLinkStatus = InviteLinkStatus.PENDING,

    @ManyToOne
    @JoinColumn(name = "accepted_by_user_id")
    var acceptedBy: User? = null,

    @Column
    var acceptedAt: Instant? = null,

    @Column(length = 400)
    var declineReason: String? = null,

    @Column(nullable = false)
    var expiresAt: Instant,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),
)
