
import { useState, useRef, useEffect } from "react";
import "./Register.css";

import Logo from "../components/common/Logo";
import PasswordField from "../components/auth/PasswordField";
import { REGISTER_TERMINAL_LINES } from "../Data/registerData";
import { API_URL } from "../config/api";

export default function RegisterPage({ onRegister }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const set = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  const validate = () => {
    const validationErrors = {};

    if (!form.name.trim()) {
      validationErrors.name = "Enter your full name.";
    }

    if (!form.email.trim()) {
      validationErrors.email = "Enter your email address.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      validationErrors.email =
        "Enter a valid email, like you@example.com.";
    }

    if (form.password.length < 8) {
      validationErrors.password = "Use at least 8 characters.";
    }

    if (!form.confirm) {
      validationErrors.confirm = "Enter your password again.";
    } else if (form.confirm !== form.password) {
      validationErrors.confirm = "Passwords don't match.";
    }

    if (!agree) {
      validationErrors.agree =
        "Agree to the Terms to create your account.";
    }

    return validationErrors;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setFormError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed. Please try again."
        );
      }

      if (!data.user) {
        throw new Error(
          "Account was created, but the server returned an unexpected response."
        );
      }

      if (!mounted.current) return;

      if (onRegister) {
        onRegister({
          name: data.user.name,
          email: data.user.email,
        });
      }

      setDone(true);
    } catch (error) {
      if (mounted.current) {
        setFormError(
          error.message || "Couldn't create your account. Try again."
        );
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const pwHint = form.password
    ? form.password.length >= 8
      ? { text: "Looks good.", good: true }
      : {
          text: `${8 - form.password.length} more characters needed.`,
          good: false,
        }
    : {
        text: "Use at least 8 characters.",
        good: false,
      };

  return (
    <div className="rg">
      <div className="rg-left">
        <a className="rg-logo" href="/">
          <Logo />
          CloudCode
        </a>

        <main className="rg-main">
          {done ? (
            <div className="rg-done" role="status">
              <h1>You're in</h1>

              <p>
                Your account is ready. Open your workspace and run your first
                program.
              </p>

              <a href="/login">Continue to Login</a>
            </div>
          ) : (
            <>
              <h1>Create your account</h1>

              <p className="rg-sub">Start coding in the cloud.</p>

              <form onSubmit={submit} noValidate>
                {formError && (
                  <div className="rg-alert" role="alert">
                    {formError}
                  </div>
                )}

                <div className="rg-field">
                  <label className="rg-label" htmlFor="name">
                    Full name
                  </label>

                  <input
                    id="name"
                    className="rg-input"
                    autoComplete="name"
                    value={form.name}
                    onChange={set("name")}
                    aria-invalid={!!errors.name}
                    aria-describedby={
                      errors.name ? "name-err" : undefined
                    }
                  />

                  {errors.name && (
                    <p id="name-err" className="rg-error">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="rg-field">
                  <label className="rg-label" htmlFor="email">
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    className="rg-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={set("email")}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? "email-err" : undefined
                    }
                  />

                  {errors.email && (
                    <p id="email-err" className="rg-error">
                      {errors.email}
                    </p>
                  )}
                </div>

                <PasswordField
                  id="password"
                  label="Password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  error={errors.password}
                  hint={pwHint}
                />

                <PasswordField
                  id="confirm"
                  label="Confirm password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  error={errors.confirm}
                />

                <label
                  className={`rg-check ${errors.agree ? "" : "rg-gap"}`}
                >
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(event) => setAgree(event.target.checked)}
                    aria-invalid={!!errors.agree}
                  />

                  <span>
                    I agree to the <a href="/terms">Terms</a>
                  </span>
                </label>

                {errors.agree && (
                  <p className="rg-error rg-terms-err" role="alert">
                    {errors.agree}
                  </p>
                )}

                <button
                  type="submit"
                  className="rg-submit"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="rg-alt">
                Already have an account? <a href="/login">Log in</a>
              </p>
            </>
          )}
        </main>

        <a className="rg-back" href="/">
          ← Back to CloudCode
        </a>
      </div>

      <aside className="rg-right" aria-hidden="true">
        <div className="rg-side">
          <p className="tag">
            Your first program runs in under a second.
          </p>

          <pre className="rg-log">
            {REGISTER_TERMINAL_LINES.map((line, index) => (
              <span key={index} className={line.type}>
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
