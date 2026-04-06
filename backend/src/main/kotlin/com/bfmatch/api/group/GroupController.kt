package com.bfmatch.api.group

import com.bfmatch.api.auth.AuthenticatedUser
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups")
class GroupController(
    private val groupService: GroupService,
) {
    @PostMapping
    fun createGroup(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody @Valid request: CreateGroupRequest,
    ): GroupDetailResponse = groupService.createGroup(principal, request)

    @PatchMapping("/{groupId}")
    fun updateGroup(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @RequestBody @Valid request: CreateGroupRequest,
    ): GroupDetailResponse = groupService.updateGroup(principal, groupId, request)

    @GetMapping
    fun myGroups(@AuthenticationPrincipal principal: AuthenticatedUser): List<GroupSummaryResponse> =
        groupService.getMyGroups(principal)

    @GetMapping("/public")
    fun publicGroups(@AuthenticationPrincipal principal: AuthenticatedUser): List<GroupSummaryResponse> =
        groupService.getPublicGroups(principal)

    @PostMapping("/{groupId}/join")
    fun joinPublicGroup(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
    ): GroupDetailResponse = groupService.joinPublicGroup(principal, groupId)

    @PostMapping("/{groupId}/leave")
    fun leaveGroup(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
    ) = groupService.leaveGroup(principal, groupId)

    @PostMapping("/{groupId}/close")
    fun closeGroup(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
    ): GroupDetailResponse = groupService.closeGroup(principal, groupId)

    @GetMapping("/{groupId}")
    fun groupDetail(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
    ): GroupDetailResponse = groupService.getGroupDetail(principal, groupId)

    @PostMapping("/{groupId}/kick/{targetUserId}")
    fun kickMember(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable targetUserId: Long,
    ): GroupDetailResponse = groupService.kickMember(principal, groupId, targetUserId)

    @PostMapping("/{groupId}/members/{targetUserId}/role")
    fun changeMemberRole(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable targetUserId: Long,
        @RequestBody request: Map<String, String>,
    ): GroupDetailResponse = groupService.changeMemberRole(
        principal, groupId, targetUserId,
        GroupRole.valueOf(request["role"] ?: throw IllegalArgumentException("role is required")),
    )

    @PostMapping("/{groupId}/invite-link")
    fun createInviteLink(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
    ): InviteLinkResponse = groupService.createInviteLink(principal, groupId)

    @GetMapping("/{groupId}/invite-history")
    fun inviteHistory(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
    ): List<InviteHistoryResponse> = groupService.getInviteHistory(principal, groupId)

    @GetMapping("/join/{token}")
    fun inviteLinkInfo(
        @PathVariable token: String,
    ): InviteLinkInfoResponse = groupService.getInviteLinkInfo(token)

    @PostMapping("/join/{token}/accept")
    fun acceptInvite(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable token: String,
    ): GroupDetailResponse = groupService.acceptInvite(principal, token)

    @PostMapping("/join/{token}/decline")
    fun declineInvite(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable token: String,
        @RequestBody @Valid request: DeclineInviteRequest,
    ) = groupService.declineInvite(principal, token, request.reason)
}
