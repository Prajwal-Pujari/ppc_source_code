package com.mes.factory.service;

import com.mes.factory.dto.ReportConfigurationDto;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.entity.postgres.ReportConfiguration;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.ReportConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportConfigurationService {

    private final ReportConfigurationRepository reportConfigurationRepository;
    private final FactoryRepository factoryRepository;

    @Transactional(readOnly = true)
    public ReportConfigurationDto getConfiguration(UUID factoryId) {
        return reportConfigurationRepository.findByFactoryId(factoryId)
                .map(this::mapToDto)
                .orElseGet(ReportConfigurationDto::new);
    }

    @Transactional
    public ReportConfigurationDto saveConfiguration(UUID factoryId, ReportConfigurationDto dto) {
        ReportConfiguration config = reportConfigurationRepository.findByFactoryId(factoryId)
                .orElseGet(() -> {
                    Factory factory = factoryRepository.findById(factoryId)
                            .orElseThrow(() -> new RuntimeException("Factory not found"));
                    return ReportConfiguration.builder().factory(factory).build();
                });

        config.setCustomerLogo(dto.getCustomerLogo());
        config.setCustomerName(dto.getCustomerName());
        config.setDocNo(dto.getDocNo());
        config.setRevNo(dto.getRevNo());
        config.setIssueDate(dto.getIssueDate());

        config.setInProcessDocNo(dto.getInProcessDocNo());
        config.setInProcessRevNo(dto.getInProcessRevNo());
        config.setInProcessIssueDate(dto.getInProcessIssueDate());

        config.setPdirDocNo(dto.getPdirDocNo());
        config.setPdirRevNo(dto.getPdirRevNo());
        config.setPdirIssueDate(dto.getPdirIssueDate());

        config.setSetupDocNo(dto.getSetupDocNo());
        config.setSetupRevNo(dto.getSetupRevNo());
        config.setSetupIssueDate(dto.getSetupIssueDate());

        config.setFaiDocNo(dto.getFaiDocNo());
        config.setFaiRevNo(dto.getFaiRevNo());
        config.setFaiIssueDate(dto.getFaiIssueDate());

        config.setLayoutDocNo(dto.getLayoutDocNo());
        config.setLayoutRevNo(dto.getLayoutRevNo());
        config.setLayoutIssueDate(dto.getLayoutIssueDate());

        config = reportConfigurationRepository.save(config);
        return mapToDto(config);
    }

    private ReportConfigurationDto mapToDto(ReportConfiguration entity) {
        return ReportConfigurationDto.builder()
                .id(entity.getId())
                .customerLogo(entity.getCustomerLogo())
                .customerName(entity.getCustomerName())
                .docNo(entity.getDocNo())
                .revNo(entity.getRevNo())
                .issueDate(entity.getIssueDate())
                .inProcessDocNo(entity.getInProcessDocNo())
                .inProcessRevNo(entity.getInProcessRevNo())
                .inProcessIssueDate(entity.getInProcessIssueDate())
                .pdirDocNo(entity.getPdirDocNo())
                .pdirRevNo(entity.getPdirRevNo())
                .pdirIssueDate(entity.getPdirIssueDate())
                .setupDocNo(entity.getSetupDocNo())
                .setupRevNo(entity.getSetupRevNo())
                .setupIssueDate(entity.getSetupIssueDate())
                .faiDocNo(entity.getFaiDocNo())
                .faiRevNo(entity.getFaiRevNo())
                .faiIssueDate(entity.getFaiIssueDate())
                .layoutDocNo(entity.getLayoutDocNo())
                .layoutRevNo(entity.getLayoutRevNo())
                .layoutIssueDate(entity.getLayoutIssueDate())
                .build();
    }
}
