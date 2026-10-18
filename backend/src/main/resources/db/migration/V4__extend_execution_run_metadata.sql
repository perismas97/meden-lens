-- Provenance cannot be reconstructed for existing rows, so they intentionally
-- retain the legacy API classification. New simulator runs are assigned DEMO
-- by the application service after this migration.
ALTER TABLE execution_runs
    ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT 'API',
    ADD COLUMN workflow_key VARCHAR(120),
    ADD COLUMN workflow_version VARCHAR(80),
    ADD COLUMN prompt_version VARCHAR(80),
    ADD COLUMN input_size_value BIGINT,
    ADD COLUMN input_size_unit VARCHAR(32),
    ADD COLUMN input_fingerprint VARCHAR(64),
    ADD COLUMN trace_id VARCHAR(32),
    ADD COLUMN outcome_status VARCHAR(32) NOT NULL DEFAULT 'NOT_EVALUATED';

ALTER TABLE model_usages
    ADD COLUMN model_version VARCHAR(160);

ALTER TABLE execution_runs
    ADD CONSTRAINT chk_execution_runs_workflow_metadata
        CHECK (
            (workflow_key IS NULL AND workflow_version IS NULL AND prompt_version IS NULL)
            OR
            (workflow_key IS NOT NULL AND workflow_version IS NOT NULL AND prompt_version IS NOT NULL)
        ),
    ADD CONSTRAINT chk_execution_runs_input_metadata
        CHECK (
            (input_size_value IS NULL AND input_size_unit IS NULL AND input_fingerprint IS NULL)
            OR
            (input_size_value IS NOT NULL AND input_size_unit IS NOT NULL AND input_fingerprint IS NOT NULL)
        ),
    ADD CONSTRAINT chk_execution_runs_input_size
        CHECK (input_size_value IS NULL OR input_size_value >= 0),
    ADD CONSTRAINT chk_execution_runs_input_fingerprint
        CHECK (input_fingerprint IS NULL OR input_fingerprint ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_execution_runs_trace_id
        CHECK (trace_id IS NULL OR trace_id ~ '^[0-9a-f]{32}$');

CREATE INDEX idx_execution_runs_source ON execution_runs(source);
CREATE INDEX idx_execution_runs_workflow_key ON execution_runs(workflow_key);
CREATE INDEX idx_execution_runs_input_fingerprint ON execution_runs(input_fingerprint);
CREATE INDEX idx_execution_runs_trace_id ON execution_runs(trace_id);
