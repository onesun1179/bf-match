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

@Entity
@Table(name = "group_members")
class GroupMember(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    var group: MatchGroup,

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: GroupRole = GroupRole.MEMBER,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: GroupMemberStatus = GroupMemberStatus.ACTIVE,

    @Column(nullable = false)
    var joinedAt: Instant = Instant.now(),
)
