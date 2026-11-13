
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Editor from "./pages/Editor";
import History from "./pages/History";
import Settings from "./pages/Settings";

// Handles clicks on the Editor sidebar link.
function EditorEntry() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const openProject = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await fetch("/api/projects", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");

          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load your projects."
          );
        }

        if (cancelled) return;

        if (!data.projects || data.projects.length === 0) {
          navigate("/projects", { replace: true });
          return;
        }

        // Open the first available project.
        const project = data.projects[0];

        navigate(`/editor/${project._id}`, {
          replace: true,
        });
      } catch (err) {
        console.error("Editor navigation error:", err);

        if (!cancelled) {
          setError(err.message || "Unable to open editor.");
        }
      }
    };

    openProject();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div style={{ padding: 30 }}>
        <h2>Unable to open editor</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/projects")}>
          Back to projects
        </button>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      Opening your CloudCode workspace...
    </div>
  );
}

function LogoutPage() {
  useEffect(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    window.location.replace("/login");
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Register />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/new" element={<Projects />} />
        <Route path="/projects" element={<Projects />} />

        {/* Editor navigation without a project ID */}
        <Route path="/editor" element={<EditorEntry />} />

        {/* Editor with a specific project ID */}
        <Route path="/editor/:projectId" element={<Editor />} />

        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/logout" element={<LogoutPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
