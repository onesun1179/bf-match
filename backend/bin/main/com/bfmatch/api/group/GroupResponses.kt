package com.bfmatch.api.group

import com.bfmatch.api.user.Gender
import com.bfmatch.api.user.NationalGrade

data class GroupSummaryResponse(
    val id: Long,
    val name: String,
    val description: String?,
    val visibility: GroupVisibility,
    val memberCount: Long,
    val maxMembers: Int?,
    val ownerNickname: String,
    val ownerGender: Gender?,
    val ownerGrade: NationalGrade?,
    val minGrade: NationalGrade?,
    val maxGrade: NationalGrade?,
    val startAt: String?,
    val endAt: String?,
    val myRole: GroupRole?,
    val myStatus: GroupMemberStatus?,
)

data class GroupMemberResponse(
    val userId: Long,
    val nickname: String,
    val gender: Gender?,
    val nationalGrade: NationalGrade?,
    val role: GroupRole,
    val status: GroupMemberStatus,
)

data class GroupDetailResponse(
    val id: Long,
    val name: String,
    val description: String?,
    val visibility: GroupVisibility,
    val ownerUserId: Long,
    val memberCount: Long,
    val myRole: GroupRole?,
    val myStatus: GroupMemberStatus?,
    val members: List<GroupMemberResponse>,
    val location: String?,
    val startAt: String?,
    val endAt: String?,
    val registrationDeadline: String?,
    val minGrade: NationalGrade?,
    val maxGrade: NationalGrade?,
    val maxMembers: Int?,
    val maxMale: Int?,
    val maxFemale: Int?,
    val closed: Boolean,
)

data class InviteLinkResponse(
    val token: String,
    val inviteUrl: String,
    val expiresAt: String,
)

data class InviteLinkInfoResponse(
    val token: String,
    val groupId: Long,
    val groupName: String,
    val groupDescription: String?,
    val inviterNickname: String,
    val invitedAt: String,
    val memberCount: Long,
    val status: InviteLinkStatus,
    val expiresAt: String,
)

data class InviteHistoryResponse(
    val id: Long,
    val status: InviteLinkStatus,
    val inviterNickname: String,
    val inviterUserId: Long,
    val acceptedByNickname: String?,
    val acceptedByUserId: Long?,
    val createdAt: String,
    val acceptedAt: String?,
    val expiresAt: String,
    val declineReason: String?,
)
