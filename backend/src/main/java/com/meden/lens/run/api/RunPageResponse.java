package com.meden.lens.run.api;

import java.util.List;

public record RunPageResponse(
    List<RunResponse> items,
    int page,
    int size,
    String sort,
    long totalItems,
    int totalPages,
    boolean first,
    boolean last
) {
}
