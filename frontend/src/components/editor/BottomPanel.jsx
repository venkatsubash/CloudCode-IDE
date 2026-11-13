
import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

function BottomPanel({
  tab,
  setTab,
  terminal,
  onSendInput,
  onStop,
  running,
  problems,
  output,
}) {
  const terminalElementRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const previousOutputRef = useRef("");

  // Create the xterm terminal once.
  useEffect(() => {
    if (!terminalElementRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: "#181818",
        foreground: "#cccccc",
        cursor: "#ffffff",
        selectionBackground: "#264f78",
        black: "#000000",
        red: "#f14c4c",
        green: "#23d18b",
        yellow: "#f5f543",
        blue: "#3b8eea",
        magenta: "#d670d6",
        cyan: "#29b8db",
        white: "#e5e5e5",
      },
      scrollback: 3000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();

    xterm.loadAddon(fitAddon);
    xterm.open(terminalElementRef.current);

    terminalRef.current = xterm;
    fitAddonRef.current = fitAddon;

    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Terminal may not be visible yet.
      }
    });

    let inputBuffer = "";

    const dataSubscription = xterm.onData((data) => {
      if (data === "\r") {
        xterm.write("\r\n");
        
        onSendInput?.(inputBuffer);

        inputBuffer = "";
        return;
      }

      if (data === "\u007f") {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          xterm.write("\b \b");
        }
        return;
      }

      if (data === "\u0003") {
        xterm.write("^C\r\n");
        inputBuffer = "";
        onStop?.();
        return;
      }

      if (data >= " " && data !== "\u007f") {
        inputBuffer += data;
        xterm.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore resize while hidden.
      }
    });

    resizeObserver.observe(terminalElementRef.current);

    return () => {
      dataSubscription.dispose();
      resizeObserver.disconnect();
      xterm.dispose();

      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Display execution output in the terminal.
  useEffect(() => {
    const xterm = terminalRef.current;
    if (!xterm || !terminal) return;

    const previous = previousOutputRef.current;

    if (terminal.startsWith(previous)) {
      const newText = terminal.slice(previous.length);

      if (newText) {
        xterm.write(newText);
      }
    } else {
      xterm.reset();
      xterm.write(terminal);
    }

    previousOutputRef.current = terminal;
  }, [terminal]);

  // Resize terminal when its tab becomes visible.
  useEffect(() => {
    if (tab !== "Terminal") return;

    requestAnimationFrame(() => {
      try {
        fitAddonRef.current?.fit();
        terminalRef.current?.focus();
      } catch {
        // Ignore hidden terminal.
      }
    });
  }, [tab]);

  const tabs = ["Problems", "Output", "Terminal"];

  return (
    <section className="ed-drawer" aria-label="Bottom panel">
      <div className="ed-dtabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            className="ed-dtab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
            {item === "Problems" && problems?.length > 0
              ? ` ${problems.length}`
              : ""}
          </button>
        ))}
      </div>

      <div className="ed-dbody" role="tabpanel">
        <div
          className="ed-terminal"
          style={{ display: tab === "Terminal" ? "flex" : "none" }}
        >
          <div
            ref={terminalElementRef}
            className="ed-xterm"
          />
          <div className="ed-terminal-status">
            {running ? "Running" : "Ready"}
            <span>Python / Docker</span>
          </div>
        </div>

        {tab === "Problems" && (
          <div className="ed-problems">
            {problems?.length ? (
              problems.map((problem, index) => (
                <div className="ed-problem" key={index}>
                  <span className="ed-problem-icon">●</span>
                  {problem}
                </div>
              ))
            ) : (
              <div className="ed-empty">
                No problems detected.
              </div>
            )}
          </div>
        )}

        {tab === "Output" && (
          <pre className="ed-output-content">
            {output || "Program output will appear here."}
          </pre>
        )}
      </div>
    </section>
  );
}

export default BottomPanel;
