package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.FactoryShift;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.PqcShiftApproval;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.repository.postgres.FactoryShiftRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.PqcShiftApprovalRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pqc/approvals")
public class PqcApprovalController {

    private final PqcShiftApprovalRepository approvalRepository;
    private final GaugeRepository gaugeRepository;
    private final FactoryShiftRepository shiftRepository;
    private final UserRepository userRepository;

    public PqcApprovalController(PqcShiftApprovalRepository approvalRepository,
                                 GaugeRepository gaugeRepository,
                                 FactoryShiftRepository shiftRepository,
                                 UserRepository userRepository) {
        this.approvalRepository = approvalRepository;
        this.gaugeRepository = gaugeRepository;
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/shift")
    public ResponseEntity<ApiResponse<PqcShiftApproval>> approveShift(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UUID gaugeId = UUID.fromString(payload.get("gaugeId"));
        UUID shiftId = UUID.fromString(payload.get("shiftId"));
        String inspectionDate = payload.get("inspectionDate");

        User user = userRepository.findById(currentUser.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getSignature() == null || user.getSignature().isEmpty()) {
            throw new IllegalArgumentException("You must upload a signature in your profile before approving.");
        }

        Gauge gauge = gaugeRepository.findById(gaugeId)
                .orElseThrow(() -> new IllegalArgumentException("Gauge not found"));

        FactoryShift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        PqcShiftApproval approval = PqcShiftApproval.builder()
                .gauge(gauge)
                .shift(shift)
                .inspectionDate(inspectionDate)
                .inspectorName(user.getFullName())
                .signature(user.getSignature())
                .build();

        PqcShiftApproval saved = approvalRepository.save(approval);

        return ResponseEntity.ok(ApiResponse.success(saved));
    }
}
