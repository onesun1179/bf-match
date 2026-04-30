package com.bfmatch.api.group

import com.bfmatch.api.auth.AuthenticatedUser
import com.bfmatch.api.notification.NotificationService
import com.bfmatch.api.notification.NotificationType
import com.bfmatch.api.user.PlayerSkillRepository
import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class GroupService(
    @Value("\${app.frontend.base-url}") private val frontendBaseUrl: String,
    private val matchGroupRepository: MatchGroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val groupInviteLinkRepository: GroupInviteLinkRepository,
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val notificationService: NotificationService,
) {
    @Transactional
    fun createGroup(authenticatedUser: AuthenticatedUser, request: CreateGroupRequest): GroupDetailResponse {
        val owner = getUser(authenticatedUser.userId)
        val group = matchGroupRepository.save(
            MatchGroup(
                name = request.name.trim(),
                description = request.description?.trim()?.ifBlank { null },
                owner = owner,
                visibility = request.visibility,
                location = request.location?.trim()?.ifBlank { null },
                startAt = request.startAt?.let { Instant.parse(it) },
                endAt = request.endAt?.let { Instant.parse(it) },
                registrationDeadline = request.registrationDeadline?.let { Instant.parse(it) },
                minGrade = request.minGrade,
                maxGrade = request.maxGrade,
                maxMembers = request.maxMembers,
                maxMale = request.maxMale,
                maxFemale = request.maxFemale,
            ),
        )

        groupMemberRepository.save(
            GroupMember(
                group = group,
                user = owner,
                role = GroupRole.OWNER,
                status = GroupMemberStatus.ACTIVE,
            ),
        )

        return getGroupDetail(authenticatedUser, group.id!!)
    }

    @Transactional
    fun updateGroup(authenticatedUser: AuthenticatedUser, groupId: Long, request: CreateGroupRequest): GroupDetailResponse {
        requireOwnerOrManager(groupId, authenticatedUser.userId)
        val group = getGroup(groupId)
        group.name = request.name.trim()
        group.description = request.description?.trim()?.ifBlank { null }
        group.visibility = request.visibility
        group.location = request.location?.trim()?.ifBlank { null }
        group.startAt = request.startAt?.let { Instant.parse(it) }
        group.endAt = request.endAt?.let { Instant.parse(it) }
        group.registrationDeadline = request.registrationDeadline?.let { Instant.parse(it) }
        group.minGrade = request.minGrade
        group.maxGrade = request.maxGrade
        group.maxMembers = request.maxMembers
        group.maxMale = request.maxMale
        group.maxFemale = request.maxFemale
        matchGroupRepository.save(group)

        val memberIds = groupMemberRepository.findAllByGroupId(groupId)
            .filter { it.status == GroupMemberStatus.ACTIVE }
            .mapNotNull { it.user.id }
        notificationService.sendToGroupMembers(memberIds, authenticatedUser.userId, NotificationType.GROUP_UPDATED,
            "이벤트 정보 변경", "${group.name} 이벤트 정보가 수정되었습니다.", "GROUP", groupId)

        return getGroupDetail(authenticatedUser, groupId)
    }

    @Transactional(readOnly = true)
    fun getMyGroups(authenticatedUser: AuthenticatedUser): List<GroupSummaryResponse> =
        groupMemberRepository.findAllByUserId(authenticatedUser.userId)
            .filter { it.status != GroupMemberStatus.LEFT && it.status != GroupMemberStatus.BLOCKED }
            .map { membership ->
                val group = membership.group
                toSummary(group, membership.role, membership.status)
            }

    @Transactional(readOnly = true)
    fun getPublicGroups(authenticatedUser: AuthenticatedUser): List<GroupSummaryResponse> =
        matchGroupRepository.findAllByVisibilityOrderByCreatedAtDesc(GroupVisibility.PUBLIC).map { group ->
            val m = groupMemberRepository.findByGroupIdAndUserId(group.id!!, authenticatedUser.userId)
            toSummary(group, m?.role, m?.status)
        }

    @Transactional
    fun joinPublicGroup(authenticatedUser: AuthenticatedUser, groupId: Long): GroupDetailResponse {
        val group = getGroup(groupId)
        if (group.visibility != GroupVisibility.PUBLIC) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "공개 이벤트만 직접 참여할 수 있습니다.")
        }
        val user = getUser(authenticatedUser.userId)
        val existing = groupMemberRepository.findByGroupIdAndUserId(groupId, user.id!!)
        if (existing != null) {
            if (existing.status == GroupMemberStatus.BLOCKED) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are blocked from this group.")
            }
            if (existing.status != GroupMemberStatus.ACTIVE) {
                existing.status = GroupMemberStatus.ACTIVE
                existing.joinedAt = Instant.now()
                groupMemberRepository.save(existing)
            }
        } else {
            groupMemberRepository.save(
                GroupMember(group = group, user = user, role = GroupRole.MEMBER, status = GroupMemberStatus.ACTIVE),
            )
        }

        notifyManagers(group, authenticatedUser.userId, NotificationType.MEMBER_JOINED,
            "새 멤버 참여", "${user.nickname}님이 ${group.name}에 참여했습니다.", groupId)

        return getGroupDetail(authenticatedUser, groupId)
    }

    @Transactional(readOnly = true)
    fun getGroupDetail(authenticatedUser: AuthenticatedUser, groupId: Long): GroupDetailResponse {
        val group = getGroup(groupId)
        val myMembership = groupMemberRepository.findByGroupIdAndUserId(groupId, authenticatedUser.userId)
        val isMember = myMembership != null && myMembership.status != GroupMemberStatus.LEFT && myMembership.status != GroupMemberStatus.BLOCKED

        if (!isMember && group.visibility != GroupVisibility.PUBLIC) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this group.")
        }

        val members = groupMemberRepository.findAllByGroupId(groupId)
            .filter { it.status != GroupMemberStatus.LEFT && it.status != GroupMemberStatus.BLOCKED }
            .map {
                GroupMemberResponse(
                    userId = it.user.id!!,
                    nickname = it.user.nickname,
                    gender = it.user.gender,
                    nationalGrade = playerSkillRepository.findByUserId(it.user.id!!)?.nationalGrade,
                    role = it.role,
                    status = it.status,
                )
            }

        return GroupDetailResponse(
            id = group.id!!,
            name = group.name,
            description = group.description,
            visibility = group.visibility,
            ownerUserId = group.owner.id!!,
            memberCount = members.count { it.status == GroupMemberStatus.ACTIVE }.toLong(),
            myRole = myMembership?.role,
            myStatus = myMembership?.status,
            members = members,
            location = group.location,
            startAt = group.startAt?.toString(),
            endAt = group.endAt?.toString(),
            registrationDeadline = group.registrationDeadline?.toString(),
            minGrade = group.minGrade,
            maxGrade = group.maxGrade,
            maxMembers = group.maxMembers,
            maxMale = group.maxMale,
            maxFemale = group.maxFemale,
            closed = group.closed,
        )
    }

    @Transactional
    fun inviteMember(authenticatedUser: AuthenticatedUser, groupId: Long, request: InviteGroupMemberRequest): GroupDetailResponse {
        requireOwnerOrManager(groupId, authenticatedUser.userId)

        val invitee = getUser(request.inviteeUserId)
        val existingMembership = groupMemberRepository.findByGroupIdAndUserId(groupId, invitee.id!!)
        if (existingMembership != null) {
            existingMembership.role = GroupRole.MEMBER
            existingMembership.status = GroupMemberStatus.INVITED
            groupMemberRepository.save(existingMembership)
        } else {
            groupMemberRepository.save(
                GroupMember(
                    group = getGroup(groupId),
                    user = invitee,
                    role = GroupRole.MEMBER,
                    status = GroupMemberStatus.INVITED,
                ),
            )
        }

        return getGroupDetail(authenticatedUser, groupId)
    }

    @Transactional
    fun createInviteLink(authenticatedUser: AuthenticatedUser, groupId: Long): InviteLinkResponse {
        requireOwnerOrManager(groupId, authenticatedUser.userId)

        val group = getGroup(groupId)
        val inviter = getUser(authenticatedUser.userId)
        val inviteLink = groupInviteLinkRepository.save(
            GroupInviteLink(
                group = group,
                inviter = inviter,
                expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES),
            ),
        )

        return InviteLinkResponse(
            token = inviteLink.token,
            inviteUrl = "$frontendBaseUrl/groups/join/${inviteLink.token}",
            expiresAt = inviteLink.expiresAt.toString(),
        )
    }

    @Transactional(readOnly = true)
    fun getInviteLinkInfo(token: String): InviteLinkInfoResponse {
        val inviteLink = groupInviteLinkRepository.findByToken(token)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite link.")

        val effectiveStatus = when {
            inviteLink.status != InviteLinkStatus.PENDING -> inviteLink.status
            inviteLink.expiresAt.isBefore(Instant.now()) -> InviteLinkStatus.EXPIRED
            else -> InviteLinkStatus.PENDING
        }

        val group = inviteLink.group
        return InviteLinkInfoResponse(
            token = inviteLink.token,
            groupId = group.id!!,
            groupName = group.name,
            groupDescription = group.description,
            inviterNickname = inviteLink.inviter.nickname,
            invitedAt = inviteLink.createdAt.toString(),
            memberCount = groupMemberRepository.countByGroupIdAndStatus(group.id!!, GroupMemberStatus.ACTIVE),
            status = effectiveStatus,
            expiresAt = inviteLink.expiresAt.toString(),
        )
    }

    @Transactional
    fun acceptInvite(authenticatedUser: AuthenticatedUser, token: String): GroupDetailResponse {
        val inviteLink = findPendingInviteLink(token)

        val group = inviteLink.group
        val user = getUser(authenticatedUser.userId)
        val existingMembership = groupMemberRepository.findByGroupIdAndUserId(group.id!!, user.id!!)

        if (existingMembership != null) {
            if (existingMembership.status == GroupMemberStatus.BLOCKED) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are blocked from this group.")
            }
            if (existingMembership.status != GroupMemberStatus.ACTIVE) {
                existingMembership.status = GroupMemberStatus.ACTIVE
                existingMembership.joinedAt = Instant.now()
                groupMemberRepository.save(existingMembership)
            }
        } else {
            groupMemberRepository.save(
                GroupMember(
                    group = group,
                    user = user,
                    role = GroupRole.MEMBER,
                    status = GroupMemberStatus.ACTIVE,
                ),
            )
        }

        inviteLink.status = InviteLinkStatus.ACCEPTED
        inviteLink.acceptedBy = user
        inviteLink.acceptedAt = Instant.now()
        groupInviteLinkRepository.save(inviteLink)

        notifyManagers(group, authenticatedUser.userId, NotificationType.INVITE_ACCEPTED,
            "초대 수락", "${user.nickname}님이 ${group.name} 초대를 수락했습니다.", group.id!!)

        return getGroupDetail(authenticatedUser, group.id!!)
    }

    @Transactional
    fun declineInvite(authenticatedUser: AuthenticatedUser, token: String, reason: String?) {
        val inviteLink = findPendingInviteLink(token)
        val user = getUser(authenticatedUser.userId)

        inviteLink.status = InviteLinkStatus.DECLINED
        inviteLink.acceptedBy = user
        inviteLink.acceptedAt = Instant.now()
        inviteLink.declineReason = reason?.trim()?.ifBlank { null }
        groupInviteLinkRepository.save(inviteLink)

        val group = inviteLink.group
        notifyManagers(group, authenticatedUser.userId, NotificationType.INVITE_DECLINED,
            "초대 거절", "${user.nickname}님이 ${group.name} 초대를 거절했습니다.", group.id!!)
    }

    private fun findPendingInviteLink(token: String): GroupInviteLink {
        val inviteLink = groupInviteLinkRepository.findByToken(token)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite link.")
        if (inviteLink.status == InviteLinkStatus.ACCEPTED) {
            throw ResponseStatusException(HttpStatus.GONE, "This invite link has already been used.")
        }
        if (inviteLink.status == InviteLinkStatus.DECLINED) {
            throw ResponseStatusException(HttpStatus.GONE, "This invite link has been declined.")
        }
        if (inviteLink.status == InviteLinkStatus.EXPIRED || inviteLink.expiresAt.isBefore(Instant.now())) {
            inviteLink.status = InviteLinkStatus.EXPIRED
            groupInviteLinkRepository.save(inviteLink)
            throw ResponseStatusException(HttpStatus.GONE, "This invite link has expired.")
        }
        return inviteLink
    }

    @Transactional(readOnly = true)
    fun getInviteHistory(authenticatedUser: AuthenticatedUser, groupId: Long): List<InviteHistoryResponse> {
        requireOwnerOrManager(groupId, authenticatedUser.userId)

        val now = Instant.now()
        return groupInviteLinkRepository.findAllByGroupIdOrderByCreatedAtDesc(groupId).map { link ->
            val effectiveStatus = if (link.status == InviteLinkStatus.PENDING && link.expiresAt.isBefore(now)) {
                InviteLinkStatus.EXPIRED
            } else {
                link.status
            }
            InviteHistoryResponse(
                id = link.id!!,
                status = effectiveStatus,
                inviterNickname = link.inviter.nickname,
                inviterUserId = link.inviter.id!!,
                acceptedByNickname = link.acceptedBy?.nickname,
                acceptedByUserId = link.acceptedBy?.id,
                createdAt = link.createdAt.toString(),
                acceptedAt = link.acceptedAt?.toString(),
                expiresAt = link.expiresAt.toString(),
                declineReason = link.declineReason,
            )
        }
    }

    @Transactional
    fun closeGroup(authenticatedUser: AuthenticatedUser, groupId: Long): GroupDetailResponse {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, authenticatedUser.userId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can close the group.")
        if (membership.role != GroupRole.OWNER || membership.status != GroupMemberStatus.ACTIVE) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can close the group.")
        }
        val group = getGroup(groupId)
        group.closed = true
        matchGroupRepository.save(group)

        val memberIds = groupMemberRepository.findAllByGroupId(groupId)
            .filter { it.status == GroupMemberStatus.ACTIVE }
            .mapNotNull { it.user.id }
        notificationService.sendToGroupMembers(
            memberIds,
            authenticatedUser.userId,
            NotificationType.GROUP_CLOSED,
            "이벤트 종료",
            "${group.name} 이벤트가 종료되었습니다.",
            "GROUP",
            groupId,
        )
        return getGroupDetail(authenticatedUser, groupId)
    }

    @Transactional
    fun leaveGroup(authenticatedUser: AuthenticatedUser, groupId: Long) {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, authenticatedUser.userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "You are not a member of this group.")
        if (membership.role == GroupRole.OWNER) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이벤트장은 탈퇴할 수 없습니다. 이벤트장을 위임한 후 탈퇴해 주세요.")
        }
        membership.status = GroupMemberStatus.LEFT
        groupMemberRepository.save(membership)
    }

    @Transactional
    fun kickMember(authenticatedUser: AuthenticatedUser, groupId: Long, targetUserId: Long): GroupDetailResponse {
        val ownerMembership = groupMemberRepository.findByGroupIdAndUserId(groupId, authenticatedUser.userId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can kick members.")
        if (ownerMembership.role != GroupRole.OWNER || ownerMembership.status != GroupMemberStatus.ACTIVE) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can kick members.")
        }
        if (authenticatedUser.userId == targetUserId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot kick yourself.")
        }

        val targetMembership = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found.")
        targetMembership.status = GroupMemberStatus.BLOCKED
        groupMemberRepository.save(targetMembership)

        val group = getGroup(groupId)
        notificationService.send(targetUserId, NotificationType.MEMBER_KICKED,
            "이벤트 강퇴", "${group.name} 이벤트에서 강퇴되었습니다.", "GROUP", groupId)

        return getGroupDetail(authenticatedUser, groupId)
    }

    @Transactional
    fun changeMemberRole(authenticatedUser: AuthenticatedUser, groupId: Long, targetUserId: Long, newRole: GroupRole): GroupDetailResponse {
        val ownerMembership = groupMemberRepository.findByGroupIdAndUserId(groupId, authenticatedUser.userId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can change roles.")
        if (ownerMembership.role != GroupRole.OWNER || ownerMembership.status != GroupMemberStatus.ACTIVE) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can change roles.")
        }
        if (authenticatedUser.userId == targetUserId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot change your own role.")
        }
        if (newRole == GroupRole.OWNER) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot assign OWNER role.")
        }

        val target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found.")
        target.role = newRole
        groupMemberRepository.save(target)

        notificationService.send(
            targetUserId,
            NotificationType.MEMBER_ROLE_CHANGED,
            "권한 변경",
            "${target.group.name} 이벤트 권한이 ${roleLabel(newRole)}로 변경되었습니다.",
            "GROUP",
            groupId,
        )

        return getGroupDetail(authenticatedUser, groupId)
    }

    private fun roleLabel(role: GroupRole): String = when (role) {
        GroupRole.OWNER -> "이벤트장"
        GroupRole.MANAGER -> "관리자"
        GroupRole.MEMBER -> "멤버"
    }

    private fun requireOwnerOrManager(groupId: Long, userId: Long) {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only members can perform this action.")
        val allowed = membership.status == GroupMemberStatus.ACTIVE &&
            (membership.role == GroupRole.OWNER || membership.role == GroupRole.MANAGER)
        if (!allowed) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only owner or manager can perform this action.")
        }
    }

    private fun notifyManagers(group: MatchGroup, excludeUserId: Long, type: NotificationType, title: String, body: String, groupId: Long) {
        val managerIds = groupMemberRepository.findAllByGroupId(groupId)
            .filter { it.status == GroupMemberStatus.ACTIVE && (it.role == GroupRole.OWNER || it.role == GroupRole.MANAGER) }
            .mapNotNull { it.user.id }
        notificationService.sendToGroupMembers(managerIds, excludeUserId, type, title, body, "GROUP", groupId)
    }

    private fun toSummary(group: MatchGroup, myRole: GroupRole?, myStatus: GroupMemberStatus?): GroupSummaryResponse {
        val ownerSkill = playerSkillRepository.findByUserId(group.owner.id!!)
        return GroupSummaryResponse(
            id = group.id!!,
            name = group.name,
            description = group.description,
            visibility = group.visibility,
            memberCount = groupMemberRepository.countByGroupIdAndStatus(group.id!!, GroupMemberStatus.ACTIVE),
            maxMembers = group.maxMembers,
            ownerNickname = group.owner.nickname,
            ownerGender = group.owner.gender,
            ownerGrade = ownerSkill?.nationalGrade,
            minGrade = group.minGrade,
            maxGrade = group.maxGrade,
            startAt = group.startAt?.toString(),
            endAt = group.endAt?.toString(),
            myRole = myRole,
            myStatus = myStatus,
        )
    }

    private fun getGroup(groupId: Long): MatchGroup =
        matchGroupRepository.findById(groupId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found.")
        }

    private fun getUser(userId: Long): User =
        userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.")
        }
}
