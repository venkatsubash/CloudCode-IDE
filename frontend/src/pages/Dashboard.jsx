
import { useState, useMemo, useEffect } from "react";
import "./Dashboard.css";

import Logo from "../components/common/Logo";
import Icon from "../components/common/Icon";

import {
  NAV,
  NAV_BOTTOM,
} from "../Data/dashboardData";

import { getStorageUsage } from "../services/storageService";

const formatStorageSize = (bytes) => {
  const safeBytes = Math.max(0, Number(bytes) || 0);

  if (safeBytes < 1024) {
    return `${safeBytes} ${safeBytes === 1 ? "Byte" : "Bytes"}`;
  }

  if (safeBytes < 1024 * 1024) {
    return `${(safeBytes / 1024).toFixed(2)} KB`;
  }

  return `${(safeBytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [userName, setUserName] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cloud storage state
  const [storage, setStorage] = useState(null);
  const [storageError, setStorageError] = useState("");
  const [executions, setExecutions] = useState([]);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Fetch the latest storage usage from the backend.
    const refreshStorage = async () => {
      try {
        const storageData = await getStorageUsage();

        if (!cancelled) {
          setStorage(storageData);
          setStorageError("");
        }
      } catch (storageErr) {
        console.error("Storage loading error:", storageErr);

        if (!cancelled) {
          setStorageError(storageErr.message);
        }
      }
    };

    // Fetch the user's saved execution history from MongoDB.
    const refreshHistory = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) return;

        const response = await fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load execution history.");
        }

        if (!cancelled) {
          setExecutions(Array.isArray(data.executions) ? data.executions : []);
          setHistoryError("");
        }
      } catch (historyErr) {
        console.error("Execution history loading error:", historyErr);
        if (!cancelled) setHistoryError(historyErr.message);
      }
    };

    const refreshDashboardData = () => {
      refreshStorage();
      refreshHistory();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDashboardData();
      }
    };

    const handleStorageEvent = (event) => {
      if (
        event.key === "cloudcode:storage-updated-at" ||
        event.key === "cloudcode:execution-updated-at"
      ) {
        refreshDashboardData();
      }
    };

    window.addEventListener("cloudcode:storage-updated", refreshStorage);
    window.addEventListener("cloudcode:execution-updated", refreshHistory);
    window.addEventListener("focus", refreshDashboardData);
    window.addEventListener("storage", handleStorageEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const loadDashboard = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          window.location.replace("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [userResponse, projectResponse] =
          await Promise.all([
            fetch("/api/auth/me", { headers }),
            fetch("/api/projects", { headers }),
          ]);

        const userData = await userResponse.json();
        const projectData = await projectResponse.json();

        if (
          userResponse.status === 401 ||
          projectResponse.status === 401
        ) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
          window.location.replace("/login");
          return;
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.message || "Unable to load user details."
          );
        }

        if (!projectResponse.ok) {
          throw new Error(
            projectData.message || "Unable to load projects."
          );
        }

        setUserName(userData.user.name);

        const actualProjects = projectData.projects.map(
          (project) => ({
            id: project._id,
            name: project.name,
            lang: project.language
              ? project.language.toUpperCase()
              : "Unknown",
            updated: project.updatedAt
              ? new Date(project.updatedAt).toLocaleDateString()
              : "Recently",
          })
        );

        setProjects(actualProjects);

        await Promise.all([refreshStorage(), refreshHistory()]);
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(err.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
      window.removeEventListener("cloudcode:storage-updated", refreshStorage);
      window.removeEventListener("cloudcode:execution-updated", refreshHistory);
      window.removeEventListener("focus", refreshDashboardData);
      window.removeEventListener("storage", handleStorageEvent);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  const q = query.trim().toLowerCase();

  const shownProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          !q ||
          `${project.name} ${project.lang}`
            .toLowerCase()
            .includes(q)
      ),
    [projects, q]
  );

  // Dashboard statistics are calculated from the user's saved executions.
  const successfulExecutions = executions.filter(
    (execution) => execution.status === "success"
  ).length;

  const failedExecutions = executions.filter(
    (execution) => execution.status !== "success"
  ).length;

  const stats = {
    projects: projects.length,
    executions: executions.length,
    success: successfulExecutions,
    failed: failedExecutions,
  };

  const recentExecutions = executions.slice(0, 5);

  const rate = stats.executions
    ? Math.round(
        (stats.success / stats.executions) * 100
      )
    : 0;

  // Calculate storage display values
  const usedBytes = storage?.usedBytes ?? 0;
  const quotaBytes = storage?.quotaBytes ?? 52428800;

  const usedMB = usedBytes / (1024 * 1024);
  const quotaMB = quotaBytes / (1024 * 1024);
  const remainingMB = Math.max(0, quotaMB - usedMB);

  const storagePercentage =
    quotaBytes > 0
      ? Math.min(100, (usedBytes / quotaBytes) * 100)
      : 0;

  const storageWarning = storagePercentage >= 80;

  if (loading) {
    return (
      <div className="db-main">
        <h2>Loading your dashboard...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="db-main">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="db">
      <aside className="db-side">
        <a className="db-logo" href="/">
          <Logo />
          CloudCode
        </a>

        <nav className="db-nav" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={n.href}
              className="db-link"
              aria-current={
                n.id === "dashboard" ? "page" : undefined
              }
            >
              <Icon d={n.d} />
              {n.label}
            </a>
          ))}
        </nav>

        <nav className="db-nav bottom" aria-label="Account">
          {NAV_BOTTOM.map((n) => (
            <a
              key={n.id}
              href={n.href}
              className="db-link"
            >
              <Icon d={n.d} />
              {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <header className="db-top">
        <div className="db-search">
          <Icon
            d="m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
          />

          <input
            type="search"
            placeholder="Search projects and runs"
            aria-label="Search projects and runs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="db-spacer" />

        <button
          className="db-bell"
          aria-label="Notifications"
        >
          <Icon
            d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7ZM10 20a2 2 0 0 0 4 0"
          />
        </button>

        <div className="db-user">
          <span className="db-avatar" aria-hidden="true">
            {userName.charAt(0).toUpperCase()}
          </span>

          <b>{userName}</b>
        </div>
      </header>

      <main className="db-main">
        <h1>Welcome back, {userName}</h1>

        <p className="db-lead">
          Here's what's happening with your projects.
        </p>

        {/* Cloud Storage Card */}
        <section
          aria-labelledby="storage-heading"
          style={{
            marginBottom: 28,
            padding: 24,
            borderRadius: 14,
            border: "1px solid var(--border, #30343b)",
            background: "var(--card, #1c1f26)",
            color: "var(--text, #ffffff)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                id="storage-heading"
                style={{ margin: 0, fontSize: 19 }}
              >
                Cloud Storage
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.65,
                  fontSize: 13,
                }}
              >
                Your personal CloudCode workspace
              </p>
            </div>

            <span
              style={{
                fontSize: 12,
                padding: "6px 11px",
                borderRadius: 20,
                background: "rgba(34,197,94,0.12)",
                color: "#4ade80",
              }}
            >
              Free Plan
            </span>
          </div>

          {storageError ? (
            <p style={{ color: "#f87171", fontSize: 14 }}>
              Unable to load storage usage: {storageError}
            </p>
          ) : storage ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div>
                  <strong style={{ fontSize: 26 }}>
                    {formatStorageSize(usedBytes)}
                  </strong>

                  <span
                    style={{
                      marginLeft: 6,
                      opacity: 0.6,
                      fontSize: 14,
                    }}
                  >
                    used of {quotaMB.toFixed(0)} MB
                  </span>
                </div>

                <span style={{ fontSize: 13, opacity: 0.7 }}>
                  {storagePercentage.toFixed(3)}% used
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="Cloud storage usage"
                aria-valuenow={Number(storagePercentage.toFixed(2))}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  height: 10,
                  width: "100%",
                  borderRadius: 20,
                  overflow: "hidden",
                  background: "rgba(128,128,128,0.2)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${storagePercentage}%`,
                    borderRadius: 20,
                    background: storageWarning
                      ? "#f59e0b"
                      : "#22c55e",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 14,
                  fontSize: 13,
                  opacity: 0.75,
                }}
              >
                <span>
                  Remaining: {remainingMB.toFixed(2)} MB
                </span>

                <span>
                  Total quota: {quotaMB.toFixed(0)} MB
                </span>
              </div>

              {storageWarning && (
                <p
                  role="alert"
                  style={{
                    color: "#fbbf24",
                    fontSize: 13,
                    marginBottom: 0,
                    marginTop: 14,
                  }}
                >
                  Warning: Your storage usage has reached 80%.
                  Consider deleting files you no longer need.
                </p>
              )}
            </>
          ) : (
            <p style={{ opacity: 0.7 }}>
              Loading storage information...
            </p>
          )}
        </section>

        <section className="db-stats" aria-label="Summary">
          <div className="db-stat">
            <b>{stats.projects}</b>
            <span>Projects</span>
          </div>

          <div className="db-stat">
            <b>{stats.executions}</b>
            <span>Executions</span>
          </div>

          <div className="db-stat good">
            <b>{stats.success}</b>
            <span>Successful</span>
          </div>

          <div className="db-stat fail">
            <b>{stats.failed}</b>
            <span>Failed</span>
          </div>

          <div className="db-rate">
            <span>{rate}% of runs succeeded</span>

            <div
              className="db-bar"
              role="img"
              aria-label={`${rate} percent success rate`}
            >
              <i style={{ width: `${rate}%` }} />
            </div>
          </div>
        </section>

        <section aria-labelledby="rp">
          <div className="db-head">
            <h2 id="rp">Recent projects</h2>

            <a className="db-new" href="/projects/new">
              + New project
            </a>
          </div>

          {shownProjects.length ? (
            <div className="db-projects">
              {shownProjects.map((project) => (
                <a
                  key={project.id}
                  className="db-proj"
                  href={`/editor/${project.id}`}
                >
                  <span className="db-lang">
                    {project.lang}
                  </span>

                  <strong>{project.name}</strong>

                  <span>Updated {project.updated}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="db-empty">
              {projects.length
                ? `No projects match "${query}".`
                : "You haven't created any projects yet."}
            </p>
          )}
        </section>

        <section
          aria-labelledby="re"
          style={{
            marginTop: shownProjects.length ? 0 : 44,
          }}
        >
          <div className="db-head">
            <h2 id="re">Recent executions</h2>
          </div>

          <div className="db-tablewrap">
            {historyError ? (
              <p className="db-empty">
                Unable to load execution history: {historyError}
              </p>
            ) : recentExecutions.length ? (
              <div className="db-recent-executions">
                {recentExecutions.map((execution) => (
                  <div
                    className="db-execution-row"
                    key={execution.id || execution._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border, #30343b)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>
                        {execution.fileName || "Untitled File"}
                      </strong>
                      <span style={{ opacity: 0.7, fontSize: 13 }}>
                        {execution.project || execution.projectName || "Project"}{" "}
                        · {(execution.lang || execution.language || "Unknown").toUpperCase()}
                        {" · "}
                        {(
                          Number(execution.timeMs ?? execution.durationMs ?? 0) / 1000
                        ).toFixed(2)}s
                      </span>
                      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                        {execution.at
                          ? new Date(execution.at).toLocaleString()
                          : execution.createdAt
                            ? new Date(execution.createdAt).toLocaleString()
                            : ""}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        color:
                          execution.status === "success"
                            ? "#4ade80"
                            : execution.status === "timeout" || execution.status === "stopped"
                              ? "#fbbf24"
                              : "#f87171",
                      }}
                    >
                      {execution.status || "unknown"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="db-empty">No execution history available yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
