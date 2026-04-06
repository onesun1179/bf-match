package com.bfmatch.api.group

import com.bfmatch.api.auth.AuthenticatedUser
import com.bfmatch.api.notification.NotificationService
import com.bfmatch.api.notification.NotificationType
import com.bfmatch.api.user.Gender
import com.bfmatch.api.user.NationalGrade
import com.bfmatch.api.user.PlayerSkillRepository
import com.bfmatch.api.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

@Service
class GameService(
    private val gameRepository: GameRepository,
    private val gamePlayerRepository: GamePlayerRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val matchGroupRepository: MatchGroupRepository,
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val notificationService: NotificationService,
) {
    @Transactional
    fun createGame(authenticatedUser: AuthenticatedUser, groupId: Long, request: CreateGameRequest): GameResponse {
        val requesterMembership = requireActiveMembership(groupId, authenticatedUser.userId)
        val group = getGroup(groupId)

        if (request.teamAUserIds.size != 2 || request.teamBUserIds.size != 2) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Each team must have exactly 2 players.")
        }

        val allUserIds = request.teamAUserIds + request.teamBUserIds
        if (allUserIds.toSet().size != 4) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "All 4 players must be distinct.")
        }

        allUserIds.forEach { userId ->
            val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            if (membership == null || membership.status != GroupMemberStatus.ACTIVE) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "User $userId is not an active member of this group.")
            }
        }

        val creator = userRepository.findById(authenticatedUser.userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.")
        }

        // 성별로 게임 타입 자동 판별
        val genders = allUserIds.map { userRepository.findById(it).orElseThrow().gender }
        val maleCount = genders.count { it == Gender.MALE }
        val femaleCount = genders.count { it == Gender.FEMALE }
        val autoGameType = when {
            maleCount == 4 -> GameType.MALE_DOUBLES
            femaleCount == 4 -> GameType.FEMALE_DOUBLES
            maleCount == 2 && femaleCount == 2 -> GameType.MIXED_DOUBLES
            else -> GameType.FREE
        }

        val isManagerOrOwner = requesterMembership.role == GroupRole.OWNER || requesterMembership.role == GroupRole.MANAGER
        val shouldCreateAsProposal = if (isManagerOrOwner) {
            request.asProposal == true
        } else {
            true
        }
        val proposalStatus = if (shouldCreateAsProposal) GameProposalStatus.PENDING else GameProposalStatus.APPROVED
        val game = gameRepository.save(
            Game(
                group = group,
                createdBy = creator,
                gameType = autoGameType,
                proposalStatus = proposalStatus,
                proposedByUserId = authenticatedUser.userId,
            ),
        )

        request.teamAUserIds.forEach { userId ->
            val user = userRepository.findById(userId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.")
            }
            val skill = playerSkillRepository.findByUserId(userId)
            gamePlayerRepository.save(GamePlayer(game = game, user = user, team = "A", gradeAtTime = skill?.nationalGrade))
        }
        request.teamBUserIds.forEach { userId ->
            val user = userRepository.findById(userId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.")
            }
            val skill = playerSkillRepository.findByUserId(userId)
            gamePlayerRepository.save(GamePlayer(game = game, user = user, team = "B", gradeAtTime = skill?.nationalGrade))
        }

        if (proposalStatus == GameProposalStatus.APPROVED) {
            notificationService.sendToGroupMembers(
                allUserIds, authenticatedUser.userId,
                NotificationType.GAME_CREATED, "게임 생성", "${group.name} 이벤트에서 새 게임이 생성되었습니다.",
                "GAME", game.id!!,
            )
        } else {
            val managerIds = groupMemberRepository.findAllByGroupId(groupId)
                .filter {
                    it.status == GroupMemberStatus.ACTIVE &&
                        (it.role == GroupRole.OWNER || it.role == GroupRole.MANAGER)
                }
                .mapNotNull { it.user.id }
            notificationService.sendToGroupMembers(
                managerIds,
                authenticatedUser.userId,
                NotificationType.GAME_PROPOSAL_RECEIVED,
                "게임 제안 도착",
                "${creator.nickname}님이 ${group.name} 이벤트에 게임을 제안했습니다.",
                "GAME",
                game.id!!,
            )
        }

        return toGameResponse(game)
    }

    @Transactional(readOnly = true)
    fun getGames(groupId: Long): List<GameResponse> {
        return gameRepository.findAllByGroupIdOrderByCreatedAtDesc(groupId).map { toGameResponse(it) }
    }

    @Transactional
    fun startGame(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long): GameResponse {
        val game = getGameInGroup(groupId, gameId)
        requireActiveMember(groupId, authenticatedUser.userId)
        if (effectiveProposalStatus(game) != GameProposalStatus.APPROVED) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "관리자 승인된 게임만 시작할 수 있습니다.")
        }

        if (game.status != GameStatus.PENDING) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING games can be started.")
        }

        // 참여 멤버 중 이미 진행중인 게임이 있는지 체크
        val players = gamePlayerRepository.findAllByGameId(gameId)
        val inProgressGames = gameRepository.findAllByGroupIdOrderByCreatedAtDesc(groupId)
            .filter { it.status == GameStatus.IN_PROGRESS && it.id != gameId }
        for (player in players) {
            val busy = inProgressGames.any { g ->
                gamePlayerRepository.findByGameIdAndUserId(g.id!!, player.user.id!!) != null
            }
            if (busy) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "${player.user.nickname}님이 이미 다른 게임 진행 중입니다.")
            }
        }

        game.status = GameStatus.IN_PROGRESS
        game.startedAt = Instant.now()
        gameRepository.save(game)

        val memberIds = groupMemberRepository.findAllByGroupId(groupId)
            .filter { it.status == GroupMemberStatus.ACTIVE }
            .mapNotNull { it.user.id }

        notificationService.sendToGroupMembers(
            memberIds, authenticatedUser.userId,
            NotificationType.GAME_STARTED, "게임 시작",
            "${game.group.name} 이벤트에서 게임이 시작되었습니다${courtNumberSuffix(game)}.",
            "GAME", game.id!!,
        )

        return toGameResponse(game)
    }

    @Transactional
    fun updateCourtNumber(
        authenticatedUser: AuthenticatedUser,
        groupId: Long,
        gameId: Long,
        request: UpdateGameCourtNumberRequest,
    ): GameResponse {
        val game = getGameInGroup(groupId, gameId)
        requireActiveMember(groupId, authenticatedUser.userId)
        if (effectiveProposalStatus(game) != GameProposalStatus.APPROVED) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "승인된 게임만 코트 번호를 수정할 수 있습니다.")
        }

        if (game.status != GameStatus.PENDING && game.status != GameStatus.IN_PROGRESS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING or IN_PROGRESS games can update court number.")
        }
        if (request.courtNumber != null && request.courtNumber < 1) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "코트 번호는 1 이상이어야 합니다.")
        }

        game.courtNumber = request.courtNumber
        gameRepository.save(game)
        return toGameResponse(game)
    }

    @Transactional
    fun approveProposal(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long): GameResponse {
        requireOwnerOrManager(groupId, authenticatedUser.userId)
        val game = getGameInGroup(groupId, gameId)
        if (game.status != GameStatus.PENDING) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "대기 상태 게임만 제안 수락할 수 있습니다.")
        }
        if (effectiveProposalStatus(game) != GameProposalStatus.PENDING) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "수락 가능한 제안 상태가 아닙니다.")
        }

        game.proposalStatus = GameProposalStatus.APPROVED
        game.proposalReviewedByUserId = authenticatedUser.userId
        game.proposalReviewedAt = Instant.now()
        game.proposalRejectReason = null
        gameRepository.save(game)

        val playerUserIds = gamePlayerRepository.findAllByGameId(gameId).mapNotNull { it.user.id }
        notificationService.sendToGroupMembers(
            playerUserIds,
            authenticatedUser.userId,
            NotificationType.GAME_PROPOSAL_APPROVED,
            "게임 제안 수락",
            "${game.group.name} 이벤트에서 제안된 게임이 수락되었습니다.",
            "GAME",
            game.id!!,
        )

        return toGameResponse(game)
    }

    @Transactional
    fun rejectProposal(
        authenticatedUser: AuthenticatedUser,
        groupId: Long,
        gameId: Long,
        request: RejectGameProposalRequest,
    ): GameResponse {
        requireOwnerOrManager(groupId, authenticatedUser.userId)
        val game = getGameInGroup(groupId, gameId)
        if (game.status != GameStatus.PENDING) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "대기 상태 게임만 제안 거절할 수 있습니다.")
        }
        if (effectiveProposalStatus(game) != GameProposalStatus.PENDING) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "거절 가능한 제안 상태가 아닙니다.")
        }

        game.proposalStatus = GameProposalStatus.REJECTED
        game.proposalReviewedByUserId = authenticatedUser.userId
        game.proposalReviewedAt = Instant.now()
        game.proposalRejectReason = request.reason?.trim()?.ifBlank { null }
        game.status = GameStatus.CANCELLED
        gameRepository.save(game)

        val proposalUserId = game.proposedByUserId
        if (proposalUserId != null && proposalUserId != authenticatedUser.userId) {
            val reasonMessage = game.proposalRejectReason?.let { " (사유: $it)" } ?: ""
            notificationService.send(
                proposalUserId,
                NotificationType.GAME_PROPOSAL_REJECTED,
                "게임 제안 거절",
                "${game.group.name} 이벤트에서 게임 제안이 거절되었습니다$reasonMessage.",
                "GAME",
                game.id!!,
            )
        }

        return toGameResponse(game)
    }

    @Transactional
    fun finishGame(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long): GameResponse {
        val game = getGameInGroup(groupId, gameId)
        requireActiveMember(groupId, authenticatedUser.userId)

        if (game.status != GameStatus.IN_PROGRESS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only IN_PROGRESS games can be finished.")
        }

        game.status = GameStatus.FINISHED
        game.finishedAt = Instant.now()
        gameRepository.save(game)

        val playerUserIds = gamePlayerRepository.findAllByGameId(gameId).mapNotNull { it.user.id }
        notificationService.sendToGroupMembers(
            playerUserIds, authenticatedUser.userId,
            NotificationType.GAME_FINISHED, "게임 종료",
            "${game.group.name} 이벤트의 게임이 종료되었습니다.",
            "GAME", game.id!!,
        )

        return toGameResponse(game)
    }

    @Transactional
    fun submitScore(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long, request: FinishGameRequest): GameResponse {
        val game = getGameInGroup(groupId, gameId)
        val managerOrOwner = isOwnerOrManager(groupId, authenticatedUser.userId)
        val participant = gamePlayerRepository.findByGameIdAndUserId(game.id!!, authenticatedUser.userId)
        if (!managerOrOwner && participant == null) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "게임 참여자만 점수를 입력할 수 있습니다.")
        }

        if (game.status != GameStatus.FINISHED) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only FINISHED games can have scores submitted.")
        }
        if (game.teamAScore != null && !managerOrOwner) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 점수가 입력되었습니다.")
        }
        if (game.pendingTeamAScore != null && !managerOrOwner) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 점수 확인 요청이 대기 중입니다.")
        }
        if (request.teamAScore == request.teamBScore) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "동점은 입력할 수 없습니다.")
        }

        if (managerOrOwner && game.teamAScore != null) {
            rollbackExpIfScored(game)
            game.teamAScore = null
            game.teamBScore = null
            game.winnerTeam = null
        }

        if (managerOrOwner && game.pendingTeamAScore != null) {
            clearPendingScore(game)
        }

        val requesterTeam = participant?.team
        val targetTeam = requesterTeam?.let { oppositeTeam(it) }

        game.pendingTeamAScore = request.teamAScore
        game.pendingTeamBScore = request.teamBScore
        game.pendingRequestedByTeam = requesterTeam
        game.pendingRequestedByUserId = authenticatedUser.userId
        game.pendingRequestedAt = Instant.now()
        gameRepository.save(game)

        if (targetTeam != null) {
            val targetUserIds = gamePlayerRepository.findAllByGameId(gameId)
                .filter { it.team == targetTeam }
                .mapNotNull { it.user.id }

            notificationService.sendToGroupMembers(
                targetUserIds, authenticatedUser.userId,
                NotificationType.GAME_SCORE_REQUESTED, "점수 확인 요청",
                "${game.group.name} 이벤트 게임의 점수 확인 요청이 도착했습니다.",
                "GAME", game.id!!,
            )
        }

        return toGameResponse(game)
    }

    @Transactional
    fun confirmScore(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long): GameResponse {
        val game = getGameInGroup(groupId, gameId)
        val pendingA = game.pendingTeamAScore
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "확인할 점수 요청이 없습니다.")
        val pendingB = game.pendingTeamBScore
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "확인할 점수 요청이 없습니다.")

        val managerOrOwner = isOwnerOrManager(groupId, authenticatedUser.userId)
        if (!managerOrOwner) {
            val requesterTeam = game.pendingRequestedByTeam
                ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "점수 요청 정보가 올바르지 않습니다.")
            val confirmerTeam = getParticipantTeam(game.id!!, authenticatedUser.userId)
            if (confirmerTeam != oppositeTeam(requesterTeam)) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "상대 팀 플레이어만 점수를 확정할 수 있습니다.")
            }
        }

        game.teamAScore = pendingA
        game.teamBScore = pendingB
        game.winnerTeam = when {
            pendingA > pendingB -> "A"
            pendingB > pendingA -> "B"
            else -> null
        }
        clearPendingScore(game)
        gameRepository.save(game)

        val players = gamePlayerRepository.findAllByGameId(gameId)
        if (game.winnerTeam != null) {
            players.forEach { player ->
                val expAmount = if (player.team == game.winnerTeam) 5.0 else 2.0
                addExp(player.user.id!!, expAmount)
            }
        }

        val requesterUserId = game.pendingRequestedByUserId
        if (requesterUserId != null) {
            notificationService.send(
                requesterUserId,
                NotificationType.GAME_SCORE_CONFIRMED,
                "점수 입력 확정",
                if (managerOrOwner) {
                    "${game.group.name} 이벤트 게임의 점수가 관리자 확정으로 반영되었습니다."
                } else {
                    "${game.group.name} 이벤트 게임의 점수가 상대 팀 확인으로 확정되었습니다."
                },
                "GAME",
                game.id!!,
            )
        }

        return toGameResponse(game)
    }

    @Transactional
    fun rejectScore(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long): GameResponse {
        val game = getGameInGroup(groupId, gameId)
        val requesterTeam = game.pendingRequestedByTeam
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "거절할 점수 요청이 없습니다.")
        val requesterUserId = game.pendingRequestedByUserId
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "거절할 점수 요청이 없습니다.")

        val rejecterTeam = getParticipantTeam(game.id!!, authenticatedUser.userId)
        if (rejecterTeam != oppositeTeam(requesterTeam)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "상대 팀 플레이어만 점수 요청을 거절할 수 있습니다.")
        }

        clearPendingScore(game)
        gameRepository.save(game)

        notificationService.send(
            requesterUserId,
            NotificationType.GAME_SCORE_REJECTED,
            "점수 입력 반려",
            "${game.group.name} 이벤트 게임의 점수 요청이 반려되어 재입력이 필요합니다.",
            "GAME",
            game.id!!,
        )

        return toGameResponse(game)
    }

    @Transactional
    fun cancelGame(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long): GameResponse {
        requireOwnerOrManager(groupId, authenticatedUser.userId)
        val game = getGameInGroup(groupId, gameId)

        if (game.status == GameStatus.CANCELLED) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 취소된 게임입니다.")
        }

        rollbackExpIfScored(game)
        clearPendingScore(game)
        game.teamAScore = null
        game.teamBScore = null
        game.winnerTeam = null
        game.status = GameStatus.CANCELLED
        gameRepository.save(game)

        return toGameResponse(game)
    }

    @Transactional
    fun deleteGame(authenticatedUser: AuthenticatedUser, groupId: Long, gameId: Long) {
        // 삭제는 취소로 통합한다. 하드 삭제는 수행하지 않는다.
        cancelGame(authenticatedUser, groupId, gameId)
    }

    private fun rollbackExpIfScored(game: Game) {
        if (game.winnerTeam == null) return
        val players = gamePlayerRepository.findAllByGameId(game.id!!)
        players.forEach { player ->
            val expAmount = if (player.team == game.winnerTeam) 5.0 else 2.0
            removeExp(player.user.id!!, expAmount)
        }
    }

    private fun removeExp(userId: Long, amount: Double) {
        val skill = playerSkillRepository.findByUserId(userId) ?: return
        skill.exp -= amount
        while (skill.exp < 0 && skill.lv > 1) {
            skill.lv -= 1
            skill.exp += 100.0
        }
        if (skill.exp < 0) skill.exp = 0.0
        playerSkillRepository.save(skill)
    }

    @Transactional(readOnly = true)
    fun getMemberStats(groupId: Long): List<MemberStatResponse> {
        val members = groupMemberRepository.findAllByGroupId(groupId)
            .filter { it.status == GroupMemberStatus.ACTIVE }
        val allGames = gameRepository.findAllByGroupIdOrderByCreatedAtDesc(groupId)
            .filter { it.status != GameStatus.CANCELLED }
        val allGameIds = allGames.map { it.id!! }.toSet()
        val finishedGameIds = allGames.filter { it.status == GameStatus.FINISHED }.map { it.id!! }.toSet()

        return members.map { member ->
            val userId = member.user.id!!
            val skill = playerSkillRepository.findByUserId(userId)
            val allPlays = gamePlayerRepository.findAllByUserId(userId)
                .filter { it.game.id!! in allGameIds }
            val finishedPlays = allPlays.filter { it.game.id!! in finishedGameIds }
            val winCount = finishedPlays.count { it.team == it.game.winnerTeam }
            val overallPlays = gamePlayerRepository.findAllByUserId(userId)
                .filter { it.game.status != GameStatus.CANCELLED }
            val overallFinishedPlays = overallPlays.filter { it.game.status == GameStatus.FINISHED }
            val overallWinCount = overallFinishedPlays.count { it.team == it.game.winnerTeam }
            MemberStatResponse(
                userId = userId,
                nickname = member.user.nickname,
                gender = member.user.gender,
                nationalGrade = skill?.nationalGrade,
                lv = skill?.lv ?: 1,
                exp = skill?.exp ?: 0.0,
                finishedGameCount = finishedPlays.size,
                totalGameCount = allPlays.size,
                winCount = winCount,
                winRate = if (finishedPlays.isNotEmpty()) (winCount.toDouble() / finishedPlays.size * 100) else 0.0,
                overallFinishedGameCount = overallFinishedPlays.size,
                overallTotalGameCount = overallPlays.size,
                overallWinCount = overallWinCount,
                overallWinRate = if (overallFinishedPlays.isNotEmpty()) {
                    overallWinCount.toDouble() / overallFinishedPlays.size * 100
                } else {
                    0.0
                },
            )
        }
    }

    @Transactional(readOnly = true)
    fun getTeamStats(groupId: Long): List<TeamStatResponse> {
        data class Counter(
            var eventGames: Int = 0,
            var eventWins: Int = 0,
            var overallGames: Int = 0,
            var overallWins: Int = 0,
        )

        val counters = mutableMapOf<String, Counter>()
        val allScoredFinishedGames = gameRepository.findAll()
            .filter { it.status == GameStatus.FINISHED && it.teamAScore != null && it.teamBScore != null }

        allScoredFinishedGames.forEach { game ->
            val players = gamePlayerRepository.findAllByGameId(game.id!!)
            fun addTeam(team: String) {
                val ids = players.filter { it.team == team }.mapNotNull { it.user.id }.sorted()
                if (ids.size != 2 || ids[0] == ids[1]) return
                val key = "${ids[0]}-${ids[1]}"
                val c = counters.getOrPut(key) { Counter() }
                c.overallGames += 1
                if (game.winnerTeam == team) c.overallWins += 1
                if (game.group.id == groupId) {
                    c.eventGames += 1
                    if (game.winnerTeam == team) c.eventWins += 1
                }
            }
            addTeam("A")
            addTeam("B")
        }

        return counters.entries.map { (teamKey, c) ->
            TeamStatResponse(
                teamKey = teamKey,
                eventGames = c.eventGames,
                eventWins = c.eventWins,
                eventWinRate = if (c.eventGames > 0) c.eventWins.toDouble() / c.eventGames * 100 else 0.0,
                overallGames = c.overallGames,
                overallWins = c.overallWins,
                overallWinRate = if (c.overallGames > 0) c.overallWins.toDouble() / c.overallGames * 100 else 0.0,
            )
        }
    }

    @Transactional(readOnly = true)
    fun recommendGame(groupId: Long, type: GameType): RecommendResponse {
        val stats = getMemberStats(groupId)
        val gradeOrder = NationalGrade.entries

        // 성별 필터
        val candidates = when (type) {
            GameType.MALE_DOUBLES -> stats.filter { it.gender == Gender.MALE }
            GameType.FEMALE_DOUBLES -> stats.filter { it.gender == Gender.FEMALE }
            GameType.MIXED_DOUBLES -> stats
            GameType.FREE -> stats
        }

        if (type == GameType.MIXED_DOUBLES) {
            val males = candidates.filter { it.gender == Gender.MALE }
            val females = candidates.filter { it.gender == Gender.FEMALE }
            if (males.size < 2 || females.size < 2) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "혼복에 필요한 인원이 부족합니다. (남2+여2)")
            }
            // 우선순위 스코어로 정렬, 낮을수록 우선 선택
            val pickedMales = males.sortedBy { priorityScore(it) }.take(2)
            val pickedFemales = females.sortedBy { priorityScore(it) }.take(2)
            val selected = pickedMales + pickedFemales
            return balanceTeams(selected, gradeOrder, type, groupId)
        }

        if (candidates.size < 4) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "추천에 필요한 인원이 부족합니다. (최소 4명)")
        }

        val selected = candidates.sortedBy { priorityScore(it) }.take(4)
        return balanceTeams(selected, gradeOrder, type, groupId)
    }

    /**
     * 우선순위 스코어 (낮을수록 우선 선택)
     * 1순위: 급수 (비슷한 급수끼리 묶이도록 중앙 급수와의 거리 — 선택 단계에선 빈도수 우선)
     * 2순위: 빈도수 (총 게임수 낮을수록 우선)
     * 3순위: 경험치 역수 (경험치 낮을수록 기회 부여)
     * 4순위: 승률 역수 (승률 낮을수록 기회 부여)
     */
    private fun priorityScore(p: MemberStatResponse): Double {
        val freqWeight = p.totalGameCount * 10.0   // 빈도 낮을수록 우선
        val expWeight = (100.0 - p.exp) * 0.01     // 경험치 낮을수록 우선
        val winRateWeight = (100.0 - p.winRate) * 0.01
        return freqWeight + expWeight + winRateWeight
    }

    /**
     * 파트너 빈도 맵: (userA, userB) → 같은 팀 횟수
     */
    private fun buildPartnerFrequency(groupId: Long): Map<Pair<Long, Long>, Int> {
        val games = gameRepository.findAllByGroupIdOrderByCreatedAtDesc(groupId)
            .filter { it.status == GameStatus.FINISHED || it.status == GameStatus.IN_PROGRESS || it.status == GameStatus.PENDING }
        val freq = mutableMapOf<Pair<Long, Long>, Int>()
        for (game in games) {
            val players = gamePlayerRepository.findAllByGameId(game.id!!)
            val teams = players.groupBy { it.team }
            for ((_, teammates) in teams) {
                val ids = teammates.mapNotNull { it.user.id }.sorted()
                if (ids.size == 2) {
                    val key = Pair(ids[0], ids[1])
                    freq[key] = (freq[key] ?: 0) + 1
                }
            }
        }
        return freq
    }

    private fun partnerCount(freq: Map<Pair<Long, Long>, Int>, a: Long, b: Long): Int {
        val key = if (a < b) Pair(a, b) else Pair(b, a)
        return freq[key] ?: 0
    }

    private fun balanceTeams(
        players: List<MemberStatResponse>,
        gradeOrder: List<NationalGrade>,
        type: GameType,
        groupId: Long,
    ): RecommendResponse {
        val applyMaleWeight = type == GameType.MIXED_DOUBLES || type == GameType.FREE
        val partnerFreq = buildPartnerFrequency(groupId)

        fun strength(p: MemberStatResponse): Double {
            val gradeIdx = gradeOrder.indexOf(p.nationalGrade ?: NationalGrade.F)
            val base = gradeIdx * 100.0 + p.lv + (p.exp / 100.0) + (p.winRate * 0.5)
            return if (applyMaleWeight && p.gender == Gender.MALE) base * 1.15 else base
        }

        val ids = players.map { it.userId }

        if (type == GameType.MIXED_DOUBLES) {
            val males = players.filter { it.gender == Gender.MALE }.sortedByDescending { strength(it) }
            val females = players.filter { it.gender == Gender.FEMALE }.sortedByDescending { strength(it) }
            // 파트너 빈도가 적은 조합 우선: 강남+약여 vs 약남+강여 OR 강남+강여 vs 약남+약여
            val optionA = Pair(listOf(males[0], females[1]), listOf(males[1], females[0])) // 크로스
            val optionB = Pair(listOf(males[0], females[0]), listOf(males[1], females[1])) // 순차

            fun pairCost(team: List<MemberStatResponse>): Int =
                partnerCount(partnerFreq, team[0].userId, team[1].userId)

            fun teamBalanceDiff(opt: Pair<List<MemberStatResponse>, List<MemberStatResponse>>): Double =
                kotlin.math.abs(opt.first.sumOf { strength(it) } - opt.second.sumOf { strength(it) })

            // 파트너 빈도 총합 낮은 것 우선, 동점이면 밸런스 좋은 것
            val costA = pairCost(optionA.first) + pairCost(optionA.second)
            val costB = pairCost(optionB.first) + pairCost(optionB.second)
            val pick = if (costA < costB) optionA
                else if (costB < costA) optionB
                else if (teamBalanceDiff(optionA) <= teamBalanceDiff(optionB)) optionA else optionB

            return RecommendResponse(
                teamAUserIds = pick.first.map { it.userId },
                teamBUserIds = pick.second.map { it.userId },
            )
        }

        // 남복/여복/자유: 4명에서 최적 팀 조합 (6가지 중 파트너 빈도 최소 + 밸런스 최적)
        data class TeamOption(val teamA: List<Long>, val teamB: List<Long>, val partnerCost: Int, val balanceDiff: Double)

        val options = mutableListOf<TeamOption>()
        for (i in 0 until 4) {
            for (j in i + 1 until 4) {
                val tA = listOf(ids[i], ids[j])
                val tB = ids.filterIndexed { idx, _ -> idx != i && idx != j }
                val pCost = partnerCount(partnerFreq, tA[0], tA[1]) + partnerCount(partnerFreq, tB[0], tB[1])
                val diff = kotlin.math.abs(
                    players.filter { it.userId in tA }.sumOf { strength(it) } -
                    players.filter { it.userId in tB }.sumOf { strength(it) },
                )
                options.add(TeamOption(tA, tB, pCost, diff))
            }
        }

        // 1순위: 파트너 빈도 최소, 2순위: 팀 밸런스
        val best = options.sortedWith(compareBy({ it.partnerCost }, { it.balanceDiff })).first()
        return RecommendResponse(teamAUserIds = best.teamA, teamBUserIds = best.teamB)
    }

    private fun addExp(userId: Long, amount: Double) {
        val skill = playerSkillRepository.findByUserId(userId) ?: return
        skill.exp += amount
        while (skill.exp >= 100.0 && skill.lv < 99) {
            skill.exp -= 100.0
            skill.lv += 1
        }
        playerSkillRepository.save(skill)
    }

    private fun requireOwnerOrManager(groupId: Long, userId: Long) {
        val membership = requireActiveMembership(groupId, userId)
        val allowed = membership.role == GroupRole.OWNER || membership.role == GroupRole.MANAGER
        if (!allowed) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only owner or manager can perform this action.")
        }
    }

    private fun isOwnerOrManager(groupId: Long, userId: Long): Boolean {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId) ?: return false
        if (membership.status != GroupMemberStatus.ACTIVE) return false
        return membership.role == GroupRole.OWNER || membership.role == GroupRole.MANAGER
    }

    private fun requireActiveMembership(groupId: Long, userId: Long): GroupMember {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only members can perform this action.")
        if (membership.status != GroupMemberStatus.ACTIVE) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only active members can perform this action.")
        }
        return membership
    }

    private fun requireGameParticipant(game: Game, userId: Long) {
        val player = gamePlayerRepository.findByGameIdAndUserId(game.id!!, userId)
        if (player == null) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only game participants can perform this action.")
        }
    }

    private fun requireActiveMember(groupId: Long, userId: Long) {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
        if (membership == null || membership.status != GroupMemberStatus.ACTIVE) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only active members can perform this action.")
        }
    }

    private fun getParticipantTeam(gameId: Long, userId: Long): String {
        val player = gamePlayerRepository.findByGameIdAndUserId(gameId, userId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only game participants can perform this action.")
        return player.team
    }

    private fun oppositeTeam(team: String): String =
        when (team) {
            "A" -> "B"
            "B" -> "A"
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid team value.")
        }

    private fun clearPendingScore(game: Game) {
        game.pendingTeamAScore = null
        game.pendingTeamBScore = null
        game.pendingRequestedByTeam = null
        game.pendingRequestedByUserId = null
        game.pendingRequestedAt = null
    }

    private fun courtNumberSuffix(game: Game): String =
        game.courtNumber?.let { " (코트 ${it}번)" } ?: ""

    private fun getGroup(groupId: Long): MatchGroup =
        matchGroupRepository.findById(groupId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found.")
        }

    private fun getGameInGroup(groupId: Long, gameId: Long): Game =
        gameRepository.findByIdAndGroupId(gameId, groupId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found.")

    private fun toGameResponse(game: Game): GameResponse {
        val players = gamePlayerRepository.findAllByGameId(game.id!!)
        val teamA = players.filter { it.team == "A" }.map { toPlayerResponse(it) }
        val teamB = players.filter { it.team == "B" }.map { toPlayerResponse(it) }
        return GameResponse(
            id = game.id!!,
            groupId = game.group.id!!,
            status = game.status,
            proposalStatus = effectiveProposalStatus(game),
            proposedByUserId = game.proposedByUserId,
            proposalReviewedByUserId = game.proposalReviewedByUserId,
            proposalReviewedAt = game.proposalReviewedAt?.toString(),
            proposalRejectReason = game.proposalRejectReason,
            gameType = game.gameType,
            teamA = teamA,
            teamB = teamB,
            courtNumber = game.courtNumber,
            teamAScore = game.teamAScore,
            teamBScore = game.teamBScore,
            winnerTeam = game.winnerTeam,
            pendingTeamAScore = game.pendingTeamAScore,
            pendingTeamBScore = game.pendingTeamBScore,
            pendingRequestedByTeam = game.pendingRequestedByTeam,
            pendingRequestedByUserId = game.pendingRequestedByUserId,
            pendingRequestedAt = game.pendingRequestedAt?.toString(),
            createdAt = game.createdAt.toString(),
            startedAt = game.startedAt?.toString(),
            finishedAt = game.finishedAt?.toString(),
        )
    }

    private fun effectiveProposalStatus(game: Game): GameProposalStatus =
        game.proposalStatus ?: GameProposalStatus.APPROVED

    private fun toPlayerResponse(gamePlayer: GamePlayer): GamePlayerResponse {
        val user = gamePlayer.user
        val skill = playerSkillRepository.findByUserId(user.id!!)
        return GamePlayerResponse(
            userId = user.id!!,
            nickname = user.nickname,
            gender = user.gender,
            nationalGrade = skill?.nationalGrade,
        )
    }
}
