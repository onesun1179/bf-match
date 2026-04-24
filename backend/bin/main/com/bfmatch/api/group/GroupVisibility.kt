package com.bfmatch.api.group

enum class GroupVisibility {
    PUBLIC,
    @Deprecated("Use INVITE_ONLY instead")
    PRIVATE,
    INVITE_ONLY,
}
