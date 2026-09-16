package com.example.telecom.controller;

import com.example.telecom.model.Device;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private static final Logger LOG = LoggerFactory.getLogger(DeviceController.class);

    private final DeviceRepository repository;
    private final CustomerRepository customerRepository;

    public DeviceController(DeviceRepository repository, CustomerRepository customerRepository) {
        this.repository = repository;
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public List<DeviceResponse> getAllDevices() {
        LOG.info("Fetching all devices");
        List<DeviceResponse> devices = repository.findAll(PageRequest.of(0, 1000)).stream().map(DeviceResponse::from)
                .toList();
        LOG.debug("Found {} devices", devices.size());
        return devices;
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceResponse> getDevice(@PathVariable Long id) {
        LOG.info("Fetching device with id={}", id);
        return repository.findById(id).map(device -> {
            LOG.debug("Found device: id={}", device.getId());
            return ResponseEntity.ok(DeviceResponse.from(device));
        }).orElseGet(() -> {
            LOG.warn("Device not found: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @PostMapping
    public DeviceResponse createDevice(@RequestBody DeviceRequest request) {
        LOG.info("Creating device");
        Device device = new Device(request.imei(), request.model(), request.simNumber());
        if (request.customerId() != null) {
            customerRepository.findById(request.customerId()).ifPresent(customer -> {
                device.setCustomer(customer);
                device.setStatus(Device.Status.ASSIGNED);
                device.setAssignedAt(Instant.now());
                LOG.debug("Device assigned to customer: customerId={}", customer.getId());
            });
        }
        Device saved = repository.save(device);
        LOG.info("Device created: id={}", saved.getId());
        return DeviceResponse.from(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeviceResponse> updateDevice(@PathVariable Long id, @RequestBody DeviceRequest request) {
        LOG.info("Updating device: id={}", id);
        return repository.findById(id).map(device -> {
            device.setImei(request.imei());
            device.setModel(request.model());
            device.setSimNumber(request.simNumber());
            if (request.status() != null) {
                device.setStatus(Device.Status.valueOf(request.status()));
            }
            if (request.customerId() != null) {
                customerRepository.findById(request.customerId()).ifPresent(customer -> {
                    device.setCustomer(customer);
                    device.setStatus(Device.Status.ASSIGNED);
                    device.setAssignedAt(Instant.now());
                });
            } else if (request.status() != null && "AVAILABLE".equals(request.status())) {
                device.setCustomer(null);
                device.setAssignedAt(null);
            }
            Device saved = repository.save(device);
            LOG.info("Device updated: id={}", saved.getId());
            return ResponseEntity.ok(DeviceResponse.from(saved));
        }).orElseGet(() -> {
            LOG.warn("Device not found for update: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        LOG.info("Deleting device: id={}", id);
        if (!repository.existsById(id)) {
            LOG.warn("Device not found for deletion: id={}", id);
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        LOG.info("Device deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    public record DeviceRequest(String imei, String model, String simNumber, Long customerId, String status) {
    }

    public record DeviceResponse(Long id, String imei, String model, String sim_number, Long customer_id,
            String customer_name, String status, String assigned_at, String created_at) {
        public static DeviceResponse from(Device device) {
            return new DeviceResponse(device.getId(), device.getImei(), device.getModel(), device.getSimNumber(),
                    device.getCustomer() != null ? device.getCustomer().getId() : null,
                    device.getCustomer() != null
                            ? device.getCustomer().getFirstName() + " " + device.getCustomer().getLastName()
                            : null,
                    device.getStatus().name(),
                    device.getAssignedAt() != null ? device.getAssignedAt().toString() : null,
                    device.getCreatedAt() != null ? device.getCreatedAt().toString() : null);
        }
    }
}
