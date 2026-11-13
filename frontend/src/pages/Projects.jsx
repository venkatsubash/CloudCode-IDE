
import { useState, useMemo, useEffect } from "react";
import "./Projects.css";

import Logo from "../components/common/Logo";
import Icon from "../components/common/Icon";

import { NAV, COLUMNS } from "../Data/projectsData";

const initialForm = {
  name: "",
  description: "",
  language: "javascript",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [userName, setUserName] = useState("Developer");
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(
    () => window.location.pathname === "/projects/new"
  );
  const [form, setForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [sort, setSort] = useState({
    key: "modifiedAt",
    dir: "desc",
  });

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const formatProject = (project) => ({
    id: project._id,
    name: project.name,
    lang: project.language
      ? project.language.charAt(0).toUpperCase() +
        project.language.slice(1)
      : "Unknown",
    files: 0,
    modified: project.updatedAt
      ? new Date(project.updatedAt).toLocaleDateString()
      : "Recently",
    modifiedAt: project.updatedAt
      ? new Date(project.updatedAt).getTime()
      : Date.now(),
  });

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const token = getToken();

        if (!token) {
          window.location.replace("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [userRes, projectsRes] = await Promise.all([
          fetch("/api/auth/me", { headers }),
          fetch("/api/projects", { headers }),
        ]);

        const userData = await userRes.json();
        const projectsData = await projectsRes.json();

        if (userRes.status === 401 || projectsRes.status === 401) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
          window.location.replace("/login");
          return;
        }

        if (!userRes.ok) {
          throw new Error(userData.message || "Unable to load user.");
        }

        if (!projectsRes.ok) {
          throw new Error(
            projectsData.message || "Unable to load projects."
          );
        }

        setUserName(userData.user.name);
        setProjects((projectsData.projects || []).map(formatProject));
      } catch (err) {
        console.error("Projects loading error:", err);
        setError(err.message || "Unable to load projects.");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const languages = useMemo(
    () => [...new Set(projects.map((p) => p.lang))].sort(),
    [projects]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = projects.filter(
      (p) =>
        (lang === "All" || p.lang === lang) &&
        (!q || p.name.toLowerCase().includes(q))
    );

    const { key, dir } = sort;

    return [...list].sort((a, b) => {
      const x = a[key];
      const y = b[key];

      const comparison =
        typeof x === "number"
          ? x - y
          : String(x).localeCompare(String(y));

      return dir === "asc" ? comparison : -comparison;
    });
  }, [projects, query, lang, sort]);

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? {
            key,
            dir: s.dir === "asc" ? "desc" : "asc",
          }
        : {
            key,
            dir: key === "modifiedAt" ? "desc" : "asc",
          }
    );

  const open = (id) => {
    window.location.assign(`/editor/${id}`);
  };

  const clear = () => {
    setQuery("");
    setLang("All");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateError("");

    const name = form.name.trim();

    if (!name) {
      setCreateError("Please enter a project name.");
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    try {
      setCreating(true);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: form.description.trim(),
          language: form.language,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not create project.");
      }

      if (!data.project || !data.project._id) {
        throw new Error("Project was created, but the server response was incomplete.");
      }

      setProjects((current) => [
        formatProject(data.project),
        ...current,
      ]);

      setForm(initialForm);
      setShowCreateForm(false);
      setQuery("");
      setLang("All");
      setSort({ key: "modifiedAt", dir: "desc" });
    } catch (err) {
      console.error("Project creation error:", err);
      setCreateError(err.message || "Unable to create project.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="pj">
        <main className="pj-main">
          <h2>Loading your projects...</h2>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pj">
        <main className="pj-main">
          <h2>Unable to load projects</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try again
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="pj">
      <aside className="pj-side">
        <a className="pj-logo" href="/">
          <Logo />
          CloudCode
        </a>

        <nav className="pj-nav" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={n.href}
              className="pj-link"
              aria-current={n.id === "projects" ? "page" : undefined}
            >
              <Icon d={n.d} />
              {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <header className="pj-top">
        <div className="pj-user">
          <span className="pj-avatar" aria-hidden="true">
            {userName.charAt(0).toUpperCase()}
          </span>
          {userName}
        </div>
      </header>

      <main className="pj-main">
        <div className="pj-title">
          <div>
            <h1>My projects</h1>
            <p className="pj-count">
              {projects.length}{" "}
              {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>

          <button
            className="pj-new"
            type="button"
            onClick={() => {
              setCreateError("");
              setShowCreateForm((current) => !current);
            }}
          >
            {showCreateForm ? "Cancel" : "+ New project"}
          </button>
        </div>

        {showCreateForm && (
          <section className="pj-create" aria-labelledby="pj-create-title">
            <div className="pj-create-heading">
              <h2 id="pj-create-title">Create a new project</h2>
              <p>Set up your workspace and start coding.</p>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="pj-form-field">
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  name="name"
                  type="text"
                  placeholder="e.g. My First App"
                  value={form.name}
                  onChange={handleFormChange}
                  maxLength={80}
                  required
                />
              </div>

              <div className="pj-form-field">
                <label htmlFor="project-description">
                  Description <span>(optional)</span>
                </label>
                <textarea
                  id="project-description"
                  name="description"
                  placeholder="What are you building?"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="pj-form-field">
                <label htmlFor="project-language">
                  Programming language
                </label>
                <select
                  id="project-language"
                  name="language"
                  value={form.language}
                  onChange={handleFormChange}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="java">Java</option>
                </select>
              </div>

              {createError && (
                <p className="pj-create-error" role="alert">
                  {createError}
                </p>
              )}

              <div className="pj-form-actions">
                <button
                  className="pj-cancel"
                  type="button"
                  disabled={creating}
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError("");
                  }}
                >
                  Cancel
                </button>

                <button
                  className="pj-submit"
                  type="submit"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="pj-tools">
          <div className="pj-search">
            <Icon d="m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />

            <input
              type="search"
              placeholder="Search projects"
              aria-label="Search projects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="pj-select"
            aria-label="Filter by language"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="All">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="pj-tablewrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={
                        sort.key === c.key
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button onClick={() => toggleSort(c.key)}>
                        {c.label}
                        {sort.key === c.key && (
                          <span className="arrow" aria-hidden="true">
                            {sort.dir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} onClick={() => open(p.id)}>
                    <td>
                      <a
                        href={`/editor/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.name}
                      </a>
                    </td>
                    <td>
                      <span className="pj-lang">{p.lang}</span>
                    </td>
                    <td className="num">{p.files}</td>
                    <td className="date">{p.modified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : projects.length ? (
            <div className="pj-empty">
              <strong>No projects match your search</strong>
              <a
                href="#clear"
                onClick={(e) => {
                  e.preventDefault();
                  clear();
                }}
              >
                Clear search and filter
              </a>
            </div>
          ) : (
            <div className="pj-empty">
              <strong>No projects yet</strong>
              <p>Create your first project to get started.</p>
              {!showCreateForm && (
                <button
                  className="pj-empty-create"
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                >
                  + Create your first project
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
