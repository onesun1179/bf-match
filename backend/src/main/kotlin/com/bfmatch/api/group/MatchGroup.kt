package com.bfmatch.api.group

import com.bfmatch.api.user.NationalGrade
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
@Table(name = "match_groups")
class MatchGroup(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, length = 60)
    var name: String,

    @Column(length = 400)
    var description: String? = null,

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    var owner: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var visibility: GroupVisibility = GroupVisibility.INVITE_ONLY,

    @Column(length = 200)
    var location: String? = null,

    @Column
    var startAt: Instant? = null,

    @Column
    var endAt: Instant? = null,

    @Column
    var registrationDeadline: Instant? = null,

    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    var minGrade: NationalGrade? = null,

    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    var maxGrade: NationalGrade? = null,

    @Column
    var maxMembers: Int? = null,

    @Column
    var maxMale: Int? = null,

    @Column
    var maxFemale: Int? = null,

    @Column(nullable = false)
    var closed: Boolean = false,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),
)
