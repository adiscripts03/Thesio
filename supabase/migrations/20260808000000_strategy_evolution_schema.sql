
CREATE TABLE IF NOT EXISTS strategy_versions (
    id              SERIAL PRIMARY KEY,
    version_label   TEXT UNIQUE NOT NULL,
    parent_version  TEXT REFERENCES strategy_versions(version_label),
    config          JSONB NOT NULL,
    rationale       TEXT NOT NULL,
    risk_tier       TEXT NOT NULL CHECK (risk_tier IN ('low', 'high')),
    status          TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
        'proposed',
        'eval_running',
        'eval_failed',
        'pending_human',
        'rejected',
        'canary',
        'trusted',
        'reverted'
    )),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    promoted_at     TIMESTAMPTZ,
    reverted_at     TIMESTAMPTZ,
    reverted_reason TEXT
);

CREATE TABLE IF NOT EXISTS eval_tasks (
    id              SERIAL PRIMARY KEY,
    task_key        TEXT UNIQUE NOT NULL,
    question        TEXT NOT NULL,
    expected_evidence_types TEXT[],
    injection_test  BOOLEAN NOT NULL DEFAULT false,
    locked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_runs (
    id                  SERIAL PRIMARY KEY,
    strategy_version    TEXT NOT NULL REFERENCES strategy_versions(version_label),
    eval_task_id        INT NOT NULL REFERENCES eval_tasks(id),
    success             BOOLEAN NOT NULL,
    citation_precision  NUMERIC,
    citation_recall     NUMERIC,
    unsupported_claim_rate NUMERIC,
    injection_resisted  BOOLEAN,
    latency_ms          INT,
    cost_usd            NUMERIC,
    trace_ref           TEXT,
    run_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outcome_logs (
    id                  SERIAL PRIMARY KEY,
    strategy_version    TEXT NOT NULL REFERENCES strategy_versions(version_label),
    task_description    TEXT NOT NULL,
    success             BOOLEAN NOT NULL,
    failure_step        TEXT,
    evidence_gap_notes  TEXT,
    injection_attempt_detected BOOLEAN NOT NULL DEFAULT false,
    trace_ref           TEXT,
    run_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS critique_batches (
    id                  SERIAL PRIMARY KEY,
    based_on_strategy   TEXT NOT NULL REFERENCES strategy_versions(version_label),
    outcome_log_ids     INT[] NOT NULL,
    summary             TEXT NOT NULL,
    proposed_version    TEXT REFERENCES strategy_versions(version_label),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_version ON eval_runs(strategy_version);
CREATE INDEX IF NOT EXISTS idx_outcome_logs_version ON outcome_logs(strategy_version);
CREATE INDEX IF NOT EXISTS idx_strategy_status ON strategy_versions(status);
