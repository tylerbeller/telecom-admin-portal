package com.example.telecom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Guards the checked-in API contract. When an endpoint changes, regenerate
 * docs/api/openapi.json from a running backend and commit it in the same PR
 * (see .factory/skills/api-schema).
 */
@SpringBootTest
class ApiSchemaDriftTest {

    private static final Path CHECKED_IN_SCHEMA = Path.of("..", "docs", "api", "openapi.json");

    @Autowired
    private WebApplicationContext context;

    @Test
    void servedSchemaMatchesCheckedInSchema() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        ObjectMapper mapper = new ObjectMapper();
        String json = mockMvc.perform(get("/v3/api-docs")).andReturn().getResponse().getContentAsString();
        JsonNode served = mapper.readTree(json);

        assertThat(CHECKED_IN_SCHEMA).as("docs/api/openapi.json must exist; regenerate it with the backend running")
                .exists();
        // Tolerate a BOM: some HTTP clients (Windows PowerShell) add one when
        // capturing the schema.
        String checkedInJson = Files.readString(CHECKED_IN_SCHEMA).replaceFirst("^\\uFEFF", "");
        JsonNode checkedIn = mapper.readTree(checkedInJson);

        // The servers block reflects the request origin (MockMvc vs a real
        // port), not the contract, so both sides drop it before comparing.
        ((ObjectNode) served).remove("servers");
        ((ObjectNode) checkedIn).remove("servers");

        assertThat(served).as("served OpenAPI schema drifted from docs/api/openapi.json; regenerate and commit it")
                .isEqualTo(checkedIn);
    }
}
