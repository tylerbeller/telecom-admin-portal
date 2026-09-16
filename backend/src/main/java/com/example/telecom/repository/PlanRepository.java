package com.example.telecom.repository;

import com.example.telecom.model.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    List<Plan> findByIsActiveTrue();
}
