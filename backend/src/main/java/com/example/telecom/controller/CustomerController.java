package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Plan;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.PlanRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private static final Logger LOG = LoggerFactory.getLogger(CustomerController.class);

    private final CustomerRepository repository;
    private final PlanRepository planRepository;

    public CustomerController(CustomerRepository repository, PlanRepository planRepository) {
        this.repository = repository;
        this.planRepository = planRepository;
    }

    @GetMapping
    public PagedResponse getCustomers(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) String search,
            @RequestParam(required = false) String status, @RequestParam(defaultValue = "NAME_ASC") String sort) {
        LOG.info("Fetching customers: page={}, size={}, search={}, status={}, sort={}", page, size, search, status,
                sort);
        Customer.Status statusEnum = (status != null && !status.isEmpty()) ? Customer.Status.valueOf(status) : null;
        CustomerSort sortEnum = CustomerSort.valueOf(sort);
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)), sortEnum.sort());

        Page<Customer> result = repository.findFiltered(normalizedSearch, statusEnum, pageRequest);

        LOG.debug("Found {} customers (page {} of {})", result.getNumberOfElements(), result.getNumber(),
                result.getTotalPages());
        return new PagedResponse(result.getContent().stream().map(CustomerResponse::from).toList(), result.getNumber(),
                result.getTotalPages(), result.getTotalElements(), result.hasNext());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> getCustomer(@PathVariable Long id) {
        LOG.info("Fetching customer with id={}", id);
        return repository.findById(id).map(customer -> {
            LOG.debug("Found customer: id={}", customer.getId());
            return ResponseEntity.ok(CustomerResponse.from(customer));
        }).orElseGet(() -> {
            LOG.warn("Customer not found: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    public enum CustomerSort {
        NAME_ASC(Sort.Order.asc("firstName").ignoreCase(), Sort.Order.asc("lastName").ignoreCase(),
                Sort.Order.asc("id")), NAME_DESC(Sort.Order.desc("firstName").ignoreCase(),
                        Sort.Order.desc("lastName").ignoreCase(),
                        Sort.Order.asc("id")), PLAN_ASC(Sort.Order.asc("plan.name").ignoreCase(),
                                Sort.Order.asc("id")), PLAN_DESC(Sort.Order.desc("plan.name").ignoreCase(),
                                        Sort.Order.asc("id")), STATUS_ASC(Sort.Order.asc("status").ignoreCase(),
                                                Sort.Order.asc("id")), STATUS_DESC(
                                                        Sort.Order.desc("status").ignoreCase(),
                                                        Sort.Order.asc("id")), BALANCE_ASC(Sort.Order.asc("balance"),
                                                                Sort.Order.asc("id")), BALANCE_DESC(
                                                                        Sort.Order.desc("balance"),
                                                                        Sort.Order.asc("id"));

        private final Sort sortSpec;

        CustomerSort(Sort.Order... orders) {
            this.sortSpec = Sort.by(orders);
        }

        public Sort sort() {
            return sortSpec;
        }
    }

    @PostMapping
    public ResponseEntity<CustomerResponse> createCustomer(@Valid @RequestBody CustomerCreateRequest request) {
        LOG.info("Creating customer");
        Plan plan = planRepository.findById(request.planId()).orElse(null);
        if (plan == null) {
            LOG.warn("Plan not found for customer creation: planId={}", request.planId());
            return ResponseEntity.badRequest().build();
        }
        Customer customer = new Customer(request.firstName(), request.lastName(), request.email(), request.phone(),
                plan);
        if (request.balance() != null) {
            customer.setBalance(request.balance());
        }
        Customer saved = repository.save(customer);
        LOG.info("Customer created: id={}", saved.getId());
        return ResponseEntity.ok(CustomerResponse.from(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerResponse> updateCustomer(@PathVariable Long id,
            @Valid @RequestBody CustomerUpdateRequest request) {
        LOG.info("Updating customer: id={}", id);
        return repository.findById(id).map(customer -> {
            customer.setFirstName(request.firstName());
            customer.setLastName(request.lastName());
            customer.setEmail(request.email());
            customer.setPhone(request.phone());
            if (request.planId() != null) {
                planRepository.findById(request.planId()).ifPresent(customer::setPlan);
            }
            if (request.status() != null) {
                customer.setStatus(Customer.Status.valueOf(request.status()));
            }
            if (request.balance() != null) {
                customer.setBalance(request.balance());
            }
            Customer saved = repository.save(customer);
            LOG.info("Customer updated: id={}", saved.getId());
            return ResponseEntity.ok(CustomerResponse.from(saved));
        }).orElseGet(() -> {
            LOG.warn("Customer not found for update: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        LOG.info("Deleting customer: id={}", id);
        if (!repository.existsById(id)) {
            LOG.warn("Customer not found for deletion: id={}", id);
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        LOG.info("Customer deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    public record CustomerCreateRequest(@NotBlank String firstName, @NotBlank String lastName,
            @NotBlank @Email String email, @NotBlank String phone, @NotNull Long planId,
            @PositiveOrZero BigDecimal balance) {
    }

    public record CustomerUpdateRequest(@NotBlank String firstName, @NotBlank String lastName,
            @NotBlank @Email String email, @NotBlank String phone, Long planId, String status,
            @PositiveOrZero BigDecimal balance) {
    }

    public record PagedResponse(List<CustomerResponse> content, int page, int totalPages, long totalElements,
            boolean hasNext) {
        public PagedResponse {
            content = List.copyOf(content);
        }
    }

    public record CustomerResponse(Long id, String first_name, String last_name, String email, String phone,
            Long plan_id, String plan_name, String status, BigDecimal balance, String activated_at, String created_at) {
        public static CustomerResponse from(Customer customer) {
            return new CustomerResponse(customer.getId(), customer.getFirstName(), customer.getLastName(),
                    customer.getEmail(), customer.getPhone(),
                    customer.getPlan() != null ? customer.getPlan().getId() : null,
                    customer.getPlan() != null ? customer.getPlan().getName() : null, customer.getStatus().name(),
                    customer.getBalance(),
                    customer.getActivatedAt() != null ? customer.getActivatedAt().toString() : null,
                    customer.getCreatedAt() != null ? customer.getCreatedAt().toString() : null);
        }
    }
}
