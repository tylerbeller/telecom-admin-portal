package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.model.SupportTicket;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import com.example.telecom.repository.SupportTicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final Logger LOG = LoggerFactory.getLogger(DashboardController.class);

    private final CustomerRepository customerRepository;
    private final DeviceRepository deviceRepository;
    private final SupportTicketRepository ticketRepository;

    public DashboardController(CustomerRepository customerRepository, DeviceRepository deviceRepository,
            SupportTicketRepository ticketRepository) {
        this.customerRepository = customerRepository;
        this.deviceRepository = deviceRepository;
        this.ticketRepository = ticketRepository;
    }

    @GetMapping("/stats")
    public DashboardStats getStats() {
        LOG.info("Fetching dashboard stats");
        long activeCustomers = customerRepository.countByStatus(Customer.Status.ACTIVE);

        BigDecimal monthlyRevenue = toMoney(customerRepository.sumMonthlyRevenueByStatusActive());
        long openTickets = ticketRepository
                .countByStatusIn(List.of(SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS));

        long devicesInUse = deviceRepository.countByStatus(Device.Status.ASSIGNED);

        LOG.debug("Dashboard stats: activeCustomers={}, monthlyRevenue={}, openTickets={}, devicesInUse={}",
                activeCustomers, monthlyRevenue, openTickets, devicesInUse);
        return new DashboardStats(activeCustomers, monthlyRevenue, openTickets, devicesInUse);
    }

    @GetMapping("/customers-by-plan")
    public List<ChartData> getCustomersByPlan() {
        LOG.info("Fetching customers by plan chart data");
        List<ChartData> data = customerRepository.countByPlanName().stream()
                .map(row -> new ChartData((String) row[0], ((Number) row[1]).longValue())).toList();
        LOG.debug("Found {} plan categories", data.size());
        return data;
    }

    @GetMapping("/devices-by-status")
    public List<ChartData> getDevicesByStatus() {
        LOG.info("Fetching devices by status chart data");
        List<ChartData> data = deviceRepository.countByStatus().stream()
                .map(row -> new ChartData(((Device.Status) row[0]).name(), ((Number) row[1]).longValue())).toList();
        LOG.debug("Found {} device status categories", data.size());
        return data;
    }

    @GetMapping("/tickets-by-status")
    public List<ChartData> getTicketsByStatus() {
        LOG.info("Fetching tickets by status chart data");
        List<ChartData> data = ticketRepository.countByStatus().stream()
                .map(row -> new ChartData(((SupportTicket.Status) row[0]).name(), ((Number) row[1]).longValue()))
                .toList();
        LOG.debug("Found {} ticket status categories", data.size());
        return data;
    }

    @GetMapping("/revenue-by-plan")
    public List<RevenueData> getRevenueByPlan() {
        LOG.info("Fetching revenue by plan chart data");
        List<RevenueData> data = customerRepository.sumRevenueByPlan().stream()
                .map(row -> new RevenueData((String) row[0], toMoney(row[1]))).toList();
        LOG.debug("Found {} plans with revenue data", data.size());
        return data;
    }

    /**
     * Normalizes SQLite aggregate results (which may surface as Double or other
     * numeric types) back to 2-decimal money, matching the exact BigDecimal
     * arithmetic the in-memory implementation used to produce.
     */
    private static BigDecimal toMoney(Object value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2);
        }
        return new BigDecimal(value.toString()).setScale(2, RoundingMode.HALF_UP);
    }

    public record DashboardStats(long active_customers, BigDecimal monthly_revenue, long open_tickets,
            long devices_in_use) {
    }

    public record ChartData(String name, long value) {
    }

    public record RevenueData(String name, BigDecimal revenue) {
    }
}
