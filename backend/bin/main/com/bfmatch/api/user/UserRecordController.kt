package com.bfmatch.api.user

import com.bfmatch.api.auth.AuthenticatedUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/users")
class UserRecordController(
    private val myRecordService: MyRecordService,
) {
    @GetMapping("/{userId}/record")
    fun userRecord(
        @PathVariable userId: Long,
    ): MyRecordResponse = myRecordService.getMyRecord(userId)

    @GetMapping("/{userId}/record/with-me")
    fun withMeRecord(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable userId: Long,
    ): WithMeRecordResponse = myRecordService.getWithMeRecord(principal.userId, userId)
}
