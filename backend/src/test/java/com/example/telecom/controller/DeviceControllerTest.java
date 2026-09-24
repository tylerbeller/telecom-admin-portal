package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DeviceControllerTest {

    private final DeviceRepository repository = mock(DeviceRepository.class);
    private final CustomerRepository customerRepository = mock(CustomerRepository.class);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DeviceController(repository, customerRepository))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @Test
    void getDevicesReturnsThePagedContract() throws Exception {
        Device device = device(1L, customer(7L, "Ada", "Lovelace"));
        when(repository.findFiltered(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(device), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/devices")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1)).andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].imei").value("351000000000000"))
                .andExpect(jsonPath("$.content[0].model").value("Galaxy S24"))
                .andExpect(jsonPath("$.content[0].sim_number").value("8901100000000000000"))
                .andExpect(jsonPath("$.content[0].customer_id").value(7))
                .andExpect(jsonPath("$.content[0].customer_name").value("Ada Lovelace"))
                .andExpect(jsonPath("$.content[0].status").value("ASSIGNED")).andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalPages").value(1)).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void getDevicesToleratesAnUnassignedDevice() throws Exception {
        Device device = device(2L, null);
        when(repository.findFiltered(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(device), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/devices")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].customer_id").isEmpty())
                .andExpect(jsonPath("$.content[0].customer_name").isEmpty())
                .andExpect(jsonPath("$.content[0].status").value("AVAILABLE"));
    }

    @Test
    void getDevicesForwardsSearchAndStatusFilters() throws Exception {
        when(repository.findFiltered(eq("galaxy"), eq(Device.Status.ASSIGNED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/devices").param("search", "galaxy").param("status", "ASSIGNED"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));

        verify(repository).findFiltered(eq("galaxy"), eq(Device.Status.ASSIGNED), any(Pageable.class));
    }

    @Test
    void getDevicesRejectsAnUnknownStatus() throws Exception {
        mockMvc.perform(get("/api/devices").param("status", "BOGUS")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid value"));

        verify(repository, never()).findFiltered(any(), any(), any(Pageable.class));
    }

    @Test
    void getDevicesClampsThePageSizeToOneHundred() throws Exception {
        when(repository.findFiltered(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));

        mockMvc.perform(get("/api/devices").param("size", "500")).andExpect(status().isOk());

        verify(repository).findFiltered(isNull(), isNull(), argThat(
                pageable -> pageable instanceof PageRequest pr && pr.getPageSize() == 100 && pr.getPageNumber() == 0));
    }

    @Test
    void createDeviceRejectsABlankImei() throws Exception {
        String body = """
                {"imei":"","model":"Galaxy S24","simNumber":"8901100000000000000"}
                """;

        mockMvc.perform(post("/api/devices").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.fields.imei").exists());

        verify(repository, never()).save(any(Device.class));
    }

    @Test
    void createDeviceRejectsAMissingModel() throws Exception {
        String body = """
                {"imei":"351000000000000","simNumber":"8901100000000000000"}
                """;

        mockMvc.perform(post("/api/devices").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.fields.model").exists());
    }

    private static Device device(Long id, Customer customer) {
        Device device = new Device("351000000000000", "Galaxy S24", "8901100000000000000");
        device.setId(id);
        device.setCustomer(customer);
        device.setStatus(customer != null ? Device.Status.ASSIGNED : Device.Status.AVAILABLE);
        return device;
    }

    private static Customer customer(Long id, String firstName, String lastName) {
        Customer customer = new Customer(firstName, lastName, "customer" + id + "@example.com", "555-000" + id, null);
        customer.setId(id);
        return customer;
    }
}
