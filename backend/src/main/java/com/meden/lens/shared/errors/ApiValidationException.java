package com.meden.lens.shared.errors;

import java.util.List;

public class ApiValidationException extends RuntimeException {

    private final List<FieldErrorDetail> details;

    public ApiValidationException(String message, List<FieldErrorDetail> details) {
        super(message);
        this.details = details;
    }

    public List<FieldErrorDetail> getDetails() {
        return details;
    }
}
