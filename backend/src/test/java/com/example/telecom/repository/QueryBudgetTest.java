package com.example.telecom.repository;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

/**
 * N+1 tripwire. FetchJoinRepositoryTest proves the associations are fetched
 * inside the query; this test proves they stay that way, by counting the
 * statements a page load issues. A lazy per-row load breaks the budget and
 * fails the suite instead of paging the on-call.
 *
 * <p>
 * Budgets are the measured counts on the in-memory SQLite test database; if a
 * legitimate change raises one, raise the constant in the same commit with a
 * note. Never raise it to absorb an N+1.
 */
@SpringBootTest
class QueryBudgetTest {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SupportTicketRepository ticketRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Statistics freshStatistics() {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        return statistics;
    }

    @Test
    void customerPageStaysWithinStatementBudget() {
        Statistics statistics = freshStatistics();

        customerRepository.findFiltered(null, null, PageRequest.of(0, 20));

        // count query + page query
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(2);
    }

    @Test
    void devicePageWithNestedFetchStaysWithinStatementBudget() {
        Statistics statistics = freshStatistics();

        deviceRepository.findFiltered(null, null, PageRequest.of(0, 20));

        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(2);
    }

    @Test
    void ticketPageWithCustomerFetchStaysWithinStatementBudget() {
        Statistics statistics = freshStatistics();

        ticketRepository.findFiltered("", "", -1, "", "", "", PageRequest.of(0, 20));

        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(3);
    }
}
