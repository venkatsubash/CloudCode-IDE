
import { useState, useMemo, useEffect, useRef } from "react";
import "./History.css";

import Logo from "../components/common/Logo";
import Icon from "../components/common/Icon";

import {
  NAV,
  STATUS,
  DATE_OPTIONS,
  DAY_MS,
} from "../Data/historyData";
import { API_URL } from "../config/api";

const HISTORY_STATUS = {
  ...STATUS,
  stopped: {
    label: "Stopped",
    d: "M6 6h12v12H6z",
  },
};

const fmtTime = (ms) => {
  const value = Number(ms) || 0;
  const seconds = value / 1000;

  return seconds >= 10
    ? `${Math.round(seconds)}s`
    : `${seconds.toFixed(2)}s`;
};

const fmtMem = (mb) =>
  mb == null ? "Not available" : `${mb} MB`;

const sameDay = (a, b) =>
  a.toDateString() === b.toDateString();

function fmtDate(d, now) {
  if (sameDay(d, now)) return "Today";

  if (sameDay(d, new Date(now - DAY_MS))) {
    return "Yesterday";
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLanguage(language) {
  const aliases = {
    python: "Python",
    javascript: "JavaScript",
    js: "JavaScript",
    cpp: "C++",
    "c++": "C++",
    c: "C",
    java: "Java",
  };

  const key = String(language || "unknown").toLowerCase();

  return aliases[key] || language || "Unknown";
}

function StatusTag({ status }) {
  const s = HISTORY_STATUS[status] || HISTORY_STATUS.failed;

  return (
    <span className={`hs-status ${status}`}>
      <Icon d={s.d} />
      {s.label}
    </span>
  );
}

function Block({ title, children, copy }) {
  const [label, setLabel] = useState("Copy");

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setLabel("Copied");
    } catch {
      setLabel("Copy failed");
    }

    setTimeout(() => setLabel("Copy"), 1800);
  };

  return (
    <section className="hs-block">
      <div className="hs-block-head">
        <h3>{title}</h3>

        {copy ? (
          <button className="hs-copy" onClick={doCopy}>
            {label}
          </button>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function Details({ run, now, onClose }) {
  const closeRef = useRef(null);
  const d = new Date(run.at);

  useEffect(() => {
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = (value, empty) => (
    <pre className={`hs-pre ${value ? "" : "none"}`}>
      {value || empty}
    </pre>
  );

  return (
    <>
      <div className="hs-scrim" onClick={onClose} />

      <aside
        className="hs-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hs-dt"
      >
        <div className="hs-dhead">
          <div>
            <h2 id="hs-dt">{run.project}</h2>

            <div className="hs-meta">
              <StatusTag status={run.status} />

              <span>{formatLanguage(run.lang)}</span>

              <span>
                {fmtDate(d, now)},{" "}
                {d.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="hs-meta">
              <span>{run.fileName || "Untitled File"}</span>
            </div>
          </div>

          <button
            ref={closeRef}
            className="hs-x"
            onClick={onClose}
            aria-label="Close details"
          >
            <Icon d="M6 6l12 12M18 6 6 18" />
          </button>
        </div>

        <div className="hs-dbody">
          <div className="hs-facts">
            <div className="hs-fact">
              <span>Status</span>
              <b>
                {(HISTORY_STATUS[run.status] || HISTORY_STATUS.failed).label}
              </b>
            </div>

            <div className="hs-fact">
              <span>Execution time</span>
              <b>{fmtTime(run.timeMs)}</b>
            </div>

            <div className="hs-fact">
              <span>Memory usage</span>
              <b>{fmtMem(run.memoryMb)}</b>
            </div>
          </div>

          <Block title="Code" copy={run.code}>
            <pre className="hs-pre">
              {run.code || "No code recorded."}
            </pre>
          </Block>

          <Block title="Input">
            {text(run.input, "No input was provided.")}
          </Block>

          <Block title="Output">
            {text(run.output, "No output.")}
          </Block>

          <Block title="Error">
            {run.error ? (
              <pre className="hs-pre err">{run.error}</pre>
            ) : (
              text("", "No errors.")
            )}
          </Block>
        </div>

        <div className="hs-actions">
          {run.projectId ? (
            <a
              className="hs-btn"
              href={`/editor/${run.projectId}`}
            >
              Open in editor
            </a>
          ) : null}

          <button className="hs-btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

export default function HistoryPage({
  userName: initialUserName = "Developer",
}) {
  const [now] = useState(() => new Date());

  const [data, setData] = useState([]);
  const [userName, setUserName] = useState(initialUserName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("all");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("all");
  const [openId, setOpenId] = useState(null);

  const lastFocus = useRef(null);

  // Load actual execution records from the authenticated History API.
  useEffect(() => {
    const controller = new AbortController();

    const loadHistory = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          window.location.replace("/login");
          return;
        }

        const response = await fetch(API_URL("/api/history"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");

          window.location.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load execution history."
          );
        }

        const executions = (result.executions || []).map((run) => ({
          ...run,
          lang: formatLanguage(run.lang),
          at: run.at || new Date().toISOString(),
          timeMs: Number(run.timeMs) || 0,
        }));

        if (controller.signal.aborted) return;

        setData(executions);

        try {
          const storedUser = JSON.parse(
            localStorage.getItem("user") ||
            sessionStorage.getItem("user") ||
            "{}"
          );

          if (storedUser.name) {
            setUserName(storedUser.name);
          }
        } catch {
          // Keep the default user name if stored data is invalid.
        }

        setError("");
      } catch (err) {
        if (
          err.name !== "AbortError" &&
          !controller.signal.aborted
        ) {
          console.error("History loading error:", err);

          setError(
            err.message || "Unable to load execution history."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => controller.abort();
  }, [reloadKey]);

  const languages = useMemo(
    () => [...new Set(data.map((r) => r.lang))].sort(),
    [data]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const inRange = (t) =>
      range === "all" ||
      (range === "today"
        ? t >= startToday
        : t >= now.getTime() - Number(range) * DAY_MS);

    return data
      .filter(
        (r) =>
          (!q ||
            `${r.project || ""} ${r.lang || ""} ${r.fileName || ""}`
              .toLowerCase()
              .includes(q)) &&
          (lang === "all" || r.lang === lang) &&
          (status === "all" || r.status === status) &&
          inRange(new Date(r.at).getTime())
      )
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [data, query, lang, status, range, now]);

  const open = (id, el) => {
    lastFocus.current = el || document.activeElement;
    setOpenId(id);
  };

  const close = () => {
    setOpenId(null);

    setTimeout(() => {
      lastFocus.current?.focus?.();
    }, 0);
  };

  const clear = () => {
    setQuery("");
    setLang("all");
    setStatus("all");
    setRange("all");
  };

  const current = data.find((r) => r.id === openId);

  const retry = () => {
    setLoading(true);
    setError("");
    setReloadKey((previous) => previous + 1);
  };

  return (
    <div className="hs">
      <aside className="hs-side">
        <a className="hs-logo" href="/">
          <Logo />
          CloudCode
        </a>

        <nav className="hs-nav" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={n.href}
              className="hs-link"
              aria-current={
                n.id === "history" ? "page" : undefined
              }
            >
              <Icon d={n.d} />
              {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <header className="hs-top">
        <div className="hs-user">
          <span className="hs-avatar" aria-hidden="true">
            {userName.charAt(0).toUpperCase()}
          </span>

          {userName}
        </div>
      </header>

      <main className="hs-main">
        <h1>Execution history</h1>

        <p className="hs-lead">
          Every run, with its code, input, output and result.
        </p>

        {error && (
          <div className="hs-empty">
            <strong>Couldn't load execution history</strong>
            <p>{error}</p>

            <button onClick={retry}>
              Try again
            </button>
          </div>
        )}

        {!error && (
          <>
            <div className="hs-tools">
              <div className="hs-search">
                <Icon d="m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />

                <input
                  type="search"
                  placeholder="Search runs"
                  aria-label="Search runs"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <select
                className="hs-select"
                aria-label="Filter by language"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="all">All languages</option>

                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <select
                className="hs-select"
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>

                {Object.entries(HISTORY_STATUS).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                className="hs-select"
                aria-label="Filter by date"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                {DATE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="hs-tablewrap">
              {loading ? (
                <div className="hs-empty">
                  <strong>Loading your execution history...</strong>
                </div>
              ) : rows.length ? (
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col">Language</th>
                      <th scope="col">Status</th>
                      <th scope="col">Time</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={(e) =>
                          open(
                            r.id,
                            e.currentTarget.querySelector("button")
                          )
                        }
                      >
                        <td>
                          <button
                            className="hs-open"
                            onClick={(e) => {
                              e.stopPropagation();
                              open(r.id, e.currentTarget);
                            }}
                          >
                            {r.project || "Untitled Project"}
                          </button>

                          <div className="hs-meta">
                            {r.fileName || "Untitled File"}
                          </div>
                        </td>

                        <td className="mono">{r.lang}</td>

                        <td>
                          <StatusTag status={r.status} />
                        </td>

                        <td className="mono">
                          {fmtTime(r.timeMs)}
                        </td>

                        <td className="date">
                          {fmtDate(new Date(r.at), now)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="hs-empty">
                  <strong>
                    {data.length
                      ? "No runs match your filters"
                      : "No executions yet"}
                  </strong>

                  {data.length ? (
                    <button onClick={clear}>
                      Clear search and filters
                    </button>
                  ) : (
                    <a href="/editor">
                      Run your first program
                    </a>
                  )}
                </div>
              )}
            </div>

            {!loading && rows.length > 0 && (
              <p className="hs-count">
                Showing {rows.length} of {data.length} executions
              </p>
            )}
          </>
        )}
      </main>

      {current && (
        <Details
          run={current}
          now={now}
          onClose={close}
        />
      )}
    </div>
  );
}
