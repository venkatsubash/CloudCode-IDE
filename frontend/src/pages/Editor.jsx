import { io } from "socket.io-client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";

import "./Editor.css";
import Toolbar from "../components/editor/Toolbar";
import FileExplorer from "../components/editor/FileExplorer";
import BottomPanel from "../components/editor/BottomPanel";

import { LANGS } from "../Data/editorData";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");
// Remove ANSI terminal control sequences from plain-text panels.
const stripAnsi = (text) => {
  return String(text).replace(
    new RegExp(String.fromCharCode(27) + "\\[[0-9;]*[A-Za-z]", "g"),
    ""
  );
};

// Notify the dashboard that the user's cloud storage may have changed.
const notifyStorageUpdated = () => {
  // Notify the current tab.
  window.dispatchEvent(new Event("cloudcode:storage-updated"));

  // Notify other open CloudCode tabs, if any.
  localStorage.setItem(
    "cloudcode:storage-updated-at",
    String(Date.now())
  );
};

const getLanguageKey = (value) => {
  const normalized = String(value || "javascript").toLowerCase();

  const aliases = {
    js: "JavaScript",
    javascript: "JavaScript",
    py: "Python",
    python: "Python",
    cpp: "C++",
    "c++": "C++",
    c: "C",
    java: "Java",
  };

  const preferred = aliases[normalized];

  if (preferred && LANGS[preferred]) return preferred;

  return (
    Object.keys(LANGS).find(
      (key) => key.toLowerCase() === normalized
    ) || Object.keys(LANGS)[0]
  );
};

export default function EditorPage() {
  const { projectId } = useParams();

  // Project and file state
  const [project, setProject] = useState("Loading project...");
  const [userName, setUserName] = useState("Developer");
  const [lang, setLang] = useState("Python");
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Loading and saving state
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  // Execution state
  const [tab, setTab] = useState("Terminal");
  const [output, setOutput] = useState("");
  const [terminal, setTerminal] = useState("");
  const [problems, setProblems] = useState([]);
  const [running, setRunning] = useState(false);

  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const executionStartedAtRef = useRef(null);
  const savingRef = useRef(false);
  const loadedProjectIdRef = useRef(null);

  // Editor appearance
  const [dark, setDark] = useState(true);

  // Workspace panel visibility
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [outputVisible, setOutputVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Resizable panel dimensions
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [outputWidth, setOutputWidth] = useState(280);
  const [terminalHeight, setTerminalHeight] = useState(220);

  const active = items.find(
    (item) => item.id === activeId && item.type === "file"
  );

  // Warn before closing or refreshing with unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!saved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saved]);

  // API helper
  const apiRequest = async (url, options = {}) => {
    const token = getToken();

    if (!token) {
      window.location.replace("/login");
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      window.location.replace("/login");
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  };

  // Connect to Socket.IO.
  useEffect(() => {
    const token = getToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    const socket = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("CloudCode Socket.IO connected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("execution:started", (data) => {
      const sessionId =
        typeof data === "string" ? data : data?.sessionId;

      if (sessionId) {
        sessionIdRef.current = sessionId;
      }
    });

    socket.on("execution:output", (data) => {
      const rawText =
      typeof data === "string"
      ? data
      : data?.output || data?.data || "";

      if (!rawText) return;

      // Combine incoming chunks before cleaning ANSI sequences.
      setTerminal((previous) =>
        stripAnsi(previous + rawText)
      );

      setOutput((previous) =>
        stripAnsi((previous || "") + rawText)
      );
    });

  socket.on("execution:exit", (data) => {
    sessionIdRef.current = null;
    setRunning(false);

    const elapsed = data?.durationMs ??
      (executionStartedAtRef.current
        ? Math.round(performance.now() - executionStartedAtRef.current)
        : 0);

    const exitCode = data?.exitCode ?? 0;

    setProblems(data?.error ? [data.error] : []);

    setTerminal((previous) =>
      previous +
      `\r\n\r\nProcess finished with exit code ${exitCode}.\r\n`
    );

    setOutput((previous) =>
      (previous || "") +
      `\n\nProcess finished with exit code ${exitCode}.\n`
    );

  console.log(`Execution completed in ${elapsed} ms`);
  });


    socket.on("execution:error", (data) => {
      const message =
        typeof data === "string"
          ? data
          : data?.message || "Execution error";

      setRunning(false);
      sessionIdRef.current = null;
      setOutput(`Execution error: ${message}`);
      setTerminal((previous) => previous + `\r\n${message}\r\n`);
      setProblems([message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Load project, user and files.
  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      try {
        setLoading(true);
        setPageError("");

        if (!projectId) {
          throw new Error("Project ID is missing from the URL.");
        }

        const [projectsData, userData, filesData] = await Promise.all([
          apiRequest("/api/projects"),
          apiRequest("/api/auth/me"),
          apiRequest(`/api/files/project/${projectId}`),
        ]);

        if (cancelled) return;

        const selectedProject = (projectsData.projects || []).find(
          (item) => item._id === projectId
        );

        if (!selectedProject) {
          throw new Error(
            "Project not found or you do not have access to it."
          );
        }

        setProject(selectedProject.name);
        setUserName(userData.user?.name || "Developer");

        const projectLanguage = getLanguageKey(
          selectedProject.language
        );

        setLang(projectLanguage);

        let databaseFiles = (filesData.files || []).map((file) => ({
          id: file._id,
          type: "file",
          name: file.name,
          code: file.content || "",
          language: getLanguageKey(
            file.language || selectedProject.language
          ),
        }));

        // Create an initial source file if the project is empty.
        if (databaseFiles.length === 0) {
          const config = LANGS[projectLanguage];

          const createdData = await apiRequest("/api/files", {
            method: "POST",
            body: JSON.stringify({
              projectId,
              name: config.main,
              content: config.code,
              language: projectLanguage,
            }),
          });

          notifyStorageUpdated();

          if (cancelled) return;

          databaseFiles = [
            {
              id: createdData.file._id,
              type: "file",
              name: createdData.file.name,
              code: createdData.file.content || "",
              language: projectLanguage,
            },
          ];
        }

        setItems(databaseFiles);

        // Restore the last-opened file for this project.
        const storageKey = `cloudcode:lastActiveFile:${projectId}`;
        const lastActiveFileId = localStorage.getItem(storageKey);

        const selectedFile =
          databaseFiles.find((file) => file.id === lastActiveFileId) ||
          databaseFiles[0];

        loadedProjectIdRef.current = projectId;

        setActiveId(selectedFile?.id || null);

        if (selectedFile) {
          setLang(selectedFile.language || projectLanguage);
        }

        setSaved(true);
      } catch (error) {
        console.error("Editor loading error:", error);

        if (!cancelled) {
          setPageError(error.message || "Unable to load project.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Remember the last-opened file.
  useEffect(() => {
    if (
      !projectId ||
      loadedProjectIdRef.current !== projectId
    ) {
      return;
    }

    const storageKey = `cloudcode:lastActiveFile:${projectId}`;

    if (activeId) {
      localStorage.setItem(storageKey, activeId);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [projectId, activeId]);

  // Follow the operating system's theme.
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const syncTheme = () => setDark(mediaQuery.matches);

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
    };
  }, []);

  // Update editor content.
  const updateCode = (value) => {
    setItems((list) =>
      list.map((item) =>
        item.id === activeId
          ? { ...item, code: value ?? "" }
          : item
      )
    );

    setSaved(false);
  };

  // Save current file to MongoDB.
  const save = useCallback(async () => {
    if (!active || savingRef.current) return;

    try {
      savingRef.current = true;
      setSaving(true);

      await apiRequest(`/api/files/${active.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: active.name,
          content: active.code,
          language: active.language || lang,
        }),
      });

      setSaved(true);
      notifyStorageUpdated();
      setOutput("File saved successfully.");
    } catch (error) {
      console.error("File save error:", error);
      setOutput(`Save failed: ${error.message}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [active, lang]);

  // Change language.
  const changeLang = async (newLanguage) => {
    if (!active || !LANGS[newLanguage]) return;

    try {
      await apiRequest(`/api/files/${active.id}`, {
        method: "PUT",
        body: JSON.stringify({
          language: newLanguage,
        }),
      });

      setItems((list) =>
        list.map((item) =>
          item.id === active.id
            ? { ...item, language: newLanguage }
            : item
        )
      );

      setLang(newLanguage);
      setSaved(true);
    } catch (error) {
      setOutput(`Language update failed: ${error.message}`);
    }
  };

  // Create a new file.
  const newFile = async () => {
    const config = LANGS[lang];

    const name = window.prompt(
      "File name",
      `untitled.${config.ext}`
    );

    if (!name?.trim()) return;

    try {
      const data = await apiRequest("/api/files", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          content: "",
          language: lang,
        }),
      });

      const file = data.file;

      const newItem = {
        id: file._id,
        type: "file",
        name: file.name,
        code: file.content || "",
        language: getLanguageKey(file.language),
      };

      setItems((list) => [...list, newItem]);
      notifyStorageUpdated();
      setActiveId(newItem.id);
      setLang(newItem.language);
      setSaved(true);
      setOutput("File created successfully.");
    } catch (error) {
      setOutput(`File creation failed: ${error.message}`);
    }
  };

  // Create a local folder.
  const newFolder = () => {
    const name = window.prompt("Folder name");

    if (!name?.trim()) return;

    setItems((list) => [
      ...list,
      {
        id: `folder-${Date.now()}`,
        type: "folder",
        name: name.trim(),
      },
    ]);
  };

  // Rename a file or local folder.
  const rename = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    const name = window.prompt("Rename", current.name);

    if (!name?.trim() || name.trim() === current.name) return;

    try {
      if (current.type === "file") {
        await apiRequest(`/api/files/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
          }),
        });
      }

      setItems((list) =>
        list.map((item) =>
          item.id === id
            ? { ...item, name: name.trim() }
            : item
        )
      );

      setOutput("Renamed successfully.");
    } catch (error) {
      setOutput(`Rename failed: ${error.message}`);
    }
  };

  // Delete a file or local folder.
  const remove = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    if (!window.confirm(`Delete ${current.name}?`)) return;

    try {
      if (current.type === "file") {
        await apiRequest(`/api/files/${id}`, {
          method: "DELETE",
        });
        notifyStorageUpdated();
      }

      const remaining = items.filter((item) => item.id !== id);
      setItems(remaining);

      if (id === activeId) {
        const nextFile = remaining.find(
          (item) => item.type === "file"
        );

        setActiveId(nextFile?.id || null);

        if (nextFile) {
          setLang(nextFile.language);
        }
      }

      setSaved(true);
      setOutput("Deleted successfully.");
    } catch (error) {
      setOutput(`Delete failed: ${error.message}`);
    }
  };

  // Open a file and protect unsaved changes.
  const openFile = async (id) => {
    const selected = items.find((item) => item.id === id);

    if (selected?.type !== "file" || id === activeId) return;

    if (!saved) {
      const confirmSwitch = window.confirm(
        "You have unsaved changes. Switch files without saving?"
      );

      if (!confirmSwitch) return;

      try {
        const response = await apiRequest(
          `/api/files/project/${projectId}`
        );

        const savedFile = (response.files || []).find(
          (file) => file._id === activeId
        );

        if (!savedFile) {
          throw new Error("Could not retrieve the saved file.");
        }

        setItems((list) =>
          list.map((item) =>
            item.id === activeId
              ? { ...item, code: savedFile.content || "" }
              : item
          )
        );
      } catch (error) {
        setOutput(`Unable to discard changes: ${error.message}`);
        return;
      }
    }

    setActiveId(id);
    setLang(selected.language || lang);
    setSaved(true);
    setOutput("");
  };

  // Run code inside Docker through Socket.IO.
  const run = useCallback(() => {
    if (!active || running) return;

    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      setOutput(
        "Backend connection is unavailable. Please refresh the editor."
      );
      setProblems(["Backend connection is unavailable."]);
      return;
    }

    const language = String(
      active.language || lang
    ).toLowerCase();

    setRunning(true);
    setOutput("");
    setProblems([]);
    setTerminal(
      `$ run ${active.name}\r\nExecuting inside Docker...\r\n`
    );
    setTab("Terminal");

    sessionIdRef.current = null;
    executionStartedAtRef.current = performance.now();

    socket.emit("execution:start", {
      code: active.code,
      language,
      projectId,
      fileId: active.id,
      fileName: active.name,
      projectName: project,
    });
  }, [active, running, lang]);

  // Send one line of interactive input to Docker.
  const handleSendTerminalInput = useCallback((input) => {
    const socket = socketRef.current;
    const sessionId = sessionIdRef.current;

    if (!socket || !socket.connected || !sessionId) {
      return;
    }

    socket.emit("execution:input", {
      sessionId,
      input: `${input}\n`,
    });
  }, []);

  // Stop execution.
  const handleStopExecution = useCallback(() => {
    const socket = socketRef.current;
    const sessionId = sessionIdRef.current;

    if (socket && socket.connected && sessionId) {
      socket.emit("execution:stop", { sessionId });
    }
  }, []);

  // Copy the current project URL.
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setOutput("Project link copied to clipboard.");
    } catch {
      setOutput("Couldn't copy the project link.");
    }
  };

  // Panel visibility controls.
  const toggleExplorer = () => {
    setExplorerVisible((visible) => !visible);
    setFullscreen(false);
  };

  const toggleTerminal = () => {
    setTerminalVisible((visible) => !visible);
    setFullscreen(false);
  };

  const toggleOutput = () => {
    setOutputVisible((visible) => !visible);
    setFullscreen(false);
  };

  // Drag-to-resize panels.
  const startResize = (event, panel) => {
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;

    const initialExplorerWidth = explorerWidth;
    const initialOutputWidth = outputWidth;
    const initialTerminalHeight = terminalHeight;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent) => {
      if (panel === "explorer") {
        const nextWidth =
          initialExplorerWidth + moveEvent.clientX - startX;

        setExplorerWidth(
          Math.min(420, Math.max(160, nextWidth))
        );
      }

      if (panel === "output") {
        const nextWidth =
          initialOutputWidth - (moveEvent.clientX - startX);

        setOutputWidth(
          Math.min(500, Math.max(180, nextWidth))
        );
      }

      if (panel === "terminal") {
        const nextHeight =
          initialTerminalHeight - (moveEvent.clientY - startY);

        setTerminalHeight(
          Math.min(500, Math.max(100, nextHeight))
        );
      }
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Double-click a divider to restore its default size.
  const resetResize = (panel) => {
    if (panel === "explorer") setExplorerWidth(240);
    if (panel === "output") setOutputWidth(280);
    if (panel === "terminal") setTerminalHeight(220);
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        run();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [save, run]);

  if (loading) {
    return (
      <div className="ed">
        <p className="ed-loading">
          Loading your project and files...
        </p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="ed">
        <div className="ed-loading">
          <h2>Unable to open project</h2>
          <p>{pageError}</p>
          <button onClick={() => window.location.assign("/projects")}>
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  const workspaceColumns = [
    fullscreen ? "0px" : "48px",
    !fullscreen && explorerVisible ? `${explorerWidth}px` : "0px",
    !fullscreen && explorerVisible ? "5px" : "0px",
    "minmax(0, 1fr)",
    !fullscreen && outputVisible ? "5px" : "0px",
    !fullscreen && outputVisible ? `${outputWidth}px` : "0px",
  ].join(" ");

  return (
    <div
      className={`ed ed-vscode${fullscreen ? " ed-fullscreen" : ""}`}
      style={{
        gridTemplateRows: `auto minmax(0, 1fr) ${
          terminalVisible && !fullscreen ? "5px" : "0px"
        } ${
          terminalVisible && !fullscreen
            ? `${terminalHeight}px`
            : "0px"
        }`,
      }}
    >
      <Toolbar
        project={project}
        lang={lang}
        onLang={changeLang}
        onSave={save}
        onRun={run}
        onShare={share}
        running={running}
        saved={saved}
        userName={userName}
        onToggleExplorer={toggleExplorer}
        onToggleTerminal={toggleTerminal}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        explorerVisible={explorerVisible}
        terminalVisible={terminalVisible}
        fullscreen={fullscreen}
        onStop={handleStopExecution}
      />

      <div
        className="ed-body ed-vscode-body"
        style={{ gridTemplateColumns: workspaceColumns }}
      >
        {/* Column 1: Activity bar */}
        {!fullscreen ? (
          <nav className="ed-activity-bar" aria-label="Activity bar">
            <button
              type="button"
              className={`ed-activity-icon ${explorerVisible ? "active" : ""}`}
              title="Explorer"
              aria-label="Toggle Explorer"
              onClick={toggleExplorer}
            >
              <span>▤</span>
            </button>

            <button
              type="button"
              className="ed-activity-icon"
              title="Search"
              aria-label="Search"
              onClick={() =>
                setOutput("Search functionality will be added next.")
              }
            >
              <span>⌕</span>
            </button>

            <button
              type="button"
              className="ed-activity-icon"
              title="Source Control"
              aria-label="Source Control"
              onClick={() =>
                setOutput("Source Control integration will be added next.")
              }
            >
              <span>⑂</span>
            </button>

            <button
              type="button"
              className="ed-activity-icon"
              title="Extensions"
              aria-label="Extensions"
              onClick={() =>
                setOutput("Extensions panel will be added next.")
              }
            >
              <span>▦</span>
            </button>

            <div className="ed-activity-spacer" />

            <button
              type="button"
              className={`ed-activity-icon ${outputVisible ? "active" : ""}`}
              title="Toggle Output"
              aria-label="Toggle Output"
              onClick={toggleOutput}
            >
              <span>◫</span>
            </button>

            <button
              type="button"
              className={`ed-activity-icon ${terminalVisible ? "active" : ""}`}
              title="Toggle Terminal"
              aria-label="Toggle Terminal"
              onClick={toggleTerminal}
            >
              <span>⌘</span>
            </button>
          </nav>
        ) : (
          <div className="ed-grid-placeholder" />
        )}

        {/* Column 2: Explorer */}
        {!fullscreen && explorerVisible ? (
          <FileExplorer
            items={items}
            activeId={activeId}
            onOpen={openFile}
            onNewFile={newFile}
            onNewFolder={newFolder}
            onRename={rename}
            onDelete={remove}
          />
        ) : (
          <div className="ed-grid-placeholder" />
        )}

        {/* Column 3: Explorer resize divider */}
        {!fullscreen && explorerVisible ? (
          <div
            className="ed-resizer ed-resizer-vertical"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Explorer"
            onPointerDown={(event) => startResize(event, "explorer")}
            onDoubleClick={() => resetResize("explorer")}
          />
        ) : (
          <div className="ed-grid-placeholder" />
        )}

        {/* Column 4: Monaco Editor — remains mounted */}
        <section className="ed-center" aria-label="Code editor">
          <div className="ed-tabs" role="tablist">
            {active && (
              <button
                className="ed-tab"
                role="tab"
                aria-selected="true"
              >
                {active.name}
                {!saved ? " ●" : ""}
              </button>
            )}
          </div>

          <div className="ed-monaco">
            {active ? (
              <Editor
                key={active.id}
                path={active.name}
                language={
                  LANGS[active.language || lang]?.monaco || "plaintext"
                }
                value={active.code}
                onChange={updateCode}
                theme={dark ? "vs-dark" : "light"}
                loading={
                  <div className="ed-loading">
                    Loading editor...
                  </div>
                }
                options={{
                  fontFamily: "JetBrains Mono, Consolas, monospace",
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                }}
              />
            ) : (
              <p className="ed-loading">
                No files in this project. Create a file to start coding.
              </p>
            )}
          </div>
        </section>

        {/* Column 5: Output resize divider */}
        {!fullscreen && outputVisible ? (
          <div
            className="ed-resizer ed-resizer-vertical"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Output"
            onPointerDown={(event) => startResize(event, "output")}
            onDoubleClick={() => resetResize("output")}
          />
        ) : (
          <div className="ed-grid-placeholder" />
        )}

        {/* Column 6: Output */}
        {!fullscreen && outputVisible ? (
          <aside className="ed-out" aria-label="Output">
            <header className="ed-out-header">
              <span className="ed-panel-title">OUTPUT</span>
              <button
                className="ed-clear"
                type="button"
                onClick={() => setOutput("")}
                title="Clear output"
              >
                Clear
              </button>
            </header>

            <pre className="ed-pre" aria-live="polite">
              {output || (
                <span className="dim">
                  Program output will appear here.
                </span>
              )}
            </pre>
          </aside>
        ) : (
          <div className="ed-grid-placeholder" />
        )}
      </div>

      {!fullscreen && (
        <div
          className={`ed-resizer ed-resizer-horizontal ${
            terminalVisible ? "" : "hidden"
          }`}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize Terminal"
          onPointerDown={(event) => startResize(event, "terminal")}
          onDoubleClick={() => resetResize("terminal")}
        />
      )}

      {terminalVisible && !fullscreen && (
        <div
          className="ed-bottom-wrap"
          style={{ height: `${terminalHeight}px` }}
        >
          <BottomPanel
            tab={tab}
            setTab={setTab}
            terminal={terminal}
            problems={problems}
            output={output}
            onSendInput={handleSendTerminalInput}
            onStop={handleStopExecution}
            running={running}
          />
        </div>
      )}
    </div>
  );
}