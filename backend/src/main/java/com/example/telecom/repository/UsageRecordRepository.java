package com.example.telecom.repository;

import com.example.telecom.model.UsageRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface UsageRecordRepository extends JpaRepository<UsageRecord, Long> {
    @EntityGraph(attributePaths = "customer")
    Page<UsageRecord> findByCustomerId(Long customerId, Pageable pageable);

    @EntityGraph(attributePaths = "customer")
    Page<UsageRecord> findAllByOrderByRecordedAtDesc(Pageable pageable);

    @Query(value = "SELECT u FROM UsageRecord u WHERE " + "(:type IS NULL OR u.type = :type) AND "
            + "(:customerId IS NULL OR u.customer.id = :customerId) AND "
            + "(:dateFrom IS NULL OR u.recordedAt >= :dateFrom) AND " + "(:dateTo IS NULL OR u.recordedAt <= :dateTo) "
            + "ORDER BY u.recordedAt DESC", countQuery = "SELECT COUNT(u) FROM UsageRecord u WHERE (:type IS NULL OR u.type = :type) AND "
                    + "(:customerId IS NULL OR u.customer.id = :customerId) AND "
                    + "(:dateFrom IS NULL OR u.recordedAt >= :dateFrom) AND "
                    + "(:dateTo IS NULL OR u.recordedAt <= :dateTo)")
    @EntityGraph(attributePaths = {"customer", "customer.plan"})
    Page<UsageRecord> findFiltered(@Param("type") UsageRecord.Type type, @Param("customerId") Long customerId,
            @Param("dateFrom") Instant dateFrom, @Param("dateTo") Instant dateTo, Pageable pageable);
}
