import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSimulatorRun,
  fetchRunPage,
  fetchRunSummary,
  fetchSimulatorScenarios
} from "./api";
import { apiHostLabel } from "./config";
import type {
  AnalysisClassification,
  ExecutionStatus,
  RunListItemResponse,
  RunPageResponse,
  RunSummaryResponse,
  SimulatorScenarioResponse
} from "./types";

const PAGE_SIZE = 9;
const statusFilters: Array<{ label: string; value: ExecutionStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" }
];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency"
});

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short"
});

interface SummarySignal {
  detail: string;
  label: string;
  meter: number;
  note: string;
  tone: "critical" | "good" | "neutral" | "watch";
  value: string;
}

export default function App() {
  const [summary, setSummary] = useState<RunSummaryResponse | null>(null);
  const [runs, setRuns] = useState<RunPageResponse | null>(null);
  const [scenarios, setScenarios] = useState<SimulatorScenarioResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | "ALL">("ALL");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [runningScenarioKey, setRunningScenarioKey] = useState<string | null>(null);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async ({
      pageOverride,
      signal,
      statusOverride
    }: {
      pageOverride?: number;
      signal?: AbortSignal;
      statusOverride?: ExecutionStatus | "ALL";
    } = {}) => {
      setIsLoading(true);
      setError(null);

      const requestedPage = pageOverride ?? page;
      const requestedStatus = statusOverride ?? statusFilter;

      try {
        const [summaryResponse, runPageResponse] = await Promise.all([
          fetchRunSummary(signal),
          fetchRunPage({ page: requestedPage, size: PAGE_SIZE, status: requestedStatus }, signal)
        ]);

        setSummary(summaryResponse);
        setRuns(runPageResponse);
      } catch (dashboardError) {
        if (dashboardError instanceof DOMException && dashboardError.name === "AbortError") {
          return;
        }

        setError(dashboardError instanceof Error ? dashboardError.message : "Request failed");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page, statusFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard({ signal: controller.signal });

    return () => controller.abort();
  }, [loadDashboard]);

  const loadScenarios = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingScenarios(true);
    setScenarioError(null);

    try {
      setScenarios(await fetchSimulatorScenarios(signal));
    } catch (scenariosError) {
      if (scenariosError instanceof DOMException && scenariosError.name === "AbortError") {
        return;
      }

      setScenarioError(scenariosError instanceof Error ? scenariosError.message : "Request failed");
    } finally {
      if (!signal?.aborted) {
        setIsLoadingScenarios(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadScenarios(controller.signal);

    return () => controller.abort();
  }, [loadScenarios]);

  const handleCreateScenarioRun = useCallback(
    async (scenario: SimulatorScenarioResponse) => {
      setRunningScenarioKey(scenario.key);
      setScenarioError(null);
      setSimulationNotice(null);

      try {
        const simulatedRun = await createSimulatorRun(scenario.key);
        setStatusFilter("ALL");
        setPage(0);
        setSimulationNotice(`${simulatedRun.scenarioName} added`);
        await loadDashboard({ pageOverride: 0, statusOverride: "ALL" });
        setSelectedRunId(simulatedRun.run.id);
      } catch (simulationError) {
        setScenarioError(simulationError instanceof Error ? simulationError.message : "Request failed");
      } finally {
        setRunningScenarioKey(null);
      }
    },
    [loadDashboard]
  );

  const items = useMemo(() => runs?.items ?? [], [runs]);
  const selectedRun = useMemo(
    () => items.find((run) => run.id === selectedRunId) ?? items[0] ?? null,
    [items, selectedRunId]
  );
  const metrics = useMemo(() => buildMetrics(summary), [summary]);
  const backendState = error ? "offline" : isLoading ? "loading" : "ready";

  useEffect(() => {
    if (items.length === 0 && selectedRunId !== null) {
      setSelectedRunId(null);
      return;
    }

    if (items.length > 0 && !items.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(items[0].id);
    }
  }, [items, selectedRunId]);

  return (
    <main className="ledger-shell">
      <header className="masthead">
        <div>
          <span className="wordmark">Meden Lens</span>
          <span className="subtitle">proportionality ledger</span>
        </div>
        <div className={`runtime ${backendState}`}>
          <span aria-hidden="true" />
          <strong>{error ? "offline" : isLoading ? "syncing" : "ready"}</strong>
          <code>{apiHostLabel()}</code>
        </div>
      </header>

      <section className="signal-line" aria-label="Run summary">
        {metrics.map((metric) => (
          <article className={`signal ${metric.tone}`} key={metric.label}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
            <span className="signal-note">{metric.note}</span>
            <div className="signal-meter" aria-hidden="true">
              <span style={{ width: `${metric.meter}%` }} />
            </div>
            <em>{metric.detail}</em>
          </article>
        ))}
      </section>

      <section className="workbench">
        <section className="ledger-region" aria-labelledby="runs-heading">
          <div className="ledger-toolbar">
            <div>
              <p className="eyebrow">Run Queue</p>
              <h1 id="runs-heading">Review by exception</h1>
            </div>
            <div className="toolbar-actions">
              <div className="status-filter" aria-label="Status filter" role="group">
                {statusFilters.map((filter) => (
                  <button
                    aria-pressed={statusFilter === filter.value}
                    className={statusFilter === filter.value ? "active" : ""}
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setPage(0);
                      setStatusFilter(filter.value);
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button className="quiet-button" type="button" onClick={() => void loadDashboard()}>
                Refresh
              </button>
            </div>
          </div>

          <SimulatorDock
            error={scenarioError}
            isLoading={isLoadingScenarios}
            notice={simulationNotice}
            runningScenarioKey={runningScenarioKey}
            scenarios={scenarios}
            onRun={handleCreateScenarioRun}
          />

          {error ? <RequestState tone="error" title="API unavailable" detail={error} /> : null}

          {!error && isLoading ? (
            <RequestState title="Loading ledger" detail="Fetching latest summary and runs." />
          ) : null}

          {!error && !isLoading && items.length === 0 ? (
            <RequestState title="No executions" detail="The selected queue is empty." />
          ) : null}

          {!error && !isLoading && items.length > 0 ? (
            <>
              <RunLedger items={items} selectedRunId={selectedRun?.id ?? null} onSelect={setSelectedRunId} />
              <footer className="pagination-bar">
                <span>
                  {formatCount(runs?.totalItems ?? 0)} runs / page {runs ? runs.page + 1 : 1} of{" "}
                  {runs?.totalPages || 1}
                </span>
                <div>
                  <button
                    className="quiet-button"
                    type="button"
                    disabled={runs?.first ?? true}
                    onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 0))}
                  >
                    Previous
                  </button>
                  <button
                    className="quiet-button"
                    type="button"
                    disabled={runs?.last ?? true}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          ) : null}
        </section>

        <RunInspector run={selectedRun} summary={summary} />
      </section>
    </main>
  );
}

function SimulatorDock({
  error,
  isLoading,
  notice,
  onRun,
  runningScenarioKey,
  scenarios
}: {
  error: string | null;
  isLoading: boolean;
  notice: string | null;
  onRun: (scenario: SimulatorScenarioResponse) => void;
  runningScenarioKey: string | null;
  scenarios: SimulatorScenarioResponse[];
}) {
  return (
    <section className="simulator-dock" aria-labelledby="simulator-heading">
      <div className="simulator-heading">
        <div>
          <p className="eyebrow">Simulator</p>
          <h2 id="simulator-heading">Synthetic runs</h2>
        </div>
        {notice ? <span className="simulator-note">{notice}</span> : null}
      </div>

      {error ? <span className="simulator-error">Simulator unavailable: {error}</span> : null}

      {isLoading ? <span className="simulator-muted">Loading scenarios</span> : null}

      {!isLoading && !error && scenarios.length === 0 ? (
        <span className="simulator-muted">No scenarios available</span>
      ) : null}

      {!isLoading && scenarios.length > 0 ? (
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <article className="scenario-row" key={scenario.key}>
              <div>
                <strong>{scenario.name}</strong>
                <span>{scenario.expectedSignal}</span>
              </div>
              <button
                className="quiet-button"
                disabled={runningScenarioKey !== null}
                type="button"
                onClick={() => onRun(scenario)}
              >
                {runningScenarioKey === scenario.key ? "Running" : "Run"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RunLedger({
  items,
  onSelect,
  selectedRunId
}: {
  items: RunListItemResponse[];
  onSelect: (runId: string) => void;
  selectedRunId: string | null;
}) {
  return (
    <div className="table-scroll">
      <table className="run-ledger">
        <thead>
          <tr>
            <th>Time</th>
            <th>Agent</th>
            <th>Task</th>
            <th>Verdict</th>
            <th className="numeric">Score</th>
            <th className="numeric">Cost</th>
            <th className="numeric">Saved</th>
          </tr>
        </thead>
        <tbody>
          {items.map((run) => (
            <tr
              className={selectedRunId === run.id ? "selected" : ""}
              key={run.id}
              tabIndex={0}
              onClick={() => onSelect(run.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(run.id);
                }
              }}
            >
              <td>{formatDate(run.createdAt)}</td>
              <td>
                <strong>{run.agent.name}</strong>
                <small>{run.metadata.team ?? "no team"}</small>
              </td>
              <td>
                <strong>{run.task.type}</strong>
                <small>{run.task.complexity.toLowerCase()}</small>
              </td>
              <td>
                <span className={`verdict ${classificationTone(run.analysis.classification)}`}>
                  {formatClassification(run.analysis.classification)}
                </span>
                <small>{run.execution.status.toLowerCase()}</small>
              </td>
              <td className="numeric score-cell">{run.analysis.balanceScore ?? "-"}</td>
              <td className="numeric">{formatMoney(run.execution.estimatedCostUsd)}</td>
              <td className="numeric">{formatMoney(run.analysis.estimatedCostReductionUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunInspector({
  run,
  summary
}: {
  run: RunListItemResponse | null;
  summary: RunSummaryResponse | null;
}) {
  if (!run) {
    return (
      <aside className="inspector" aria-label="Run inspector">
        <p className="eyebrow">Lens</p>
        <h2>{summary ? highestRisk(summary) : "No signal"}</h2>
        <dl className="fact-list">
          <Fact label="Analyzed" value={summary ? String(summary.analyzedRuns) : "-"} />
          <Fact label="Needs review" value={summary ? String(reviewCount(summary)) : "-"} />
          <Fact label="Cost reduction" value={summary ? formatMoney(summary.estimatedCostReductionUsd) : "-"} />
        </dl>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Run inspector">
      <p className="eyebrow">Selected Run</p>
      <h2>{run.agent.name}</h2>

      <div className={`verdict-block ${classificationTone(run.analysis.classification)}`}>
        <span>{formatClassification(run.analysis.classification)}</span>
        <strong>{run.analysis.balanceScore ?? "-"}</strong>
      </div>

      <dl className="fact-list">
        <Fact label="Task" value={run.task.type} />
        <Fact label="Status" value={run.execution.status.toLowerCase()} />
        <Fact label="Duration" value={formatDuration(run.execution.durationMs)} />
        <Fact label="Tokens" value={formatCount(run.execution.totalTokens)} />
        <Fact label="Model calls" value={formatCount(run.execution.modelCalls)} />
        <Fact label="Tool calls" value={formatCount(run.execution.toolCalls)} />
        <Fact label="Retries" value={formatCount(run.execution.retryCount)} />
        <Fact label="Cost" value={formatMoney(run.execution.estimatedCostUsd)} />
      </dl>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RequestState({
  detail,
  title,
  tone = "muted"
}: {
  detail: string;
  title: string;
  tone?: "muted" | "error";
}) {
  return (
    <div className={`request-state ${tone}`}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function buildMetrics(summary: RunSummaryResponse | null): SummarySignal[] {
  if (!summary) {
    return [
      placeholderMetric("Analysis coverage"),
      placeholderMetric("Exceptions"),
      placeholderMetric("Failed runs"),
      placeholderMetric("Reducible cost")
    ];
  }

  const analyzedPercent = percentage(summary.analyzedRuns, summary.totalRuns);
  const exceptions = reviewCount(summary);
  const exceptionPercent = percentage(exceptions, summary.analyzedRuns);
  const failurePercent = percentage(summary.failedRuns, summary.totalRuns);
  const reduciblePercent = moneyPercentage(
    summary.estimatedCostReductionUsd,
    summary.totalEstimatedCostUsd
  );
  const hasRuns = summary.totalRuns > 0;
  const hasAnalyzedRuns = summary.analyzedRuns > 0;
  const hasObservedSpend = Number(summary.totalEstimatedCostUsd) > 0;
  const coverageDetail = !hasRuns
    ? "no runs submitted"
    : summary.unanalyzedRuns === 0
    ? "all runs scored"
    : `${formatCount(summary.unanalyzedRuns)} waiting`;
  const coverageTone = !hasRuns
    ? "neutral"
    : analyzedPercent >= 90
    ? "good"
    : analyzedPercent >= 60
    ? "neutral"
    : "watch";

  return [
    {
      detail: coverageDetail,
      label: "Analysis coverage",
      meter: analyzedPercent,
      note: `${formatCount(summary.analyzedRuns)} of ${formatCount(summary.totalRuns)} runs`,
      tone: coverageTone,
      value: `${analyzedPercent}%`
    },
    {
      detail: exceptionBreakdown(summary),
      label: "Exceptions",
      meter: exceptionPercent,
      note: hasAnalyzedRuns ? `${exceptionPercent}% of analyzed runs` : "no analyzed runs",
      tone: exceptionTone(summary),
      value: formatCount(exceptions)
    },
    {
      detail: hasRuns ? `${formatCount(summary.successfulRuns)} successful` : "no runs submitted",
      label: "Failed runs",
      meter: failurePercent,
      note: hasRuns ? `${failurePercent}% failure rate` : "no runs submitted",
      tone: summary.failedRuns === 0 ? "good" : failurePercent >= 20 ? "critical" : "watch",
      value: formatCount(summary.failedRuns)
    },
    {
      detail: hasObservedSpend
        ? `${formatMoney(summary.totalEstimatedCostUsd)} observed`
        : "no spend observed",
      label: "Reducible cost",
      meter: reduciblePercent,
      note: hasObservedSpend ? `${reduciblePercent}% of observed cost` : "no spend observed",
      tone: reduciblePercent === 0 ? "good" : reduciblePercent >= 25 ? "critical" : "watch",
      value: formatMoney(summary.estimatedCostReductionUsd)
    }
  ];
}

function placeholderMetric(label: string): SummarySignal {
  return {
    detail: "waiting",
    label,
    meter: 0,
    note: "no signal yet",
    tone: "neutral",
    value: "-"
  };
}

function formatMoney(value: string | null | undefined) {
  const amount = Number(value ?? 0);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds} sec`;
  }

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatClassification(classification: AnalysisClassification | null) {
  if (!classification) {
    return "Not analyzed";
  }

  return classification
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function classificationTone(classification: AnalysisClassification | null) {
  if (!classification) {
    return "muted";
  }

  if (classification === "PROPORTIONAL" || classification === "ACCEPTABLE") {
    return "positive";
  }

  if (classification === "SLIGHTLY_EXCESSIVE") {
    return "warning";
  }

  return "critical";
}

function scoreBand(score: number) {
  if (score >= 85) {
    return "strong";
  }

  if (score >= 70) {
    return "acceptable";
  }

  if (score >= 50) {
    return "watch";
  }

  return "review";
}

function reviewCount(summary: RunSummaryResponse) {
  return (
    summary.slightlyExcessiveRuns +
    summary.disproportionateRuns +
    summary.highlyDisproportionateRuns
  );
}

function highestRisk(summary: RunSummaryResponse) {
  if (summary.highlyDisproportionateRuns > 0) {
    return "Highly disproportionate";
  }

  if (summary.disproportionateRuns > 0) {
    return "Disproportionate";
  }

  if (summary.slightlyExcessiveRuns > 0) {
    return "Slightly excessive";
  }

  if (summary.failedRuns > 0) {
    return "Failed runs";
  }

  return "Stable";
}

function exceptionBreakdown(summary: RunSummaryResponse) {
  const parts = [
    [summary.highlyDisproportionateRuns, "highly"],
    [summary.disproportionateRuns, "disproportionate"],
    [summary.slightlyExcessiveRuns, "slight"]
  ]
    .filter(([count]) => Number(count) > 0)
    .map(([count, label]) => `${formatCount(Number(count))} ${label}`);

  return parts.length > 0 ? parts.join(" / ") : "no excess classifications";
}

function exceptionTone(summary: RunSummaryResponse): SummarySignal["tone"] {
  if (summary.highlyDisproportionateRuns > 0 || summary.disproportionateRuns > 0) {
    return "critical";
  }

  if (summary.slightlyExcessiveRuns > 0) {
    return "watch";
  }

  return "good";
}

function moneyPercentage(part: string | null | undefined, total: string | null | undefined) {
  return percentage(Number(part ?? 0), Number(total ?? 0));
}

function percentage(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((part / total) * 100));
}
