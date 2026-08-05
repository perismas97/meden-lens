CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE task_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(64) NOT NULL UNIQUE,
    complexity VARCHAR(32) NOT NULL,
    max_model_calls INTEGER NOT NULL,
    max_tool_calls INTEGER NOT NULL,
    recommended_input_tokens BIGINT NOT NULL,
    recommended_output_tokens BIGINT NOT NULL,
    recommended_total_tokens BIGINT NOT NULL,
    recommended_duration_ms BIGINT NOT NULL,
    recommended_cost_usd NUMERIC(12, 4) NOT NULL,
    max_retries INTEGER NOT NULL,
    allow_sub_agents BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE execution_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_run_id VARCHAR(160),
    idempotency_key VARCHAR(200) NOT NULL UNIQUE,
    agent_name VARCHAR(160) NOT NULL,
    agent_version VARCHAR(80) NOT NULL,
    task_type VARCHAR(64) NOT NULL,
    task_description TEXT NOT NULL,
    task_complexity VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_ms BIGINT NOT NULL,
    model_calls INTEGER NOT NULL,
    tool_calls INTEGER NOT NULL,
    retry_count INTEGER NOT NULL,
    sub_agent_count INTEGER NOT NULL,
    input_tokens BIGINT NOT NULL,
    output_tokens BIGINT NOT NULL,
    total_tokens BIGINT NOT NULL,
    estimated_cost_usd NUMERIC(12, 4) NOT NULL,
    environment VARCHAR(120),
    team VARCHAR(120),
    purpose VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_execution_runs_task_type
        FOREIGN KEY (task_type) REFERENCES task_profiles(task_type)
);

CREATE INDEX idx_execution_runs_task_type ON execution_runs(task_type);
CREATE INDEX idx_execution_runs_agent_name ON execution_runs(agent_name);
CREATE INDEX idx_execution_runs_created_at ON execution_runs(created_at);

CREATE TABLE model_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID NOT NULL,
    provider VARCHAR(120) NOT NULL,
    model VARCHAR(160) NOT NULL,
    call_count INTEGER NOT NULL,
    input_tokens BIGINT NOT NULL,
    output_tokens BIGINT NOT NULL,
    estimated_cost_usd NUMERIC(12, 4) NOT NULL,
    CONSTRAINT fk_model_usages_execution_run
        FOREIGN KEY (execution_run_id) REFERENCES execution_runs(id) ON DELETE CASCADE
);

CREATE TABLE tool_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID NOT NULL,
    tool_name VARCHAR(160) NOT NULL,
    call_count INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    failure_count INTEGER NOT NULL,
    CONSTRAINT fk_tool_usages_execution_run
        FOREIGN KEY (execution_run_id) REFERENCES execution_runs(id) ON DELETE CASCADE
);

INSERT INTO task_profiles (
    task_type,
    complexity,
    max_model_calls,
    max_tool_calls,
    recommended_input_tokens,
    recommended_output_tokens,
    recommended_total_tokens,
    recommended_duration_ms,
    recommended_cost_usd,
    max_retries,
    allow_sub_agents
) VALUES
(
    'SIMPLE_TRANSFORMATION',
    'LOW',
    1,
    0,
    2000,
    1000,
    3000,
    5000,
    0.0500,
    0,
    false
),
(
    'DOCUMENT_SUMMARY',
    'MEDIUM',
    2,
    1,
    12000,
    3000,
    15000,
    20000,
    0.2500,
    1,
    false
),
(
    'DEEP_RESEARCH',
    'HIGH',
    10,
    30,
    80000,
    20000,
    100000,
    180000,
    3.0000,
    3,
    true
);
