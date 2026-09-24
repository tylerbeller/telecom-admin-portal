package com.example.telecom.repository;

import com.example.telecom.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    long countByStatus(Customer.Status status);

    @Query("SELECT COALESCE(SUM(c.plan.monthlyPrice), 0) FROM Customer c "
            + "WHERE c.status = 'ACTIVE' AND c.plan IS NOT NULL")
    BigDecimal sumMonthlyRevenueByStatusActive();

    @Query("SELECT c.plan.name, SUM(c.plan.monthlyPrice) FROM Customer c "
            + "WHERE c.status = 'ACTIVE' AND c.plan IS NOT NULL "
            + "GROUP BY c.plan.id, c.plan.name ORDER BY c.plan.id")
    List<Object[]> sumRevenueByPlan();

    @Query("SELECT c.plan.name, COUNT(c) FROM Customer c WHERE c.status = 'ACTIVE' GROUP BY c.plan.name")
    List<Object[]> countByPlanName();

    @Query("SELECT FUNCTION('strftime', '%Y-%m', c.createdAt), COUNT(c) FROM Customer c GROUP BY FUNCTION('strftime', '%Y-%m', c.createdAt) ORDER BY FUNCTION('strftime', '%Y-%m', c.createdAt) DESC")
    List<Object[]> countByMonth();

    @Query(value = "SELECT c FROM Customer c WHERE "
            + "(:search IS NULL OR LOWER(c.firstName) LIKE CONCAT('%', LOWER(:search), '%') "
            + "OR LOWER(c.lastName) LIKE CONCAT('%', LOWER(:search), '%') "
            + "OR LOWER(c.email) LIKE CONCAT('%', LOWER(:search), '%')) AND "
            + "(:status IS NULL OR c.status = :status)", countQuery = "SELECT COUNT(c) FROM Customer c WHERE "
                    + "(:search IS NULL OR LOWER(c.firstName) LIKE CONCAT('%', LOWER(:search), '%') "
                    + "OR LOWER(c.lastName) LIKE CONCAT('%', LOWER(:search), '%') "
                    + "OR LOWER(c.email) LIKE CONCAT('%', LOWER(:search), '%')) AND "
                    + "(:status IS NULL OR c.status = :status)")
    @EntityGraph(attributePaths = "plan")
    Page<Customer> findFiltered(@Param("search") String search, @Param("status") Customer.Status status,
            Pageable pageable);
}
