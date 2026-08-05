CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID NOT NULL UNIQUE,
    balance_score INTEGER NOT NULL,
    classification VARCHAR(64) NOT NULL,
    cost_efficiency_score INTEGER NOT NULL,
    token_efficiency_score INTEGER NOT NULL,
    tool_efficiency_score INTEGER NOT NULL,
    model_call_efficiency_score INTEGER NOT NULL,
    latency_efficiency_score INTEGER NOT NULL,
    retry_efficiency_score INTEGER NOT NULL,
    autonomy_efficiency_score INTEGER NOT NULL,
    estimated_cost_reduction_usd NUMERIC(12, 4) NOT NULL,
    estimated_savings_percent NUMERIC(8, 2) NOT NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_analyses_execution_run
        FOREIGN KEY (execution_run_id) REFERENCES execution_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_analyses_classification ON analyses(classification);
CREATE INDEX idx_analyses_analyzed_at ON analyses(analyzed_at);

CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL,
    code VARCHAR(80) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    actual_value VARCHAR(120),
    expected_value VARCHAR(120),
    explanation TEXT,
    CONSTRAINT fk_findings_analysis
        FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX idx_findings_analysis_id ON findings(analysis_id);
CREATE INDEX idx_findings_code ON findings(code);
CREATE INDEX idx_findings_severity ON findings(severity);

CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL,
    code VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    estimated_impact VARCHAR(32) NOT NULL,
    related_finding_code VARCHAR(80),
    CONSTRAINT fk_recommendations_analysis
        FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX idx_recommendations_analysis_id ON recommendations(analysis_id);
CREATE INDEX idx_recommendations_code ON recommendations(code);
