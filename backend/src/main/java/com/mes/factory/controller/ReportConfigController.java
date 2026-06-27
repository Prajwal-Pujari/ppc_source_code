package com.mes.factory.controller;

import com.mes.factory.entity.postgres.ReportConfiguration;
import com.mes.factory.repository.postgres.ReportConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/report-config")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportConfigController {

    private final ReportConfigurationRepository repository;

    @GetMapping
    public ResponseEntity<ReportConfiguration> get() {
        ReportConfiguration config = repository.findById("default-config")
                .orElseGet(() -> repository.save(ReportConfiguration.builder()
                        .id("default-config")
                        .companyName("")
                        .companyAddress("")
                        .customerLogo("")
                        .docNo("QMS/F/01")
                        .revNo("00 / 01.01.2024")
                        .issueDate("01.01.2024")
                        .updatedAt(LocalDateTime.now())
                        .build()));
        if (config.getCompanyName() != null && config.getCompanyName().contains("Precision Gauge")) {
            config.setCompanyName("");
            config.setCompanyAddress("");
            repository.save(config);
        }
        return ResponseEntity.ok(config);
    }

    @PostMapping
    public ResponseEntity<ReportConfiguration> save(@RequestBody ReportConfiguration request) {
        request.setId("default-config");
        request.setUpdatedAt(LocalDateTime.now());
        ReportConfiguration saved = repository.save(request);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/network-ip")
    public java.util.Map<String, String> getNetworkIp() {
        String ip = "localhost";
        try {
            java.util.Enumeration<java.net.NetworkInterface> interfaces = java.net.NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                java.net.NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                java.util.Enumeration<java.net.InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    java.net.InetAddress addr = addresses.nextElement();
                    if (addr instanceof java.net.Inet4Address && !addr.isLoopbackAddress()) {
                        ip = addr.getHostAddress();
                        break;
                    }
                }
                if (!"localhost".equals(ip)) break;
            }
        } catch (Exception e) {
            // ignore
        }
        return java.util.Map.of("ip", ip);
    }
}
