package com.example.telecom.controller;

import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.SupportTicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupportTicketControllerTest {

    private final SupportTicketRepository repository = mock(SupportTicketRepository.class);
    private final CustomerRepository customerRepository = mock(CustomerRepository.class);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new SupportTicketController(repository, customerRepository))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @Test
    void getTicketsForwardsNameAndDateFilters() throws Exception {
        whenEmptyResult();

        mockMvc.perform(get("/api/tickets").param("search", "Ada").param("dateFrom", "2026-02-01").param("dateTo",
                "2026-02-28")).andExpect(status().isOk());

        verify(repository).findFiltered(eq(""), eq(""), eq(-1L), eq("Ada"), eq("2026-02-01"), eq("2026-02-28"),
                any(Pageable.class));
    }

    @Test
    void getTicketsRejectsAnInvalidDate() throws Exception {
        mockMvc.perform(get("/api/tickets").param("dateFrom", "not-a-date")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid value"));
    }

    @Test
    void getTicketsRejectsAReversedDateRange() throws Exception {
        mockMvc.perform(get("/api/tickets").param("dateFrom", "2026-03-01").param("dateTo", "2026-02-01"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Invalid value"));
    }

    private void whenEmptyResult() {
        org.mockito.Mockito
                .when(repository.findFiltered(any(), any(), anyLong(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
    }
}
