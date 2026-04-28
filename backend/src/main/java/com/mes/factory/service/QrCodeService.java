package com.mes.factory.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class QrCodeService {

    private static final Logger log = LoggerFactory.getLogger(QrCodeService.class);

    private final MinioClient minioClient;
    private final ObjectMapper objectMapper;

    @Value("${minio.bucket-name}")
    private String bucketName;

    public QrCodeService(MinioClient minioClient, ObjectMapper objectMapper) {
        this.minioClient = minioClient;
        this.objectMapper = objectMapper;
    }

    public String generateAndUploadQrCode(String serialNumber, UUID gaugeId,
                                           String poNumber, String gaugeTypeName) {
        try {
            Map<String, String> qrData = new HashMap<>();
            qrData.put("serial_number", serialNumber);
            qrData.put("gauge_id", gaugeId.toString());
            qrData.put("po_number", poNumber);
            qrData.put("gauge_type_name", gaugeTypeName);

            String content = objectMapper.writeValueAsString(qrData);

            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);

            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, 300, 300, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            byte[] imageBytes = outputStream.toByteArray();

            String objectPath = "qr-codes/" + gaugeId + ".png";

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectPath)
                            .stream(new ByteArrayInputStream(imageBytes), imageBytes.length, -1)
                            .contentType("image/png")
                            .build()
            );

            log.info("QR code generated and uploaded for gauge: {}", serialNumber);
            return objectPath;

        } catch (Exception e) {
            log.error("Failed to generate QR code for gauge {}: {}", serialNumber, e.getMessage());
            throw new RuntimeException("QR code generation failed", e);
        }
    }
}
