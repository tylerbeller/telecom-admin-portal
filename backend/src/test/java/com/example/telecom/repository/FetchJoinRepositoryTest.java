package com.example.telecom.repository;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.model.Plan;
import com.example.telecom.model.SupportTicket;
import com.example.telecom.model.UsageRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the real list queries (with their nested entity-graph fetches) against
 * the in-memory SQLite database backing the test context, using the same Flyway
 * schema as production. It pins behaviors the mocked controller tests cannot
 * prove: a device with no assigned customer survives the fetch joins, and the
 * fetched customer/plan associations are initialized inside the query
 * (open-in-view is off in production, so nothing may be touched lazily
 * afterwards).
 *
 * <p>
 * Note: the production schema declares {@code customers.plan_id NOT NULL}, so a
 * customer without a plan cannot be persisted here; that path is pinned by
 * {@code CustomerControllerTest.getCustomersToleratesAMissingPlan} at the
 * serialization layer.
 */
@SpringBootTest
class FetchJoinRepositoryTest {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private SupportTicketRepository ticketRepository;

    @Autowired
    private UsageRecordRepository usageRecordRepository;

    @Test
    void customerListQueryFetchesPlanInsideTheQuery() {
        Customer withPlan = customer("withplan" + System.nanoTime(), "gifted@example.com", plan("FetchJoin Plan A"));
        customerRepository.save(withPlan);

        Page<Customer> page = customerRepository.findFiltered(null, null, PageRequest.of(0, 20));

        Customer fetchedWithPlan = page.getContent().stream().filter(c -> c.getId().equals(withPlan.getId()))
                .findFirst().orElseThrow();

        // The entity graph must fetch plan inside the query, not lazily afterwards.
        assertThat(fetchedWithPlan.getPlan()).isNotNull();
        assertThat(fetchedWithPlan.getPlan().getName()).isEqualTo("FetchJoin Plan A");
    }

    @Test
    void deviceWithoutACustomerSurvivesTheFilteredListQuery() {
        Customer customer = customerRepository
                .save(customer("deviceowner", "owner" + System.nanoTime() + "@example.com", plan("FetchJoin Plan B")));
        Device assigned = device("35" + suffix(13), "8901" + suffix(18));
        assigned.setCustomer(customer);
        assigned.setStatus(Device.Status.ASSIGNED);
        Device available = device("35" + suffix(13), "8901" + suffix(18));
        deviceRepository.save(assigned);
        deviceRepository.save(available);

        Page<Device> page = deviceRepository.findFiltered(null, null, PageRequest.of(0, 20));

        Device fetchedAssigned = page.getContent().stream().filter(d -> d.getId().equals(assigned.getId())).findFirst()
                .orElseThrow();
        Device fetchedAvailable = page.getContent().stream().filter(d -> d.getId().equals(available.getId()))
                .findFirst().orElseThrow();

        // The nested entity graph (customer, customer.plan) must be initialized inside
        // the query.
        assertThat(fetchedAssigned.getCustomer()).isNotNull();
        assertThat(fetchedAssigned.getCustomer().getPlan()).isNotNull();
        // An AVAILABLE device with no customer must still be returned.
        assertThat(fetchedAvailable.getCustomer()).isNull();
    }

    @Test
    void ticketAndUsageFilteredQueriesInitializeCustomerAndPlanInsideTheQuery() {
        Customer customer = customerRepository
                .save(customer("ticketowner", "ticket" + System.nanoTime() + "@example.com", plan("FetchJoin Plan C")));

        SupportTicket ticket = ticketRepository
                .save(new SupportTicket(customer, "Subject", "Description", SupportTicket.Priority.LOW));
        UsageRecord usage = usageRecordRepository.save(new UsageRecord(customer, UsageRecord.Type.DATA,
                new BigDecimal("10.00"), new BigDecimal("1.00"), Instant.now()));

        Page<SupportTicket> tickets = ticketRepository.findFiltered("LOW", "", -1, "", "", "", PageRequest.of(0, 20));
        Page<UsageRecord> records = usageRecordRepository.findFiltered(UsageRecord.Type.DATA, null, null, null,
                PageRequest.of(0, 20));

        SupportTicket fetchedTicket = tickets.getContent().stream().filter(t -> t.getId().equals(ticket.getId()))
                .findFirst().orElseThrow();
        UsageRecord fetchedUsage = records.getContent().stream().filter(u -> u.getId().equals(usage.getId()))
                .findFirst().orElseThrow();

        // Customer and plan must be initialized inside the query, or lazy access
        // outside the persistence context would fail with open-in-view disabled.
        assertThat(fetchedTicket.getCustomer().getPlan()).isNotNull();
        assertThat(fetchedUsage.getCustomer().getPlan()).isNotNull();
    }

    @Test
    void unfilteredUsageQuerySupportsTheDefaultPageSize() {
        Customer customer = customerRepository
                .save(customer("usageowner", "usage" + System.nanoTime() + "@example.com", plan("FetchJoin Plan D")));

        for (int i = 0; i < 50; i++) {
            usageRecordRepository.save(new UsageRecord(customer, UsageRecord.Type.DATA, new BigDecimal("10.00"),
                    new BigDecimal("1.00"), Instant.now().minusSeconds(i)));
        }

        Page<UsageRecord> page = usageRecordRepository.findAllByOrderByRecordedAtDesc(PageRequest.of(0, 50));

        assertThat(page.getSize()).isEqualTo(50);
        assertThat(page.getNumberOfElements()).isEqualTo(50);
        assertThat(page.getContent()).anyMatch(record -> record.getCustomer().getId().equals(customer.getId()));
    }

    @Test
    void customerQuerySupportsNamePlanStatusAndBalanceSorts() {
        Customer alpha = customerRepository
                .save(customer("sort-alpha", "sort-alpha" + System.nanoTime() + "@example.com", plan("Sort Basic")));
        alpha.setBalance(new BigDecimal("30.00"));
        alpha.setStatus(Customer.Status.SUSPENDED);
        customerRepository.save(alpha);

        Customer beta = customerRepository
                .save(customer("sort-beta", "sort-beta" + System.nanoTime() + "@example.com", plan("Sort Premium")));
        beta.setBalance(new BigDecimal("10.00"));
        customerRepository.save(beta);

        Page<Customer> nameDescending = customerRepository.findFiltered("sort-", null,
                PageRequest.of(0, 2, Sort.by(Sort.Order.desc("firstName"))));
        Page<Customer> planAscending = customerRepository.findFiltered("sort-", null,
                PageRequest.of(0, 2, Sort.by(Sort.Order.asc("plan.name"))));
        Page<Customer> statusDescending = customerRepository.findFiltered("sort-", null,
                PageRequest.of(0, 2, Sort.by(Sort.Order.desc("status"))));
        Page<Customer> balanceAscending = customerRepository.findFiltered("sort-", null,
                PageRequest.of(0, 2, Sort.by(Sort.Order.asc("balance"))));

        assertThat(nameDescending.getContent()).extracting(Customer::getFirstName).containsExactly("sort-beta",
                "sort-alpha");
        assertThat(planAscending.getContent()).extracting(customer -> customer.getPlan().getName())
                .containsExactly("Sort Basic", "Sort Premium");
        assertThat(statusDescending.getContent()).extracting(Customer::getStatus)
                .containsExactly(Customer.Status.SUSPENDED, Customer.Status.ACTIVE);
        assertThat(balanceAscending.getContent()).extracting(Customer::getBalance).containsExactly(BigDecimal.TEN,
                BigDecimal.valueOf(30));
    }

    @Test
    void ticketQueryFiltersByCustomerNameAndInclusiveDateRange() {
        Customer customer = customerRepository.save(customer("date-range-customer",
                "date-range" + System.nanoTime() + "@example.com", plan("Ticket Plan")));

        SupportTicket before = new SupportTicket(customer, "Before", "Description", SupportTicket.Priority.LOW);
        before.setCreatedAt(Instant.parse("2026-01-31T23:59:59Z"));
        ticketRepository.save(before);

        SupportTicket inRange = new SupportTicket(customer, "In range", "Description", SupportTicket.Priority.HIGH);
        inRange.setCreatedAt(Instant.parse("2026-02-15T12:00:00Z"));
        ticketRepository.save(inRange);

        SupportTicket after = new SupportTicket(customer, "After", "Description", SupportTicket.Priority.MEDIUM);
        after.setCreatedAt(Instant.parse("2026-03-01T00:00:00Z"));
        ticketRepository.save(after);

        Page<SupportTicket> result = ticketRepository.findFiltered("", "", -1, "date-range", "2026-02-01", "2026-02-28",
                PageRequest.of(0, 20));

        assertThat(result.getContent()).extracting(SupportTicket::getSubject).containsExactly("In range");
    }

    private Plan plan(String name) {
        return planRepository.save(new Plan(name, new BigDecimal("29.99"), 5, 500, 500));
    }

    private Customer customer(String firstName, String email, Plan plan) {
        Customer customer = new Customer(firstName, "FetchJoin", email, "555-0100", plan);
        customer.setStatus(Customer.Status.ACTIVE);
        return customer;
    }

    private Device device(String imei, String simNumber) {
        return new Device(imei, "Test Phone", simNumber);
    }

    private static long suffixCounter;

    private static String suffix(int length) {
        long base = 1_000_000_000_000L + (suffixCounter++ * 1_000_003L) + System.nanoTime() % 97L;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append((char) ('0' + (base / (long) Math.pow(10, i)) % 10));
        }
        return sb.toString();
    }
}
