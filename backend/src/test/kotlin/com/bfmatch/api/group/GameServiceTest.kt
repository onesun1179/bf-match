package com.bfmatch.api.group

import com.bfmatch.api.auth.AuthenticatedUser
import com.bfmatch.api.notification.NotificationService
import com.bfmatch.api.user.AuthProvider
import com.bfmatch.api.user.NationalGrade
import com.bfmatch.api.user.PlayerSkill
import com.bfmatch.api.user.PlayerSkillRepository
import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

class GameServiceTest {
    private lateinit var gameRepository: GameRepository
    private lateinit var gamePlayerRepository: GamePlayerRepository
    private lateinit var groupMemberRepository: GroupMemberRepository
    private lateinit var matchGroupRepository: MatchGroupRepository
    private lateinit var userRepository: UserRepository
    private lateinit var playerSkillRepository: PlayerSkillRepository
    private lateinit var notificationService: NotificationService
    private lateinit var service: GameService

    private lateinit var owner: User
    private lateinit var manager: User
    private lateinit var memberA: User
    private lateinit var memberB: User
    private lateinit var group: MatchGroup
    private lateinit var game: Game

    @BeforeEach
    fun setUp() {
        gameRepository = mock()
        gamePlayerRepository = mock()
        groupMemberRepository = mock()
        matchGroupRepository = mock()
        userRepository = mock()
        playerSkillRepository = mock()
        notificationService = mock()
        service = GameService(
            gameRepository,
            gamePlayerRepository,
            groupMemberRepository,
            matchGroupRepository,
            userRepository,
            playerSkillRepository,
            notificationService,
        )

        owner = user(id = 1, nickname = "owner")
        manager = user(id = 2, nickname = "manager")
        memberA = user(id = 3, nickname = "memberA")
        memberB = user(id = 4, nickname = "memberB")

        group = MatchGroup(
            id = 10,
            name = "test-group",
            owner = owner,
            closed = false,
        )
        game = Game(
            id = 100,
            group = group,
            createdBy = owner,
            status = GameStatus.FINISHED,
            proposalStatus = GameProposalStatus.APPROVED,
            createdAt = Instant.now(),
            finishedAt = Instant.now(),
        )

        whenever(gameRepository.findByIdAndGroupId(100, 10)).thenReturn(game)
        whenever(gameRepository.save(any())).thenAnswer { it.arguments[0] as Game }
    }

    @Test
    fun `submitScore rejects invalid winnerTeam with 400`() {
        val principal = authUser(memberA.id!!)
        whenever(groupMemberRepository.findByGroupIdAndUserId(10, principal.userId)).thenReturn(
            GroupMember(group = group, user = memberA, role = GroupRole.MEMBER, status = GroupMemberStatus.ACTIVE),
        )
        whenever(gamePlayerRepository.findByGameIdAndUserId(100, principal.userId)).thenReturn(
            GamePlayer(game = game, user = memberA, team = "A"),
        )

        val ex = assertThrows(ResponseStatusException::class.java) {
            service.submitScore(principal, 10, 100, FinishGameRequest(winnerTeam = "Z"))
        }

        assertEquals(HttpStatus.BAD_REQUEST, ex.statusCode)
    }

    @Test
    fun `submitScore rejects non participant with 403`() {
        val outsider = authUser(999)
        whenever(groupMemberRepository.findByGroupIdAndUserId(10, outsider.userId)).thenReturn(null)
        whenever(gamePlayerRepository.findByGameIdAndUserId(100, outsider.userId)).thenReturn(null)

        val ex = assertThrows(ResponseStatusException::class.java) {
            service.submitScore(outsider, 10, 100, FinishGameRequest(winnerTeam = "A"))
        }

        assertEquals(HttpStatus.FORBIDDEN, ex.statusCode)
    }

    @Test
    fun `rejectScore allows only opposite team`() {
        val requester = authUser(memberA.id!!)
        game.pendingWinnerTeam = "A"
        game.pendingRequestedByTeam = "A"
        game.pendingRequestedByUserId = requester.userId
        whenever(gamePlayerRepository.findByGameIdAndUserId(100, requester.userId)).thenReturn(
            GamePlayer(game = game, user = memberA, team = "A"),
        )

        val ex = assertThrows(ResponseStatusException::class.java) {
            service.rejectScore(requester, 10, 100)
        }

        assertEquals(HttpStatus.FORBIDDEN, ex.statusCode)
    }

    @Test
    fun `manager can force confirm pending result and apply winner exp only`() {
        val managerPrincipal = authUser(manager.id!!)
        whenever(groupMemberRepository.findByGroupIdAndUserId(10, managerPrincipal.userId)).thenReturn(
            GroupMember(group = group, user = manager, role = GroupRole.MANAGER, status = GroupMemberStatus.ACTIVE),
        )

        game.pendingWinnerTeam = "B"
        game.pendingRequestedByTeam = "A"
        game.pendingRequestedByUserId = memberA.id

        val playerA = GamePlayer(game = game, user = memberA, team = "A", gradeAtTime = NationalGrade.D, appliedExp = 0.0)
        val playerB = GamePlayer(game = game, user = memberB, team = "B", gradeAtTime = NationalGrade.D, appliedExp = 0.0)
        whenever(gamePlayerRepository.findAllByGameId(100)).thenReturn(listOf(playerA, playerB))

        val skillA = PlayerSkill(id = 1, user = memberA, nationalGrade = NationalGrade.D, lv = 3, exp = 10.0)
        val skillB = PlayerSkill(id = 2, user = memberB, nationalGrade = NationalGrade.D, lv = 3, exp = 10.0)
        whenever(playerSkillRepository.findByUserId(memberA.id!!)).thenReturn(skillA)
        whenever(playerSkillRepository.findByUserId(memberB.id!!)).thenReturn(skillB)
        whenever(playerSkillRepository.save(any())).thenAnswer { it.arguments[0] as PlayerSkill }

        service.confirmScore(managerPrincipal, 10, 100)

        assertEquals("B", game.winnerTeam)
        assertEquals(null, game.pendingWinnerTeam)
        assertEquals(10.0, skillA.exp)
        assertEquals(true, skillB.exp > 10.0)
        verify(gameRepository).save(eq(game))
    }

    @Test
    fun `manager resubmission rolls back previous exp before new confirm`() {
        val managerPrincipal = authUser(manager.id!!)
        whenever(groupMemberRepository.findByGroupIdAndUserId(10, managerPrincipal.userId)).thenReturn(
            GroupMember(group = group, user = manager, role = GroupRole.MANAGER, status = GroupMemberStatus.ACTIVE),
        )

        game.winnerTeam = "A"
        game.teamAScore = 1
        game.teamBScore = 0

        val oldWinner = GamePlayer(game = game, user = memberA, team = "A", gradeAtTime = NationalGrade.D, appliedExp = 2.0)
        val loser = GamePlayer(game = game, user = memberB, team = "B", gradeAtTime = NationalGrade.D, appliedExp = 0.0)
        whenever(gamePlayerRepository.findAllByGameId(100)).thenReturn(listOf(oldWinner, loser))

        val skillA = PlayerSkill(id = 1, user = memberA, nationalGrade = NationalGrade.D, lv = 3, exp = 20.0)
        val skillB = PlayerSkill(id = 2, user = memberB, nationalGrade = NationalGrade.D, lv = 3, exp = 20.0)
        whenever(playerSkillRepository.findByUserId(memberA.id!!)).thenReturn(skillA)
        whenever(playerSkillRepository.findByUserId(memberB.id!!)).thenReturn(skillB)
        whenever(playerSkillRepository.save(any())).thenAnswer { it.arguments[0] as PlayerSkill }
        whenever(gamePlayerRepository.findByGameIdAndUserId(100, managerPrincipal.userId)).thenReturn(null)

        service.submitScore(managerPrincipal, 10, 100, FinishGameRequest("B"))

        assertEquals(18.0, skillA.exp)
        assertEquals("B", game.pendingWinnerTeam)
        assertEquals(null, game.winnerTeam)
        assertEquals(null, game.teamAScore)
        assertEquals(null, game.teamBScore)
    }

    private fun authUser(id: Long): AuthenticatedUser =
        AuthenticatedUser(
            userId = id,
            provider = "LOCAL",
            providerUserId = "local-$id",
            email = null,
            nickname = "user-$id",
        )

    private fun user(id: Long, nickname: String): User =
        User(
            id = id,
            authProvider = AuthProvider.LOCAL,
            providerUserId = "p-$id",
            nickname = nickname,
            email = "$nickname@test.com",
        )
}
