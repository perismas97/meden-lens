import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createSimulatorRun,
  fetchRun,
  fetchRunAnalysis,
  fetchRunPage,
  fetchRunSummary,
  fetchSimulatorScenarios,
  fetchTaskProfiles
} from "./api";
import {
  comparisonMeterWidth,
  comparisonRatioLabel,
  comparisonTone
} from "./comparison";
import { apiHostLabel } from "./config";
import { formatCount, formatDate, formatDuration, formatEnum, formatMoney } from "./formatters";
import { runDetailPath, runIdFromRoute } from "./run-route";
import type {
  AnalysisClassification,
  AnalysisResponse,
  ExecutionStatus,
  FindingSeverity,
  RunListItemResponse,
  RunPageResponse,
  RunResponse,
  RunSummaryResponse,
  SimulatorScenarioResponse,
  TaskProfileResponse
} from "./types";

const PAGE_SIZE = 9;
const statusFilters: Array<{ label: string; value: ExecutionStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" }
];

interface SummarySignal {
  detail: string;
  label: string;
  meter: number;
  note: string;
  tone: "critical" | "good" | "neutral" | "watch";
  value: string;
}

interface ComparisonMetric {
  actual: number;
  actualLabel: string;
  expected: number;
  expectedLabel: string;
  kind: "ceiling" | "target";
  label: string;
}

export default function App() {
  const navigate = useNavigate();
  const { runId: routeRunIdParameter } = useParams<{ runId: string }>();
  const routeRunId = runIdFromRoute(routeRunIdParameter);
  const isRunRoute = routeRunIdParameter !== undefined;
  const hasInvalidRouteRunId = isRunRoute && routeRunId === null;
  const [summary, setSummary] = useState<RunSummaryResponse | null>(null);
  const [runs, setRuns] = useState<RunPageResponse | null>(null);
  const [scenarios, setScenarios] = useState<SimulatorScenarioResponse[]>([]);
  const [taskProfiles, setTaskProfiles] = useState<TaskProfileResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | "ALL">("ALL");
  const [taskTypeFilter, setTaskTypeFilter] = useState("ALL");
  const [teamFilter, setTeamFilter] = useState("");
  const [teamDraft, setTeamDraft] = useState("");
  const [routedRun, setRoutedRun] = useState<RunListItemResponse | null>(null);
  const [analysisDetails, setAnalysisDetails] = useState<AnalysisResponse | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [isLoadingTaskProfiles, setIsLoadingTaskProfiles] = useState(true);
  const [isLoadingRoutedRun, setIsLoadingRoutedRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scenarioLoadError, setScenarioLoadError] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [taskProfileError, setTaskProfileError] = useState<string | null>(null);
  const [routedRunError, setRoutedRunError] = useState<string | null>(null);
  const [analysisRetryKey, setAnalysisRetryKey] = useState(0);
  const [runningScenarioKey, setRunningScenarioKey] = useState<string | null>(null);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async ({
      pageOverride,
      signal,
      statusOverride,
      taskTypeOverride,
      teamOverride
    }: {
      pageOverride?: number;
      signal?: AbortSignal;
      statusOverride?: ExecutionStatus | "ALL";
      taskTypeOverride?: string;
      teamOverride?: string;
    } = {}) => {
      setIsLoading(true);
      setError(null);
      setIsBackendOffline(false);

      const requestedPage = pageOverride ?? page;
      const requestedStatus = statusOverride ?? statusFilter;
      const requestedTaskType = taskTypeOverride ?? taskTypeFilter;
      const requestedTeam = teamOverride ?? teamFilter;

      try {
        const [summaryResponse, runPageResponse] = await Promise.all([
          fetchRunSummary(signal),
          fetchRunPage(
            {
              page: requestedPage,
              size: PAGE_SIZE,
              status: requestedStatus,
              taskType: requestedTaskType,
              team: requestedTeam
            },
            signal
          )
        ]);

        setSummary(summaryResponse);
        setRuns(runPageResponse);
      } catch (dashboardError) {
        if (dashboardError instanceof DOMException && dashboardError.name === "AbortError") {
          return;
        }

        setIsBackendOffline(isConnectionFailure(dashboardError));
        setError(requestFailureMessage(dashboardError));
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page, statusFilter, taskTypeFilter, teamFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard({ signal: controller.signal });

    return () => controller.abort();
  }, [loadDashboard]);

  const loadTaskProfiles = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingTaskProfiles(true);
    setTaskProfileError(null);

    try {
      setTaskProfiles(await fetchTaskProfiles(signal));
    } catch (profilesError) {
      if (profilesError instanceof DOMException && profilesError.name === "AbortError") {
        return;
      }

      setTaskProfileError(requestFailureMessage(profilesError));
    } finally {
      if (!signal?.aborted) {
        setIsLoadingTaskProfiles(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTaskProfiles(controller.signal);

    return () => controller.abort();
  }, [loadTaskProfiles]);

  const loadScenarios = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingScenarios(true);
    setScenarioLoadError(null);

    try {
      setScenarios(await fetchSimulatorScenarios(signal));
    } catch (scenariosError) {
      if (scenariosError instanceof DOMException && scenariosError.name === "AbortError") {
        return;
      }

      setScenarioLoadError(requestFailureMessage(scenariosError));
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
      setSimulationError(null);
      setSimulationNotice(null);

      try {
        const simulatedRun = await createSimulatorRun(scenario.key);
        setStatusFilter("ALL");
        setTaskTypeFilter("ALL");
        setTeamFilter("");
        setTeamDraft("");
        setPage(0);
        setSimulationNotice(`${simulatedRun.scenarioName} added`);
        await loadDashboard({
          pageOverride: 0,
          statusOverride: "ALL",
          taskTypeOverride: "ALL",
          teamOverride: ""
        });
        navigate(runDetailPath(simulatedRun.run.id));
      } catch (simulationError) {
        setSimulationError(requestFailureMessage(simulationError));
      } finally {
        setRunningScenarioKey(null);
      }
    },
    [loadDashboard, navigate]
  );

  const items = useMemo(() => runs?.items ?? [], [runs]);
  const listedRoutedRun = useMemo(
    () => (routeRunId ? items.find((run) => run.id === routeRunId) ?? null : null),
    [items, routeRunId]
  );
  const selectedRun = useMemo(
    () =>
      isRunRoute
        ? listedRoutedRun ?? (routedRun?.id === routeRunId ? routedRun : null)
        : items[0] ?? null,
    [isRunRoute, items, listedRoutedRun, routeRunId, routedRun]
  );
  const selectedTaskProfile = useMemo(
    () =>
      selectedRun
        ? taskProfiles.find((profile) => profile.taskType === selectedRun.task.type) ?? null
        : null,
    [selectedRun, taskProfiles]
  );
  const selectedRunIdForAnalysis = selectedRun?.id ?? null;
  const selectedRunAnalyzed = selectedRun?.analysis.analyzed ?? false;
  const metrics = useMemo(() => buildMetrics(summary), [summary]);
  const backendState = isBackendOffline ? "offline" : error ? "degraded" : isLoading ? "loading" : "ready";
  const hasActiveFilters =
    statusFilter !== "ALL" || taskTypeFilter !== "ALL" || teamFilter.length > 0;

  useEffect(() => {
    if (!routeRunId || listedRoutedRun) {
      setRoutedRun(null);
      setRoutedRunError(null);
      setIsLoadingRoutedRun(false);
      return;
    }

    const controller = new AbortController();

    setRoutedRun(null);
    setRoutedRunError(null);
    setIsLoadingRoutedRun(true);

    Promise.all([
      fetchRun(routeRunId, controller.signal),
      fetchRunAnalysis(routeRunId, controller.signal).catch((routeAnalysisError) => {
        if (isNotFoundError(routeAnalysisError)) {
          return null;
        }

        throw routeAnalysisError;
      })
    ])
      .then(([run, analysis]) => {
        setRoutedRun(toRunListItem(run, analysis));
        setAnalysisDetails(analysis);
      })
      .catch((routeRunLoadError) => {
        if (routeRunLoadError instanceof DOMException && routeRunLoadError.name === "AbortError") {
          return;
        }

        setRoutedRunError(requestFailureMessage(routeRunLoadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingRoutedRun(false);
        }
      });

    return () => controller.abort();
  }, [listedRoutedRun, routeRunId]);

  useEffect(() => {
    if (!selectedRunIdForAnalysis || !selectedRunAnalyzed) {
      setAnalysisDetails(null);
      setAnalysisError(null);
      setIsLoadingAnalysis(false);
      return;
    }

    if (analysisDetails?.runId === selectedRunIdForAnalysis) {
      setAnalysisError(null);
      setIsLoadingAnalysis(false);
      return;
    }

    const controller = new AbortController();

    setIsLoadingAnalysis(true);
    setAnalysisError(null);

    fetchRunAnalysis(selectedRunIdForAnalysis, controller.signal)
      .then((analysis) => setAnalysisDetails(analysis))
      .catch((runAnalysisError) => {
        if (runAnalysisError instanceof DOMException && runAnalysisError.name === "AbortError") {
          return;
        }

        setAnalysisDetails(null);
        setAnalysisError(runAnalysisError instanceof Error ? runAnalysisError.message : "Request failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingAnalysis(false);
        }
      });

    return () => controller.abort();
  }, [analysisDetails?.runId, analysisRetryKey, selectedRunAnalyzed, selectedRunIdForAnalysis]);

  const handleStatusFilterChange = useCallback((nextStatus: ExecutionStatus | "ALL") => {
    setPage(0);
    setStatusFilter(nextStatus);
  }, []);

  const handleTaskTypeFilterChange = useCallback((nextTaskType: string) => {
    setPage(0);
    setTaskTypeFilter(nextTaskType);
  }, []);

  const applyTeamFilter = useCallback(() => {
    setPage(0);
    setTeamFilter(teamDraft.trim());
  }, [teamDraft]);

  const clearFilters = useCallback(() => {
    setPage(0);
    setStatusFilter("ALL");
    setTaskTypeFilter("ALL");
    setTeamFilter("");
    setTeamDraft("");
  }, []);

  return (
    <main className="ledger-shell">
      <header className="masthead">
        <div>
          <span className="wordmark">Meden Lens</span>
          <span className="subtitle">proportionality ledger</span>
        </div>
        <div className={`runtime ${backendState}`}>
          <span aria-hidden="true" />
          <strong>{backendState === "loading" ? "syncing" : backendState}</strong>
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

      <TaskProfileBudgetView
        error={taskProfileError}
        isLoading={isLoadingTaskProfiles}
        onRetry={() => void loadTaskProfiles()}
        taskProfiles={taskProfiles}
      />

      <section className="workbench">
        <section className="ledger-region" aria-labelledby="runs-heading">
          <div className="ledger-toolbar">
            <div>
              <p className="eyebrow">Run Queue</p>
              <h1 id="runs-heading">Review by exception</h1>
            </div>
            <div className="toolbar-actions">
              <button className="quiet-button" type="button" onClick={() => void loadDashboard()}>
                Refresh
              </button>
            </div>
          </div>

          <RunFilters
            statusFilter={statusFilter}
            taskProfileError={taskProfileError}
            taskProfiles={taskProfiles}
            taskTypeFilter={taskTypeFilter}
            teamDraft={teamDraft}
            teamFilter={teamFilter}
            onApplyTeamFilter={applyTeamFilter}
            onClearFilters={clearFilters}
            onStatusFilterChange={handleStatusFilterChange}
            onTaskTypeFilterChange={handleTaskTypeFilterChange}
            onTeamDraftChange={setTeamDraft}
          />

          <SimulatorDock
            catalogError={scenarioLoadError}
            isLoading={isLoadingScenarios}
            notice={simulationNotice}
            onRetry={() => void loadScenarios()}
            runningScenarioKey={runningScenarioKey}
            scenarios={scenarios}
            simulationError={simulationError}
            onRun={handleCreateScenarioRun}
          />

          {error ? (
            <RequestState
              actionLabel="Retry"
              detail={
                isBackendOffline
                  ? `No response from ${apiHostLabel()}. Confirm that the backend is running and try again.`
                  : `The API request failed: ${error}`
              }
              eyebrow={isBackendOffline ? "Connection" : "Request failed"}
              onAction={() => void loadDashboard()}
              tone="error"
              title={isBackendOffline ? "Backend unavailable" : "Run data unavailable"}
            />
          ) : null}

          {!error && isLoading ? (
            <RequestState
              detail="Fetching the latest run summary and execution records."
              eyebrow="Synchronizing"
              title="Loading run ledger"
            />
          ) : null}

          {!error && !isLoading && items.length === 0 ? (
            <RequestState
              actionLabel={hasActiveFilters ? "Clear filters" : undefined}
              detail={
                hasActiveFilters
                  ? "No recorded runs satisfy the current status, task, and team filters."
                  : "No execution runs have been recorded yet. Simulator runs and API submissions will appear here."
              }
              eyebrow={hasActiveFilters ? "Filtered queue" : "Empty ledger"}
              onAction={hasActiveFilters ? clearFilters : undefined}
              title={hasActiveFilters ? "No runs match these filters" : "No runs recorded"}
            />
          ) : null}

          {!error && !isLoading && items.length > 0 ? (
            <>
              <RunLedger
                items={items}
                selectedRunId={selectedRun?.id ?? null}
                onSelect={(runId) => navigate(runDetailPath(runId))}
              />
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

        {hasInvalidRouteRunId ? (
          <RunRouteState
            detail="The URL does not contain a valid execution run ID."
            onBack={() => navigate("/")}
            title="Invalid run link"
          />
        ) : routedRunError ? (
          <RunRouteState
            detail={`The requested run could not be loaded: ${routedRunError}`}
            onBack={() => navigate("/")}
            title="Run unavailable"
          />
        ) : isLoadingRoutedRun && !listedRoutedRun ? (
          <RunRouteState detail="Fetching the requested execution run." title="Loading run" />
        ) : (
          <RunInspector
            analysis={analysisDetails}
            analysisError={analysisError}
            isLoadingAnalysis={isLoadingAnalysis}
            onRetryAnalysis={() => setAnalysisRetryKey((currentKey) => currentKey + 1)}
            run={selectedRun}
            summary={summary}
            taskProfile={selectedTaskProfile}
          />
        )}
      </section>
    </main>
  );
}

function TaskProfileBudgetView({
  error,
  isLoading,
  onRetry,
  taskProfiles
}: {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
  taskProfiles: TaskProfileResponse[];
}) {
  return (
    <section className="budget-reference" aria-labelledby="budget-reference-heading">
      <div className="budget-reference-heading">
        <div>
          <p className="eyebrow">Scoring Reference</p>
          <h2 id="budget-reference-heading">Task profile budgets</h2>
        </div>
        <span>Recommended targets and execution ceilings</span>
      </div>

      {error ? (
        <div className="inline-failure budget-reference-state">
          <span>
            <strong>Task profiles unavailable</strong>
            {error}
          </span>
          <button className="quiet-button" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? <span className="budget-reference-state">Loading task profiles</span> : null}

      {!isLoading && !error && taskProfiles.length === 0 ? (
        <span className="budget-reference-state">No task profiles configured</span>
      ) : null}

      {!isLoading && !error && taskProfiles.length > 0 ? (
        <div className="budget-table-scroll">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Task profile</th>
                <th>Token target</th>
                <th>Cost target</th>
                <th>Duration target</th>
                <th>Call ceilings</th>
                <th>Retry ceiling</th>
                <th>Sub-agents</th>
              </tr>
            </thead>
            <tbody>
              {taskProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <strong>{formatEnum(profile.taskType)}</strong>
                    <small>{formatEnum(profile.complexity)} complexity</small>
                  </td>
                  <td>
                    <strong>{formatCount(profile.recommendedTotalTokens)}</strong>
                    <small>
                      {formatCount(profile.recommendedInputTokens)} in /{" "}
                      {formatCount(profile.recommendedOutputTokens)} out
                    </small>
                  </td>
                  <td className="budget-mono">{formatMoney(profile.recommendedCostUsd)}</td>
                  <td className="budget-mono">{formatDuration(profile.recommendedDurationMs)}</td>
                  <td>
                    <strong>{formatCount(profile.maxModelCalls)} model</strong>
                    <small>{formatCount(profile.maxToolCalls)} tool</small>
                  </td>
                  <td className="budget-mono">{formatCount(profile.maxRetries)}</td>
                  <td>{profile.allowSubAgents ? "Allowed" : "Not allowed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function RunFilters({
  onApplyTeamFilter,
  onClearFilters,
  onStatusFilterChange,
  onTaskTypeFilterChange,
  onTeamDraftChange,
  statusFilter,
  taskProfileError,
  taskProfiles,
  taskTypeFilter,
  teamDraft,
  teamFilter
}: {
  onApplyTeamFilter: () => void;
  onClearFilters: () => void;
  onStatusFilterChange: (status: ExecutionStatus | "ALL") => void;
  onTaskTypeFilterChange: (taskType: string) => void;
  onTeamDraftChange: (team: string) => void;
  statusFilter: ExecutionStatus | "ALL";
  taskProfileError: string | null;
  taskProfiles: TaskProfileResponse[];
  taskTypeFilter: string;
  teamDraft: string;
  teamFilter: string;
}) {
  const taskTypes = Array.from(new Set(taskProfiles.map((profile) => profile.taskType))).sort();
  const hasActiveFilters = statusFilter !== "ALL" || taskTypeFilter !== "ALL" || teamFilter.length > 0;
  const hasDraftTeamChange = teamDraft.trim() !== teamFilter;

  return (
    <form
      className="filter-strip"
      onSubmit={(event) => {
        event.preventDefault();
        onApplyTeamFilter();
      }}
    >
      <div className="filter-field">
        <span>Status</span>
        <div className="status-filter" aria-label="Status filter" role="group">
          {statusFilters.map((filter) => (
            <button
              aria-pressed={statusFilter === filter.value}
              className={statusFilter === filter.value ? "active" : ""}
              key={filter.value}
              type="button"
              onClick={() => onStatusFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <label className="filter-field">
        <span>Task</span>
        <select value={taskTypeFilter} onChange={(event) => onTaskTypeFilterChange(event.target.value)}>
          <option value="ALL">All task types</option>
          {taskTypes.map((taskType) => (
            <option key={taskType} value={taskType}>
              {formatEnum(taskType)}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span>Team</span>
        <input
          placeholder="demo"
          value={teamDraft}
          onChange={(event) => onTeamDraftChange(event.target.value)}
        />
      </label>

      <div className="filter-actions">
        <button className="quiet-button" type="submit" disabled={!hasDraftTeamChange}>
          Apply
        </button>
        <button
          className="quiet-button"
          type="button"
          disabled={!hasActiveFilters && teamDraft.length === 0}
          onClick={onClearFilters}
        >
          Clear
        </button>
      </div>

      <span className={taskProfileError ? "filter-message error" : "filter-message"}>
        {taskProfileError
          ? `Task profiles unavailable: ${taskProfileError}`
          : hasActiveFilters
          ? activeFilterLabel(statusFilter, taskTypeFilter, teamFilter)
          : "Showing all audited runs"}
      </span>
    </form>
  );
}

function SimulatorDock({
  catalogError,
  isLoading,
  notice,
  onRetry,
  onRun,
  runningScenarioKey,
  scenarios,
  simulationError
}: {
  catalogError: string | null;
  isLoading: boolean;
  notice: string | null;
  onRetry: () => void;
  onRun: (scenario: SimulatorScenarioResponse) => void;
  runningScenarioKey: string | null;
  scenarios: SimulatorScenarioResponse[];
  simulationError: string | null;
}) {
  return (
    <section className="simulator-dock" aria-labelledby="simulator-heading">
      <div className="simulator-heading">
        <div>
          <p className="eyebrow">Simulator</p>
          <h2 id="simulator-heading">Synthetic runs</h2>
        </div>
        <span className="simulator-note">
          {notice ?? "Each scenario isolates one scoring decision"}
        </span>
      </div>

      {catalogError ? (
        <div className="inline-failure">
          <span>
            <strong>Scenario catalog unavailable</strong>
            {catalogError}
          </span>
          <button className="quiet-button" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {simulationError ? (
        <span className="simulator-error">Scenario run failed: {simulationError}. Run it again to retry.</span>
      ) : null}

      {isLoading ? <span className="simulator-muted">Loading scenarios</span> : null}

      {!isLoading && !catalogError && scenarios.length === 0 ? (
        <span className="simulator-muted">No scenarios available</span>
      ) : null}

      {!isLoading && !catalogError && scenarios.length > 0 ? (
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <article className="scenario-row" key={scenario.key}>
              <div className="scenario-identity">
                <strong>{scenario.name}</strong>
                <code>{scenario.key}</code>
              </div>
              <div className="scenario-purpose">
                <p>{scenario.description}</p>
                <span>
                  <b>Product signal</b>
                  {scenario.expectedSignal}
                </span>
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
  analysis,
  analysisError,
  isLoadingAnalysis,
  onRetryAnalysis,
  run,
  summary,
  taskProfile
}: {
  analysis: AnalysisResponse | null;
  analysisError: string | null;
  isLoadingAnalysis: boolean;
  onRetryAnalysis: () => void;
  run: RunListItemResponse | null;
  summary: RunSummaryResponse | null;
  taskProfile: TaskProfileResponse | null;
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
      </dl>

      <MetricComparison run={run} taskProfile={taskProfile} />

      <AnalysisDetail
        analysis={analysis}
        error={analysisError}
        isAnalyzed={run.analysis.analyzed}
        isLoading={isLoadingAnalysis}
        onRetry={onRetryAnalysis}
      />
    </aside>
  );
}

function RunRouteState({
  detail,
  onBack,
  title
}: {
  detail: string;
  onBack?: () => void;
  title: string;
}) {
  return (
    <aside className="inspector" aria-label="Run route status">
      <p className="eyebrow">Selected Run</p>
      <h2>{title}</h2>
      <p className="analysis-empty">{detail}</p>
      {onBack ? (
        <button className="quiet-button" type="button" onClick={onBack}>
          Back to ledger
        </button>
      ) : null}
    </aside>
  );
}

function MetricComparison({
  run,
  taskProfile
}: {
  run: RunListItemResponse;
  taskProfile: TaskProfileResponse | null;
}) {
  if (!taskProfile) {
    return (
      <section className="metric-comparison" aria-label="Actual versus expected metrics">
        <div className="section-heading">
          <span>Actual vs expected</span>
        </div>
        <p className="analysis-empty">No matching task profile is available for this run.</p>
      </section>
    );
  }

  const metrics = buildComparisonMetrics(run, taskProfile);

  return (
    <section className="metric-comparison" aria-labelledby="metric-comparison-heading">
      <div className="section-heading">
        <span id="metric-comparison-heading">Actual vs expected</span>
        <small>{formatEnum(taskProfile.taskType)}</small>
      </div>

      <div className="comparison-list">
        {metrics.map((metric) => {
          const tone = comparisonTone(metric.actual, metric.expected);

          return (
            <article className={`comparison-row ${tone}`} key={metric.label}>
              <div className="comparison-heading">
                <span>{metric.label}</span>
                <small>{comparisonRatioLabel(metric.actual, metric.expected)}</small>
              </div>
              <div className="comparison-values">
                <span>
                  <small>Actual</small>
                  <strong>{metric.actualLabel}</strong>
                </span>
                <span>
                  <small>{metric.kind === "target" ? "Target" : "Ceiling"}</small>
                  <strong>{metric.expectedLabel}</strong>
                </span>
              </div>
              <div className="comparison-track" aria-hidden="true">
                <span style={{ width: `${comparisonMeterWidth(metric.actual, metric.expected)}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AnalysisDetail({
  analysis,
  error,
  isAnalyzed,
  isLoading,
  onRetry
}: {
  analysis: AnalysisResponse | null;
  error: string | null;
  isAnalyzed: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (!isAnalyzed) {
    return (
      <section className="analysis-detail" aria-label="Analysis details">
        <p className="analysis-empty">Analysis has not been created for this run.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="analysis-detail" aria-label="Analysis details">
        <p className="analysis-empty">Loading analysis details.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="analysis-detail" aria-label="Analysis details">
        <div className="inline-failure">
          <span>
            <strong>Analysis unavailable</strong>
            {error}
          </span>
          <button className="quiet-button" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <section className="analysis-detail" aria-label="Analysis details">
      <div className="analysis-meta">
        <span>Estimated reduction</span>
        <strong>{formatMoney(analysis.estimatedSavings.estimatedCostReductionUsd)}</strong>
      </div>

      <div className="analysis-section">
        <div className="section-heading">
          <span>Findings</span>
          <small>{analysis.findings.length}</small>
        </div>

        {analysis.findings.length === 0 ? (
          <p className="analysis-empty">No findings recorded.</p>
        ) : (
          <div className="finding-list">
            {analysis.findings.map((finding) => (
              <article className="finding-row" key={finding.id}>
                <div className="finding-meta">
                  <span className={`severity ${severityTone(finding.severity)}`}>
                    {formatSeverity(finding.severity)}
                  </span>
                  <small>{formatEnum(finding.code)}</small>
                </div>
                <p>{finding.message}</p>
                {finding.explanation ? <em>{finding.explanation}</em> : null}
                {finding.actualValue || finding.expectedValue ? (
                  <span className="finding-values">
                    {finding.actualValue ?? "-"} actual / {finding.expectedValue ?? "-"} expected
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="analysis-section">
        <div className="section-heading">
          <span>Recommendations</span>
          <small>{analysis.recommendations.length}</small>
        </div>

        {analysis.recommendations.length === 0 ? (
          <p className="analysis-empty">No recommendations recorded.</p>
        ) : (
          <div className="recommendation-list">
            {analysis.recommendations.map((recommendation) => (
              <article className="recommendation-row" key={recommendation.id}>
                <div className="finding-meta">
                  <span className={`impact ${recommendation.estimatedImpact.toLowerCase()}`}>
                    {formatEnum(recommendation.estimatedImpact)}
                  </span>
                  <small>{formatEnum(recommendation.code)}</small>
                </div>
                <p>{recommendation.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
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
  actionLabel,
  detail,
  eyebrow,
  onAction,
  title,
  tone = "muted"
}: {
  actionLabel?: string;
  detail: string;
  eyebrow: string;
  onAction?: () => void;
  title: string;
  tone?: "muted" | "error";
}) {
  return (
    <div className={`request-state ${tone}`}>
      <div>
        <small>{eyebrow}</small>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      {actionLabel && onAction ? (
        <button className="quiet-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function isConnectionFailure(requestError: unknown) {
  return requestError instanceof TypeError;
}

function requestFailureMessage(requestError: unknown) {
  if (isConnectionFailure(requestError)) {
    return "Could not reach the backend service";
  }

  return requestError instanceof Error ? requestError.message : "Unexpected request failure";
}

function isNotFoundError(requestError: unknown) {
  return requestError instanceof Error && requestError.message.startsWith("404 ");
}

function toRunListItem(
  run: RunResponse,
  analysis: AnalysisResponse | null
): RunListItemResponse {
  return {
    id: run.id,
    externalRunId: run.externalRunId,
    agent: run.agent,
    task: run.task,
    execution: run.execution,
    metadata: run.metadata,
    createdAt: run.createdAt,
    analysis: {
      analyzed: analysis !== null,
      balanceScore: analysis?.balanceScore ?? null,
      classification: analysis?.classification ?? null,
      estimatedCostReductionUsd: analysis
        ? String(analysis.estimatedSavings.estimatedCostReductionUsd)
        : null
    }
  };
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

function buildComparisonMetrics(
  run: RunListItemResponse,
  taskProfile: TaskProfileResponse
): ComparisonMetric[] {
  const actualCost = Number(run.execution.estimatedCostUsd);
  const expectedCost = Number(taskProfile.recommendedCostUsd);

  return [
    {
      actual: run.execution.totalTokens,
      actualLabel: formatCount(run.execution.totalTokens),
      expected: taskProfile.recommendedTotalTokens,
      expectedLabel: formatCount(taskProfile.recommendedTotalTokens),
      kind: "target",
      label: "Tokens"
    },
    {
      actual: Number.isFinite(actualCost) ? actualCost : 0,
      actualLabel: formatMoney(actualCost),
      expected: Number.isFinite(expectedCost) ? expectedCost : 0,
      expectedLabel: formatMoney(expectedCost),
      kind: "target",
      label: "Cost"
    },
    {
      actual: run.execution.durationMs,
      actualLabel: formatDuration(run.execution.durationMs),
      expected: taskProfile.recommendedDurationMs,
      expectedLabel: formatDuration(taskProfile.recommendedDurationMs),
      kind: "target",
      label: "Duration"
    },
    {
      actual: run.execution.modelCalls,
      actualLabel: formatCount(run.execution.modelCalls),
      expected: taskProfile.maxModelCalls,
      expectedLabel: formatCount(taskProfile.maxModelCalls),
      kind: "ceiling",
      label: "Model calls"
    },
    {
      actual: run.execution.toolCalls,
      actualLabel: formatCount(run.execution.toolCalls),
      expected: taskProfile.maxToolCalls,
      expectedLabel: formatCount(taskProfile.maxToolCalls),
      kind: "ceiling",
      label: "Tool calls"
    },
    {
      actual: run.execution.retryCount,
      actualLabel: formatCount(run.execution.retryCount),
      expected: taskProfile.maxRetries,
      expectedLabel: formatCount(taskProfile.maxRetries),
      kind: "ceiling",
      label: "Retries"
    }
  ];
}

function formatClassification(classification: AnalysisClassification | null) {
  if (!classification) {
    return "Not analyzed";
  }

  return formatEnum(classification);
}

function activeFilterLabel(
  statusFilter: ExecutionStatus | "ALL",
  taskTypeFilter: string,
  teamFilter: string
) {
  const activeFilters = [
    statusFilter === "ALL" ? null : `status ${formatEnum(statusFilter)}`,
    taskTypeFilter === "ALL" ? null : `task ${formatEnum(taskTypeFilter)}`,
    teamFilter.length === 0 ? null : `team ${teamFilter}`
  ].filter(Boolean);

  return `Filtered by ${activeFilters.join(" / ")}`;
}

function formatSeverity(severity: FindingSeverity) {
  if (severity === "INFO") {
    return "Info";
  }

  return formatEnum(severity);
}

function severityTone(severity: FindingSeverity) {
  return severity.toLowerCase();
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
