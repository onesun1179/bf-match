package com.bfmatch.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class BfMatchApplication

fun main(args: Array<String>) {
    runApplication<BfMatchApplication>(*args)
}
