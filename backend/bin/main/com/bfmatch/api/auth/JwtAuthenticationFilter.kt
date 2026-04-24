package com.bfmatch.api.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import com.bfmatch.api.user.UserRepository
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider,
    private val userRepository: UserRepository,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION)
        val token = authorizationHeader
            ?.takeIf { it.startsWith("Bearer ") }
            ?.removePrefix("Bearer ")
            ?.trim()

        if (!token.isNullOrBlank() && jwtTokenProvider.validateToken(token)) {
            val authenticatedUser = jwtTokenProvider.parseAuthenticatedUser(token)
            val user = userRepository.findById(authenticatedUser.userId).orElse(null)
            val isValidSession =
                user != null &&
                    user.currentSessionId != null &&
                    user.currentSessionId == authenticatedUser.sessionId
            if (isValidSession) {
                val authentication = UsernamePasswordAuthenticationToken(
                    authenticatedUser,
                    null,
                    emptyList(),
                )
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                SecurityContextHolder.getContext().authentication = authentication
            } else {
                SecurityContextHolder.clearContext()
            }
        }

        filterChain.doFilter(request, response)
    }
}
