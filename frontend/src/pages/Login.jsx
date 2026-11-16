import { useState, useRef, useEffect } from "react";
import "./login.css";
import Logo from "../components/common/Logo";
import { LOGIN_TERMINAL_LINES } from "../Data/LoginData";
import { API_URL } from "../config/api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const validate = () => {
    const e = {};

    if (!email.trim()) {
      e.email = "Enter your email address.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      e.email = "Enter a valid email, like you@example.com.";
    }

    if (!password) {
      e.password = "Enter your password.";
    }

    return e;
  };

  
const submit = async (ev) => {
  ev.preventDefault();

  setFormError("");

  const e = validate();
  setErrors(e);

  if (Object.keys(e).length) return;

  setLoading(true);

  try {
    const res = await fetch(API_URL("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed. Try again.");
    }

    // Save login information
    const storage = remember ? localStorage : sessionStorage;

    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    storage.setItem("token", data.token);
    storage.setItem("user", JSON.stringify(data.user));

    if (onLogin) {
      onLogin({
        email: data.user.email,
        remember,
        user: data.user,
        token: data.token,
      });
    } else {
      window.location.href = "/dashboard";
    }

  } catch (err) {
    if (mounted.current) {
      setFormError(err.message || "Sign in failed. Try again.");
    }
  } finally {
    if (mounted.current) {
      setLoading(false);
    }
  }
};


  return (
    <div className="lg">

      <div className="lg-left">

        <a className="lg-logo" href="/">
          <Logo />
          CloudCode
        </a>

        <main className="lg-main">

          <h1>Welcome back</h1>

          <p className="lg-sub">
            Sign in to your cloud workspace.
          </p>

          <form onSubmit={submit} noValidate>

            {formError && (
              <div className="lg-alert" role="alert">
                {formError}
              </div>
            )}

            <div className="lg-field">

              <label
                className="lg-label"
                htmlFor="email"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                className="lg-input"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? "email-err" : undefined
                }
              />

              {errors.email && (
                <p id="email-err" className="lg-error">
                  {errors.email}
                </p>
              )}

            </div>

            <div className="lg-field">

              <div className="lg-label">

                <label htmlFor="password">
                  Password
                </label>

                <a href="/forgot-password">
                  Forgot password?
                </a>

              </div>

              <div className="lg-input-wrap">

                <input
                  id="password"
                  type={show ? "text" : "password"}
                  className="lg-input has-toggle"
                  placeholder="Your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "pw-err" : undefined
                  }
                />

                <button
                  type="button"
                  className="lg-toggle"
                  onClick={() => setShow((s) => !s)}
                  aria-pressed={show}
                >
                  {show ? "Hide" : "Show"}
                </button>

              </div>

              {errors.password && (
                <p id="pw-err" className="lg-error">
                  {errors.password}
                </p>
              )}

            </div>

            <label className="lg-check">

              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />

              Remember me

            </label>

            <button
              type="submit"
              className="lg-submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

          </form>

          <p className="lg-alt">
            Don't have an account?{" "}
            <a href="/signup">
              Register
            </a>
          </p>

        </main>

        <a className="lg-back" href="/">
          ← Back to CloudCode
        </a>

      </div>

      <aside
        className="lg-right"
        aria-hidden="true"
      >
        <div className="lg-term">

          <p className="tag">
            Your code is waiting where you left it.
          </p>

          <pre className="lg-log">
            {LOGIN_TERMINAL_LINES.map((line, index) => (
              <span
                key={index}
                className={
                  line.type === "success"
                    ? "ok"
                    : line.type === "command"
                    ? "dim"
                    : ""
                }
              >
                {line.text}
                {"\n"}
              </span>
            ))}
          </pre>

        </div>
      </aside>

    </div>
  );
}