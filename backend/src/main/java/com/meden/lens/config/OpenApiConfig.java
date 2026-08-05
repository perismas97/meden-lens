package com.meden.lens.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI medenLensOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Meden Lens API")
                .version("0.1.0")
                .description("Goal-aware efficiency analysis for AI agent executions."));
    }
}
