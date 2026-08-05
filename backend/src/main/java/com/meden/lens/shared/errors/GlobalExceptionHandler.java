package com.meden.lens.shared.errors;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        List<FieldErrorDetail> details = exception.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::toFieldErrorDetail)
            .toList();

        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "The execution request is invalid.", details);
    }

    @ExceptionHandler(ApiValidationException.class)
    ResponseEntity<ApiErrorResponse> handleApiValidation(ApiValidationException exception) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", exception.getMessage(), exception.getDetails());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException exception) {
        List<FieldErrorDetail> details = exception.getConstraintViolations()
            .stream()
            .map(violation -> new FieldErrorDetail(violation.getPropertyPath().toString(), violation.getMessage()))
            .toList();

        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "The request contains invalid values.", details);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        return error(
            HttpStatus.BAD_REQUEST,
            "INVALID_JSON",
            "The request body could not be read. Check JSON syntax and enum values.",
            List.of()
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException exception) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage(), List.of());
    }

    private FieldErrorDetail toFieldErrorDetail(FieldError fieldError) {
        return new FieldErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
    }

    private ResponseEntity<ApiErrorResponse> error(
        HttpStatus status,
        String error,
        String message,
        List<FieldErrorDetail> details
    ) {
        ApiErrorResponse response = new ApiErrorResponse(
            Instant.now(),
            status.value(),
            error,
            message,
            details,
            traceId()
        );

        return ResponseEntity.status(status).body(response);
    }

    private String traceId() {
        String traceId = MDC.get("traceId");
        return traceId == null ? UUID.randomUUID().toString() : traceId;
    }
}
