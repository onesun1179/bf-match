package com.bfmatch.api.group

import com.bfmatch.api.user.NationalGrade
import com.bfmatch.api.user.User
import jakarta.persistence.*

@Entity
@Table(name = "game_players")
class GamePlayer(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    @ManyToOne(optional = false) @JoinColumn(name = "game_id", nullable = false)
    var game: Game,
    @ManyToOne(optional = false) @JoinColumn(name = "user_id", nullable = false)
    var user: User,
    @Column(nullable = false, length = 1)
    var team: String,
    @Enumerated(EnumType.STRING) @Column(length = 2)
    var gradeAtTime: NationalGrade? = null,
)
