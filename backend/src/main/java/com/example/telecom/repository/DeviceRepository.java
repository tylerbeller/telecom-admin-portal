package com.example.telecom.repository;

import com.example.telecom.model.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    List<Device> findByStatus(Device.Status status);

    long countByStatus(Device.Status status);

    @Query("SELECT d.status, COUNT(d) FROM Device d GROUP BY d.status")
    List<Object[]> countByStatus();

    @Query(value = "SELECT d FROM Device d WHERE "
            + "(:search IS NULL OR LOWER(d.imei) LIKE CONCAT('%', LOWER(:search), '%') "
            + "OR LOWER(d.model) LIKE CONCAT('%', LOWER(:search), '%') "
            + "OR LOWER(d.simNumber) LIKE CONCAT('%', LOWER(:search), '%')) AND "
            + "(:status IS NULL OR d.status = :status) ORDER BY d.id", countQuery = "SELECT COUNT(d) FROM Device d WHERE "
                    + "(:search IS NULL OR LOWER(d.imei) LIKE CONCAT('%', LOWER(:search), '%') "
                    + "OR LOWER(d.model) LIKE CONCAT('%', LOWER(:search), '%') "
                    + "OR LOWER(d.simNumber) LIKE CONCAT('%', LOWER(:search), '%')) AND "
                    + "(:status IS NULL OR d.status = :status)")
    @EntityGraph(attributePaths = {"customer", "customer.plan"})
    Page<Device> findFiltered(@Param("search") String search, @Param("status") Device.Status status, Pageable pageable);
}
