package com.mes.factory.service;

import com.mes.factory.dto.request.CustomerRequest;
import com.mes.factory.dto.response.CustomerResponse;
import com.mes.factory.entity.postgres.Customer;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.CustomerRepository;
import com.mes.factory.repository.postgres.FactoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CustomerService {

    private static final Logger log = LoggerFactory.getLogger(CustomerService.class);

    private final CustomerRepository customerRepository;
    private final FactoryRepository factoryRepository;

    public CustomerService(CustomerRepository customerRepository, FactoryRepository factoryRepository) {
        this.customerRepository = customerRepository;
        this.factoryRepository = factoryRepository;
    }

    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(UUID factoryId, String search, Pageable pageable) {
        Page<Customer> customers;
        if (search != null && !search.isBlank()) {
            customers = customerRepository.searchByNameOrGst(factoryId, search, pageable);
        } else {
            customers = customerRepository.findByFactoryIdAndIsActiveTrue(factoryId, pageable);
        }
        return customers.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomer(UUID id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", id));
        return toResponse(customer);
    }

    @Transactional
    public CustomerResponse createCustomer(UUID factoryId, CustomerRequest request) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Factory", "id", factoryId));

        Customer customer = Customer.builder()
                .factory(factory)
                .name(request.getName())
                .gstNumber(request.getGstNumber())
                .address(request.getAddress())
                .contactPerson(request.getContactPerson())
                .email(request.getEmail())
                .phone(request.getPhone())
                .build();

        return toResponse(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse updateCustomer(UUID id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", id));

        customer.setName(request.getName());
        customer.setGstNumber(request.getGstNumber());
        customer.setAddress(request.getAddress());
        customer.setContactPerson(request.getContactPerson());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());

        return toResponse(customerRepository.save(customer));
    }

    @Transactional
    public void deleteCustomer(UUID id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", id));
        customer.setIsActive(false);
        customerRepository.save(customer);
    }

    @Transactional
    public Customer findOrCreateByName(UUID factoryId, String name) {
        return customerRepository.findByFactoryIdAndNameIgnoreCase(factoryId, name)
                .orElseGet(() -> {
                    Factory factory = factoryRepository.findById(factoryId)
                            .orElseThrow(() -> new ResourceNotFoundException("Factory", "id", factoryId));
                    Customer customer = Customer.builder()
                            .factory(factory)
                            .name(name)
                            .build();
                    return customerRepository.save(customer);
                });
    }

    private CustomerResponse toResponse(Customer c) {
        return CustomerResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .gstNumber(c.getGstNumber())
                .address(c.getAddress())
                .contactPerson(c.getContactPerson())
                .email(c.getEmail())
                .phone(c.getPhone())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
