package com.example.telecom.repository;

import com.example.telecom.model.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByStatus(SupportTicket.Status status);

    long countByStatusIn(List<SupportTicket.Status> statuses);

    @Query("SELECT t.status, COUNT(t) FROM SupportTicket t GROUP BY t.status")
    List<Object[]> countByStatus();

    @EntityGraph(attributePaths = "customer")
    Page<SupportTicket> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query(value = """
            WITH filters AS (
              SELECT :priority AS priority, :status AS status, :customerId AS customer_id,
                     :search AS search, :dateFrom AS date_from, :dateTo AS date_to
            )
            SELECT t.* FROM support_tickets t
            JOIN customers c ON c.id = t.customer_id
            CROSS JOIN filters f
            WHERE (f.priority = '' OR t.priority = f.priority)
              AND (f.status = '' OR t.status = f.status)
              AND (f.customer_id = -1 OR t.customer_id = f.customer_id)
              AND (f.search = '' OR LOWER(c.first_name) LIKE '%' || LOWER(f.search) || '%'
                   OR LOWER(c.last_name) LIKE '%' || LOWER(f.search) || '%')
              AND (f.date_from = '' OR CASE WHEN typeof(t.created_at) = 'integer'
                   THEN strftime('%Y-%m-%d', t.created_at / 1000, 'unixepoch')
                   ELSE strftime('%Y-%m-%d', t.created_at) END >= f.date_from)
              AND (f.date_to = '' OR CASE WHEN typeof(t.created_at) = 'integer'
                   THEN strftime('%Y-%m-%d', t.created_at / 1000, 'unixepoch')
                   ELSE strftime('%Y-%m-%d', t.created_at) END <= f.date_to)
            ORDER BY t.created_at DESC
            """, countQuery = """
            WITH filters AS (
              SELECT :priority AS priority, :status AS status, :customerId AS customer_id,
                     :search AS search, :dateFrom AS date_from, :dateTo AS date_to
            )
            SELECT COUNT(*) FROM support_tickets t
            JOIN customers c ON c.id = t.customer_id
            CROSS JOIN filters f
            WHERE (f.priority = '' OR t.priority = f.priority)
              AND (f.status = '' OR t.status = f.status)
              AND (f.customer_id = -1 OR t.customer_id = f.customer_id)
              AND (f.search = '' OR LOWER(c.first_name) LIKE '%' || LOWER(f.search) || '%'
                   OR LOWER(c.last_name) LIKE '%' || LOWER(f.search) || '%')
              AND (f.date_from = '' OR CASE WHEN typeof(t.created_at) = 'integer'
                   THEN strftime('%Y-%m-%d', t.created_at / 1000, 'unixepoch')
                   ELSE strftime('%Y-%m-%d', t.created_at) END >= f.date_from)
              AND (f.date_to = '' OR CASE WHEN typeof(t.created_at) = 'integer'
                   THEN strftime('%Y-%m-%d', t.created_at / 1000, 'unixepoch')
                   ELSE strftime('%Y-%m-%d', t.created_at) END <= f.date_to)
            """, nativeQuery = true)
    @SuppressWarnings("PMD.UseObjectForClearerAPI")
    Page<SupportTicket> findFiltered(@Param("priority") String priority, @Param("status") String status,
            @Param("customerId") long customerId, @Param("search") String search, @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo, Pageable pageable);
}
