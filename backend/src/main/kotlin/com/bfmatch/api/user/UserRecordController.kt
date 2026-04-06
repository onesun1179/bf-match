package com.bfmatch.api.user

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
}
