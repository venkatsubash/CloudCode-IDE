import { useEffect, useRef, useState } from "react";
import "./home.css";

const SAMPLES = {
  Python: {
    file: "main.py",
    code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fib(10)))`,
    out: "[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]",
    ms: 84,
  },

  C: {
    file: "main.c",
    code: `#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 3; i++)
        printf("Hello #%d\\n", i);
    return 0;
}`,
    out: "Hello #1\nHello #2\nHello #3",
    ms: 121,
  },

  "C++": {
    file: "main.cpp",
    code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{3, 1, 2};
    for (int x : v)
        std::cout << x * x << " ";
}`,
    out: "9 1 4",
    ms: 138,
  },

  Java: {
    file: "Main.java",
    code: `public class Main {
    public static void main(String[] args) {
        String s = "CloudCode";
        System.out.println(s.length());
    }
}`,
    out: "9",
    ms: 212,
  },

  JavaScript: {
    file: "index.js",
    code: `const langs = ["Python", "C", "C++", "Java", "JS"];
console.log(langs.map(l => l.length));`,
    out: "[ 6, 1, 3, 4, 2 ]",
    ms: 63,
  },
};

const langs = Object.keys(SAMPLES);

const STEPS = [
  {
    name: "Browser",
    note: "You write and submit code",
  },
  {
    name: "Cloud API",
    note: "Validates and queues the job",
  },
  {
    name: "Docker",
    note: "Runs it in an isolated container",
  },
  {
    name: "Output",
    note: "Results stream back to your screen",
  },
];

const REASONS = [
  {
    title: "Fast execution",
    text: "Warm containers start in milliseconds, so most programs finish quickly.",
    icon: (
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    ),
  },

  {
    title: "Cloud based",
    text: "Nothing to install. Open a tab on any device and your workspace is there.",
    icon: (
      <path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18H7Z" />
    ),
  },

  {
    title: "Secure",
    text: "Every run gets its own sandbox with strict time and memory limits.",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2a56f0" />
      <path
        d="m13 11-5 5 5 5M19 11l5 5-5 5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditorDemo() {
  const [lang, setLang] = useState("Python");
  const [state, setState] = useState("idle");
  const timer = useRef(null);

  const sample = SAMPLES[lang];

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  const pickLanguage = (language) => {
    clearTimeout(timer.current);
    setLang(language);
    setState("idle");
  };

  const runCode = () => {
    setState("running");

    timer.current = setTimeout(() => {
      setState("done");
    }, 700);
  };

  return (
    <div className="cc-editor" aria-label="Live code editor demo">

      <div className="cc-tabs" role="tablist">
        {langs.map((language) => (
          <button
            key={language}
            role="tab"
            aria-selected={language === lang}
            className="cc-tab"
            onClick={() => pickLanguage(language)}
          >
            {language}
          </button>
        ))}
      </div>

      <div className="cc-bar">
        <span>{sample.file}</span>

        <button
          className="cc-run"
          onClick={runCode}
          disabled={state === "running"}
        >
          {state === "running" ? "Running..." : "Run"}
        </button>
      </div>

      <pre className="cc-code">{sample.code}</pre>

      <pre className="cc-out" aria-live="polite">

        {state === "idle" && (
          <span className="dim">
            Press Run to execute this code in the cloud.
          </span>
        )}

        {state === "running" && (
          <span className="dim">
            Starting container
            <span className="cc-caret">▍</span>
          </span>
        )}

        {state === "done" && (
          <>
            {sample.out}
            {"\n"}
            <span className="ok">
              Finished in {sample.ms} ms
            </span>
          </>
        )}

      </pre>
    </div>
  );
}

export default function Home() {
  return (
    <div className="cc">

      <div className="cc-wrap">

        {/* Navbar */}

        <header className="cc-nav">

          <a className="cc-logo" href="/">
            <Logo />
            <span>CloudCode</span>
          </a>

          <nav className="cc-nav-links">

            <a href="#how" className="hide-sm">
              How it works
            </a>

            <a href="#languages" className="hide-sm">
              Languages
            </a>

            <a href="/login">
              Log in
            </a>

            <a
              href="/register"
              className="cc-btn primary small"
            >
              Get started
            </a>

          </nav>

        </header>


        {/* Hero */}

        <main>

          <section className="cc-hero">

            <div>

              <h1>
                Build. Run.
                <br />
                Deploy. Anywhere.
              </h1>

              <p>
                A cloud development environment for writing
                and running code straight from your browser.
                No setup, no installs.
              </p>

              <div className="cc-cta">

                <a
                  href="/login"
                  className="cc-btn primary"
                >
                  Start coding
                </a>

                <a
                  href="#how"
                  className="cc-btn"
                >
                  Learn more
                </a>

              </div>

            </div>

            <EditorDemo />

          </section>


          {/* Why CloudCode */}

          <section className="cc-section">

            <h2>
              Why CloudCode?
            </h2>

            <p className="cc-lead">
              Everything you need to run code,
              without running anything yourself.
            </p>

            <div className="cc-reasons">

              {REASONS.map((reason) => (

                <div key={reason.title}>

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {reason.icon}
                  </svg>

                  <h3>
                    {reason.title}
                  </h3>

                  <p>
                    {reason.text}
                  </p>

                </div>

              ))}

            </div>

          </section>


          {/* How It Works */}

          <section
            className="cc-section"
            id="how"
          >

            <h2>
              How it works
            </h2>

            <p className="cc-lead">
              Your code takes four steps from
              your browser to your results.
            </p>

            <ol className="cc-pipe">

              {STEPS.map((step) => (

                <li key={step.name}>

                  <strong>
                    {step.name}
                  </strong>

                  <span>
                    {step.note}
                  </span>

                </li>

              ))}

            </ol>

          </section>


          {/* Languages */}

          <section
            className="cc-section"
            id="languages"
          >

            <h2>
              Supported languages
            </h2>

            <p className="cc-lead">
              Pick a language and start writing.
              Switch any time.
            </p>

            <div className="cc-langs">

              {langs.map((language) => (

                <span
                  key={language}
                  className="cc-lang"
                >
                  {language}
                </span>

              ))}

            </div>

          </section>


          {/* Final CTA */}

          <section className="cc-final">

            <h2>
              Ready to start coding?
            </h2>

            <a
              href="/login"
              className="cc-btn"
            >
              Start coding
            </a>

          </section>

        </main>


        {/* Footer */}

        <footer className="cc-foot">

          <span>
            © {new Date().getFullYear()} CloudCode
          </span>

          <span>
            Browser · Cloud API · Docker · Output
          </span>

        </footer>

      </div>

    </div>
  );
}