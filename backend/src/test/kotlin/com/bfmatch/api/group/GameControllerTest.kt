package com.bfmatch.api.group

import com.bfmatch.api.auth.AuthenticatedUser
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.core.MethodParameter
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer
import org.springframework.web.server.ResponseStatusException
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders

class GameControllerTest {
    private lateinit var mockMvc: MockMvc
    private val gameService: GameService = mock()

    @BeforeEach
    fun setUp() {
        val controller = GameController(gameService)
        val principalResolver = object : HandlerMethodArgumentResolver {
            override fun supportsParameter(parameter: MethodParameter): Boolean =
                parameter.parameterType == AuthenticatedUser::class.java

            override fun resolveArgument(
                parameter: MethodParameter,
                mavContainer: ModelAndViewContainer?,
                webRequest: NativeWebRequest,
                binderFactory: WebDataBinderFactory?,
            ): Any = AuthenticatedUser(
                userId = 1L,
                provider = "LOCAL",
                providerUserId = "local-1",
                email = null,
                nickname = "user-1",
            )
        }

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setCustomArgumentResolvers(principalResolver)
            .setMessageConverters(MappingJackson2HttpMessageConverter())
            .build()
    }

    @Test
    fun `returns 400 when service rejects invalid winnerTeam`() {
        whenever(gameService.submitScore(any(), any(), any(), any())).thenThrow(
            ResponseStatusException(HttpStatus.BAD_REQUEST, "winnerTeam은 A 또는 B여야 합니다."),
        )

        mockMvc.perform(
            post("/api/v1/groups/10/games/100/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"winnerTeam":"Z"}"""),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `returns 403 when non participant submits result`() {
        whenever(gameService.submitScore(any(), any(), any(), any())).thenThrow(
            ResponseStatusException(HttpStatus.FORBIDDEN, "게임 참여자만 결과를 입력할 수 있습니다."),
        )

        mockMvc.perform(
            post("/api/v1/groups/10/games/100/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"winnerTeam":"A"}"""),
        ).andExpect(status().isForbidden)
    }
}
