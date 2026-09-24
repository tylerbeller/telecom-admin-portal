package com.example.telecom.controller;

import com.example.telecom.model.SupportTicket;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.SupportTicketRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class SupportTicketController {

    private static final Logger LOG = LoggerFactory.getLogger(SupportTicketController.class);

    private final SupportTicketRepository repository;
    private final CustomerRepository customerRepository;

    public SupportTicketController(SupportTicketRepository repository, CustomerRepository customerRepository) {
        this.repository = repository;
        this.customerRepository = customerRepository;
    }

    @GetMapping
    @SuppressWarnings("PMD.UseObjectForClearerAPI")
    public PagedResponse getTickets(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size, @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String search, @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        LOG.info("Fetching tickets: search={}, dateFrom={}, dateTo={}", search, dateFrom, dateTo);
        TicketFilters filters = TicketFilters.from(priority, status, customerId, search, dateFrom, dateTo);
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
        Page<SupportTicket> result = filters.hasFilters()
                ? repository.findFiltered(filters.priority(), filters.status(), filters.customerId(), filters.search(),
                        filters.dateFrom(), filters.dateTo(), pageRequest)
                : repository.findAllByOrderByCreatedAtDesc(pageRequest);

        LOG.debug("Found {} tickets (page {} of {})", result.getNumberOfElements(), result.getNumber(),
                result.getTotalPages());
        return new PagedResponse(result.getContent().stream().map(TicketResponse::from).toList(), result.getNumber(),
                result.getTotalPages(), result.getTotalElements(), result.hasNext());
    }

    private static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("'" + value + "' is not a valid date", ex);
        }
    }

    private record TicketFilters(String priority, String status, long customerId, String search, String dateFrom,
            String dateTo) {
        static TicketFilters from(String priority, String status, Long customerId, String search, String dateFrom,
                String dateTo) {
            SupportTicket.Priority priorityValue = parsePriority(priority);
            SupportTicket.Status statusValue = parseStatus(status);
            String normalizedSearch = normalizeSearch(search);
            LocalDate dateFromValue = parseDate(dateFrom);
            LocalDate dateToValue = parseDate(dateTo);
            if (dateFromValue != null && dateToValue != null && dateFromValue.isAfter(dateToValue)) {
                throw new IllegalArgumentException("dateFrom must be on or before dateTo");
            }
            return new TicketFilters(nameOrEmpty(priorityValue), nameOrEmpty(statusValue), idOrDefault(customerId),
                    stringOrEmpty(normalizedSearch), stringOrEmpty(dateFromValue), stringOrEmpty(dateToValue));
        }

        boolean hasFilters() {
            return !priority.isEmpty() || !status.isEmpty() || customerId != -1 || !search.isEmpty()
                    || !dateFrom.isEmpty() || !dateTo.isEmpty();
        }
    }

    private static SupportTicket.Priority parsePriority(String priority) {
        return priority == null || priority.isEmpty() ? null : SupportTicket.Priority.valueOf(priority);
    }

    private static SupportTicket.Status parseStatus(String status) {
        return status == null || status.isEmpty() ? null : SupportTicket.Status.valueOf(status);
    }

    private static String normalizeSearch(String search) {
        return search == null || search.isBlank() ? null : search.trim();
    }

    private static String nameOrEmpty(Enum<?> value) {
        return value == null ? "" : value.name();
    }

    private static long idOrDefault(Long customerId) {
        return customerId == null ? -1 : customerId;
    }

    private static String stringOrEmpty(Object value) {
        return value == null ? "" : value.toString();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicket(@PathVariable Long id) {
        LOG.info("Fetching ticket with id={}", id);
        return repository.findById(id).map(ticket -> {
            LOG.debug("Found ticket: id={}", ticket.getId());
            return ResponseEntity.ok(TicketResponse.from(ticket));
        }).orElseGet(() -> {
            LOG.warn("Ticket not found: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(@Valid @RequestBody TicketRequest request) {
        LOG.info("Creating ticket");
        return customerRepository.findById(request.customerId()).map(customer -> {
            SupportTicket ticket = new SupportTicket(customer, request.subject(), request.description(),
                    SupportTicket.Priority.valueOf(request.priority()));
            SupportTicket saved = repository.save(ticket);
            LOG.info("Ticket created: id={}", saved.getId());
            return ResponseEntity.ok(TicketResponse.from(saved));
        }).orElseGet(() -> {
            LOG.warn("Customer not found for ticket creation: customerId={}", request.customerId());
            return ResponseEntity.badRequest().build();
        });
    }

    @PutMapping("/{id}")
    public ResponseEntity<TicketResponse> updateTicket(@PathVariable Long id,
            @Valid @RequestBody TicketRequest request) {
        LOG.info("Updating ticket: id={}", id);
        return repository.findById(id).map(ticket -> {
            ticket.setSubject(request.subject());
            ticket.setDescription(request.description());
            if (request.priority() != null) {
                ticket.setPriority(SupportTicket.Priority.valueOf(request.priority()));
            }
            if (request.status() != null) {
                SupportTicket.Status newStatus = SupportTicket.Status.valueOf(request.status());
                ticket.setStatus(newStatus);
                if (newStatus == SupportTicket.Status.RESOLVED || newStatus == SupportTicket.Status.CLOSED) {
                    ticket.setResolvedAt(Instant.now());
                }
            }
            SupportTicket saved = repository.save(ticket);
            LOG.info("Ticket updated: id={}, status={}", saved.getId(), saved.getStatus());
            return ResponseEntity.ok(TicketResponse.from(saved));
        }).orElseGet(() -> {
            LOG.warn("Ticket not found for update: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        LOG.info("Deleting ticket: id={}", id);
        if (!repository.existsById(id)) {
            LOG.warn("Ticket not found for deletion: id={}", id);
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        LOG.info("Ticket deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    public record TicketRequest(@NotNull Long customerId, @NotBlank String subject, @NotBlank String description,
            @NotBlank String priority, String status) {
    }

    public record PagedResponse(List<TicketResponse> content, int page, int totalPages, long totalElements,
            boolean hasNext) {
    }

    public record TicketResponse(Long id, Long customer_id, String customer_name, String subject, String description,
            String priority, String status, String created_at, String resolved_at) {
        public static TicketResponse from(SupportTicket ticket) {
            return new TicketResponse(ticket.getId(), ticket.getCustomer().getId(),
                    ticket.getCustomer().getFirstName() + " " + ticket.getCustomer().getLastName(), ticket.getSubject(),
                    ticket.getDescription(), ticket.getPriority().name(), ticket.getStatus().name(),
                    ticket.getCreatedAt() != null ? ticket.getCreatedAt().toString() : null,
                    ticket.getResolvedAt() != null ? ticket.getResolvedAt().toString() : null);
        }
    }
}
