package com.mes.factory.controller;

import com.mes.factory.dto.VisionCheckpointDto;
import com.mes.factory.dto.VisionResultDto;
import com.mes.factory.entity.postgres.VisionInspectionCheckpoint;
import com.mes.factory.entity.postgres.VisionInspectionResult;
import com.mes.factory.repository.postgres.VisionInspectionCheckpointRepository;
import com.mes.factory.repository.postgres.VisionInspectionResultRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/vision")
public class VisionController {

    private final VisionInspectionResultRepository resultRepository;
    private final VisionInspectionCheckpointRepository checkpointRepository;

    public VisionController(VisionInspectionResultRepository resultRepository, VisionInspectionCheckpointRepository checkpointRepository) {
        this.resultRepository = resultRepository;
        this.checkpointRepository = checkpointRepository;
    }

    @PostMapping("/results")
    public ResponseEntity<?> submitVisionResult(@RequestBody VisionResultDto dto) {
        VisionInspectionResult result = VisionInspectionResult.builder()
                .partId(dto.getPartId())
                .dataMatrix(dto.getDataMatrix())
                .overallResult(dto.getOverallResult())
                .inspectionMethod(dto.getInspectionMethod())
                .inspectedAt(dto.getInspectedAt() != null ? OffsetDateTime.parse(dto.getInspectedAt() + "Z") : OffsetDateTime.now())
                .defectsFound(dto.getDefectsFound() != null ? dto.getDefectsFound() : 0)
                .build();

        VisionInspectionResult savedResult = resultRepository.save(result);

        if (dto.getCheckpoints() != null && !dto.getCheckpoints().isEmpty()) {
            List<VisionInspectionCheckpoint> checkpoints = dto.getCheckpoints().stream().map(cp ->
                    VisionInspectionCheckpoint.builder()
                            .result(savedResult)
                            .checkpointId(cp.getId())
                            .checkpointName(cp.getName())
                            .balloon(cp.getBalloon())
                            .expectedClass(cp.getExpectedClass())
                            .aiClass(cp.getAiClass())
                            .aiConfidence(cp.getAiConfidence())
                            .resultStatus(cp.getResult())
                            .defectType(cp.getDefectType())
                            .build()
            ).collect(Collectors.toList());

            checkpointRepository.saveAll(checkpoints);
        }

        return ResponseEntity.ok().body("Vision result saved successfully for part: " + dto.getPartId());
    }

    @GetMapping("/results")
    public ResponseEntity<List<VisionInspectionResult>> getAllResults() {
        // Fetch all results, ordered by creation time descending
        List<VisionInspectionResult> results = resultRepository.findAll()
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    private static Process scannerProcess;

    @PostMapping("/start-scanner")
    public ResponseEntity<?> startScanner() {
        if (scannerProcess != null && scannerProcess.isAlive()) {
            return ResponseEntity.badRequest().body("Scanner is already running.");
        }
        try {
            java.io.File dir = new java.io.File(System.getProperty("user.dir")).getParentFile();
            java.io.File cvDir = new java.io.File(dir, "cv-inspection");
            
            ProcessBuilder pb = new ProcessBuilder("python", "local_scanner.py");
            pb.directory(cvDir);
            pb.redirectErrorStream(true);
            
            scannerProcess = pb.start();
            return ResponseEntity.ok().body(java.util.Collections.singletonMap("message", "Scanner started successfully."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(java.util.Collections.singletonMap("error", "Failed to start scanner: " + e.getMessage()));
        }
    }

    @PostMapping("/stop-scanner")
    public ResponseEntity<?> stopScanner() {
        if (scannerProcess != null && scannerProcess.isAlive()) {
            scannerProcess.destroy();
            return ResponseEntity.ok().body(java.util.Collections.singletonMap("message", "Scanner stopped."));
        }
        return ResponseEntity.ok().body(java.util.Collections.singletonMap("message", "Scanner is not running."));
    }

    @GetMapping("/scanner-status")
    public ResponseEntity<?> getScannerStatus() {
        boolean isRunning = scannerProcess != null && scannerProcess.isAlive();
        return ResponseEntity.ok().body(java.util.Collections.singletonMap("running", isRunning));
    }
}
