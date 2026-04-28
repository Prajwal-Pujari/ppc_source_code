package com.mes.factory.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private T data;
    private String message;
    private Instant timestamp;
    private String errorCode;
    private List<FieldError> fieldErrors;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldError {
        private String field;
        private String message;
    }

    // Manual generic builder — fixes Lombok @Builder limitation with generics
    public static <T> ApiResponseBuilder<T> builder() {
        return new ApiResponseBuilder<>();
    }

    public static class ApiResponseBuilder<T> {
        private boolean success;
        private T data;
        private String message;
        private Instant timestamp;
        private String errorCode;
        private List<FieldError> fieldErrors;

        public ApiResponseBuilder<T> success(boolean success) { this.success = success; return this; }
        public ApiResponseBuilder<T> data(T data) { this.data = data; return this; }
        public ApiResponseBuilder<T> message(String message) { this.message = message; return this; }
        public ApiResponseBuilder<T> timestamp(Instant timestamp) { this.timestamp = timestamp; return this; }
        public ApiResponseBuilder<T> errorCode(String errorCode) { this.errorCode = errorCode; return this; }
        public ApiResponseBuilder<T> fieldErrors(List<FieldError> fieldErrors) { this.fieldErrors = fieldErrors; return this; }

        public ApiResponse<T> build() {
            ApiResponse<T> r = new ApiResponse<>();
            r.setSuccess(this.success);
            r.setData(this.data);
            r.setMessage(this.message);
            r.setTimestamp(this.timestamp);
            r.setErrorCode(this.errorCode);
            r.setFieldErrors(this.fieldErrors);
            return r;
        }
    }

    // Static factory methods — unchanged
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> validationError(String message, List<FieldError> fieldErrors) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode("VALIDATION_ERROR")
                .fieldErrors(fieldErrors)
                .timestamp(Instant.now())
                .build();
    }
}