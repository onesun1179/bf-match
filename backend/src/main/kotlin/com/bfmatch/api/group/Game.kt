package com.bfmatch.api.group

import com.bfmatch.api.user.User
import jakarta.persistence.*
import java.time.Instant

enum class GameStatus { PENDING, IN_PROGRESS, FINISHED, CANCELLED }

@Entity
@Table(name = "games")
class Game(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    @ManyToOne(optional = false) @JoinColumn(name = "group_id", nullable = false)
    var group: MatchGroup,
    @ManyToOne(optional = false) @JoinColumn(name = "created_by_user_id", nullable = false)
    var createdBy: User,
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    var status: GameStatus = GameStatus.PENDING,
    @Enumerated(EnumType.STRING) @Column(length = 20)
    var gameType: GameType? = null,
    @Column
    var courtNumber: Int? = null,
    @Column var teamAScore: Int? = null,
    @Column var teamBScore: Int? = null,
    @Column(length = 1) var winnerTeam: String? = null,
    @Column var pendingTeamAScore: Int? = null,
    @Column var pendingTeamBScore: Int? = null,
    @Column(length = 1) var pendingRequestedByTeam: String? = null,
    @Column var pendingRequestedByUserId: Long? = null,
    @Column var pendingRequestedAt: Instant? = null,
    @Column(nullable = false) var createdAt: Instant = Instant.now(),
    @Column var startedAt: Instant? = null,
    @Column var finishedAt: Instant? = null,
)
