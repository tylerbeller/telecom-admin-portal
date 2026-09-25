package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.model.SupportTicket;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import com.example.telecom.repository.SupportTicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardControllerTest {

    private final CustomerRepository customerRepository = mock(CustomerRepository.class);
    private final DeviceRepository deviceRepository = mock(DeviceRepository.class);
    private final SupportTicketRepository ticketRepository = mock(SupportTicketRepository.class);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new DashboardController(customerRepository, deviceRepository, ticketRepository))
                .build();

        when(customerRepository.countByStatus(Customer.Status.ACTIVE)).thenReturn(3L);
        when(customerRepository.sumMonthlyRevenueByStatusActive()).thenReturn(new BigDecimal("80.00"));
        // Only Basic and Standard have ACTIVE subscribers; Premium is absent so the
        // revenue-by-plan payload must not include it.
        when(customerRepository.sumRevenueByPlan()).thenReturn(List.of(new Object[] {"Basic", new BigDecimal("40.00")},
                new Object[] {"Standard", new BigDecimal("40.00")}));
        when(ticketRepository.countByStatusIn(any())).thenReturn(5L);
        when(deviceRepository.countByStatus(Device.Status.ASSIGNED)).thenReturn(7L);
    }

    @Test
    void statsReturnsActiveCustomerCountAndMonthlyRevenue() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.active_customers").value(3))
                .andExpect(jsonPath("$.monthly_revenue").value(80.00)).andExpect(jsonPath("$.open_tickets").value(5))
                .andExpect(jsonPath("$.devices_in_use").value(7));
    }

    @Test
    void statsTakesRevenueFromTheSqlAggregate() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly_revenue").value(80.00));

        verify(customerRepository).sumMonthlyRevenueByStatusActive();
    }

    @Test
    void statsSerializesRevenueAsTwoDecimalMoney() throws Exception {
        when(customerRepository.sumMonthlyRevenueByStatusActive()).thenReturn(new BigDecimal("80.0"));

        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly_revenue").value(80.00));
    }

    @Test
    void statsReturnsZeroRevenueOnAnEmptyDatabase() throws Exception {
        when(customerRepository.sumMonthlyRevenueByStatusActive()).thenReturn(BigDecimal.ZERO.setScale(2));

        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly_revenue").value(0.00));
    }

    @Test
    void revenueByPlanOnlyIncludesPlansWithActiveCustomers() throws Exception {
        mockMvc.perform(get("/api/dashboard/revenue-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("Basic"))
                .andExpect(jsonPath("$[1].name").value("Standard"));
    }

    @Test
    void revenueByPlanReturnsSummedMoneyPerPlan() throws Exception {
        // The repository already multiplied monthlyPrice by the ACTIVE subscriber
        // count in SQL; the controller must surface those values unchanged.
        mockMvc.perform(get("/api/dashboard/revenue-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].revenue").value(40.00)).andExpect(jsonPath("$[1].revenue").value(40.00));
    }

    @Test
    void revenueByPlanIsEmptyWhenNoPlanHasRevenue() throws Exception {
        when(customerRepository.sumRevenueByPlan()).thenReturn(List.of());

        mockMvc.perform(get("/api/dashboard/revenue-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void customersByPlanReturnsOneEntryPerPlan() throws Exception {
        when(customerRepository.countByPlanName())
                .thenReturn(List.of(new Object[] {"Basic", 2L}, new Object[] {"Standard", 1L}));

        mockMvc.perform(get("/api/dashboard/customers-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("Basic"))
                .andExpect(jsonPath("$[0].value").value(2));
    }

    @Test
    void devicesByStatusReturnsStatusNames() throws Exception {
        when(deviceRepository.countByStatus()).thenReturn(
                List.of(new Object[] {Device.Status.ASSIGNED, 7L}, new Object[] {Device.Status.AVAILABLE, 3L}));

        mockMvc.perform(get("/api/dashboard/devices-by-status")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("ASSIGNED"))
                .andExpect(jsonPath("$[1].value").value(3));
    }

    @Test
    void ticketsByStatusReturnsStatusNames() throws Exception {
        when(ticketRepository.countByStatus()).thenReturn(
                List.of(new Object[] {SupportTicket.Status.OPEN, 4L}, new Object[] {SupportTicket.Status.CLOSED, 9L}));

        mockMvc.perform(get("/api/dashboard/tickets-by-status")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("OPEN"))
                .andExpect(jsonPath("$[1].value").value(9));
    }
}
