package com.meden.lens.run.application;

import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.shared.errors.ApiValidationException;
import com.meden.lens.shared.errors.FieldErrorDetail;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class IdempotencyKeyResolver {

    public String resolve(CreateRunRequest request, String headerIdempotencyKey) {
        String bodyKey = normalize(request.idempotencyKey());
        String headerKey = normalize(headerIdempotencyKey);

        List<FieldErrorDetail> errors = new ArrayList<>();

        if (bodyKey == null && headerKey == null) {
            errors.add(new FieldErrorDetail("idempotencyKey", "must be provided in the request body or Idempotency-Key header"));
        }

        if (bodyKey != null && headerKey != null && !bodyKey.equals(headerKey)) {
            errors.add(new FieldErrorDetail("idempotencyKey", "must match the Idempotency-Key header when both are provided"));
        }

        if (!errors.isEmpty()) {
            throw new ApiValidationException("The execution request is invalid.", errors);
        }

        return headerKey != null ? headerKey : bodyKey;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
