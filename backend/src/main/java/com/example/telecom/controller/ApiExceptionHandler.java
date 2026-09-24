package com.example.telecom.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Translates exceptions into a consistent JSON error shape so the UI can show
 * meaningful messages instead of Spring's default error payload.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ApiError(String error, String message, Map<String, String> fields) {
        public ApiError {
            fields = fields == null ? Map.of() : Map.copyOf(fields);
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        LOG.debug("Request failed validation: {}", fields.keySet());
        return badRequest("Validation failed", "Some fields are missing or invalid", fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex) {
        LOG.debug("Malformed request body", ex);
        return badRequest("Malformed request body", "The request body could not be parsed", null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        LOG.debug("Invalid value for parameter {}: {}", ex.getName(), ex.getValue());
        return badRequest("Invalid value", "'" + ex.getValue() + "' is not a valid value for '" + ex.getName() + "'",
                null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        LOG.debug("Invalid request value: {}", ex.getMessage());
        return badRequest("Invalid value", ex.getMessage(), null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataConflict(DataIntegrityViolationException ex) {
        LOG.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Data conflict",
                "A record with these values already exists or violates a database constraint", null));
    }

    @ExceptionHandler(JpaSystemException.class)
    public ResponseEntity<ApiError> handleJpaSystem(JpaSystemException ex) {
        // The SQLite JDBC driver surfaces unique and foreign-key violations as
        // generic JpaSystemException instead of DataIntegrityViolationException,
        // so constraint failures are detected via the root cause.
        Throwable root = ex;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        String detail = root.getMessage() != null ? root.getMessage().toUpperCase(Locale.ROOT) : "";
        if (detail.contains("CONSTRAINT")) {
            LOG.warn("Data conflict: {}", root.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Data conflict",
                    "A record with these values already exists or violates a database constraint", null));
        }
        LOG.error("Unhandled JPA exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("Internal error", "An unexpected error occurred", null));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError("Not found", "The requested resource does not exist", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        LOG.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("Internal error", "An unexpected error occurred", null));
    }

    private ResponseEntity<ApiError> badRequest(String error, String message, Map<String, String> fields) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(error, message, fields));
    }
}
