
import { useState, useRef, useEffect } from "react";
import "./Settings.css";

import Logo from "../components/common/Logo";
import Icon from "../components/common/Icon";

import {
  DEFAULT_SETTINGS,
  THEMES,
  NAV,
} from "../data/settingsData";

function Switch({ id, checked, onChange, labelledBy }) {
  return (
    <div className="st-ctl">
      <span className="st-state" aria-hidden="true">
        {checked ? "ON" : "OFF"}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        className="st-switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

function Row({ id, title, hint, children }) {
  return (
    <div className="st-row">
      <div>
        <b id={`${id}-l`}>{title}</b>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Preview({ s }) {
  const t = THEMES[s.theme] || THEMES.dark;
  const bars = [60, 85, 40, 70, 90, 50, 75, 30];

  return (
    <>
      <p className="st-prev-label">Preview</p>
      <div
        className="st-prev"
        style={{ background: t.bg }}
        aria-label="Editor preview"
      >
        <pre
          className={`st-code ${s.wordWrap ? "wrap" : "nowrap"}`}
          style={{ color: t.fg, fontSize: s.fontSize }}
        >
          <span style={{ color: t.kw }}>def</span>{" "}
          binary_search(arr, target):
          {"\n"}
          <span style={{ color: t.dim }}>
            {"    # Returns the index of the target in a sorted list."}
          </span>
          {"\n"}
          {"    left, right = 0, len(arr) - 1"}
        </pre>

        {s.minimap && (
          <div className="st-map" aria-hidden="true">
            {bars.map((w, i) => (
              <i
                key={i}
                style={{ width: `${w}%`, background: t.fg }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function SettingsPage({
  settings: initialSettings = DEFAULT_SETTINGS,
  onProfileSave,
  onSettingsChange,
  onChangePassword,
  onLogout,
}) {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [pErrors, setPErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [s, setS] = useState(initialSettings);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwErrors, setPwErrors] = useState({});
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  // Fetch actual logged-in user from backend
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Session not found. Please log in again.");
        }

        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load profile.");
        }

        if (!data.user) {
          throw new Error("User details were not returned by the server.");
        }

        const actualProfile = {
          name: data.user.name || "",
          email: data.user.email || "",
        };

        if (active) {
          setProfile(actualProfile);
          setDraft(actualProfile);
          setProfileError("");
        }
      } catch (error) {
        if (active) {
          setProfileError(error.message);
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => clearTimeout(savedTimer.current);
  }, []);

  // Editor settings
  const update = (patch) => {
    const next = {
      ...s,
      ...patch,
    };

    setS(next);

    if (onSettingsChange) {
      onSettingsChange(next);
    }

    setSaved(true);
    clearTimeout(savedTimer.current);

    savedTimer.current = setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  // Save profile
  const saveProfile = async (e) => {
    e.preventDefault();

    const errs = {};

    if (!draft.name.trim()) {
      errs.name = "Enter your name.";
    }

    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) {
      errs.email = "Enter a valid email address.";
    }

    setPErrors(errs);

    if (Object.keys(errs).length) return;

    setSavingProfile(true);

    try {
      const next = {
        name: draft.name.trim(),
        email: draft.email.trim(),
      };

      if (!onProfileSave) {
        throw new Error("Profile editing API is not connected yet.");
      }

      await onProfileSave(next);

      setProfile(next);
      setEditing(false);
    } catch (error) {
      setPErrors({
        email: error.message || "Couldn't save your profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const submitPassword = async (e) => {
    e.preventDefault();

    const errs = {};

    if (!pw.current) {
      errs.current = "Enter your current password.";
    }

    if (pw.next.length < 8) {
      errs.next = "Use at least 8 characters.";
    }

    if (pw.confirm !== pw.next) {
      errs.confirm = "Passwords don't match.";
    }

    setPwErrors(errs);

    if (Object.keys(errs).length) return;

    setPwBusy(true);

    try {
      if (!onChangePassword) {
        throw new Error("Password update API is not connected yet.");
      }

      await onChangePassword(pw.current, pw.next);

      setPw({
        current: "",
        next: "",
        confirm: "",
      });

      setPwOpen(false);
      setPwDone(true);
    } catch (error) {
      setPwErrors({
        current: error.message || "Couldn't change your password.",
      });
    } finally {
      setPwBusy(false);
    }
  };

  const logout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = "/logout";
    }
  };

  const pwField = (key, label, auto) => (
    <div className="st-field">
      <label htmlFor={`pw-${key}`}>{label}</label>
      <input
        id={`pw-${key}`}
        type="password"
        className="st-input"
        autoComplete={auto}
        value={pw[key]}
        onChange={(e) =>
          setPw({
            ...pw,
            [key]: e.target.value,
          })
        }
        aria-invalid={!!pwErrors[key]}
      />
      {pwErrors[key] && (
        <p className="st-err">{pwErrors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="st">
      <aside className="st-side">
        <a className="st-logo" href="/">
          <Logo />
          CloudCode
        </a>

        <nav className="st-nav" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={n.href}
              className="st-link"
              aria-current={n.id === "settings" ? "page" : undefined}
            >
              <Icon d={n.d} />
              {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <header className="st-top">
        <div className="st-user">
          <span className="st-avatar" aria-hidden="true">
            {profile.name.charAt(0).toUpperCase() || "U"}
          </span>
          {profile.name || "Loading..."}
        </div>
      </header>

      <main className="st-main">
        <h1>Profile &amp; settings</h1>

        <p className="st-lead">
          Manage your account and how the editor looks and behaves.
        </p>

        {/* Profile */}
        <section className="st-sec" aria-labelledby="h-profile">
          <div className="st-sec-head">
            <h2 id="h-profile">Profile</h2>
          </div>

          <div className="st-card st-profile">
            {profileLoading ? (
              <p>Loading your profile...</p>
            ) : profileError ? (
              <div>
                <p className="st-err">{profileError}</p>
                <button
                  className="st-btn ghost"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <span className="st-big" aria-hidden="true">
                  {profile.name.charAt(0).toUpperCase() || "U"}
                </span>

                <div className="st-info">
                  {editing ? (
                    <form onSubmit={saveProfile} noValidate>
                      <div className="st-form">
                        <div className="st-field">
                          <label htmlFor="p-name">Name</label>
                          <input
                            id="p-name"
                            className="st-input"
                            autoComplete="name"
                            value={draft.name}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                name: e.target.value,
                              })
                            }
                            aria-invalid={!!pErrors.name}
                          />
                          {pErrors.name && (
                            <p className="st-err">{pErrors.name}</p>
                          )}
                        </div>

                        <div className="st-field">
                          <label htmlFor="p-email">Email</label>
                          <input
                            id="p-email"
                            type="email"
                            className="st-input"
                            autoComplete="email"
                            value={draft.email}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                email: e.target.value,
                              })
                            }
                            aria-invalid={!!pErrors.email}
                          />
                          {pErrors.email && (
                            <p className="st-err">{pErrors.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="st-btns">
                        <button
                          type="submit"
                          className="st-btn"
                          disabled={savingProfile}
                        >
                          {savingProfile ? "Saving..." : "Save changes"}
                        </button>

                        <button
                          type="button"
                          className="st-btn ghost"
                          onClick={() => {
                            setDraft(profile);
                            setEditing(false);
                            setPErrors({});
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <dl className="st-dl">
                        <dt>Name</dt>
                        <dd>{profile.name}</dd>

                        <dt>Email</dt>
                        <dd>{profile.email}</dd>
                      </dl>

                      <button
                        className="st-btn ghost"
                        onClick={() => {
                          setDraft(profile);
                          setEditing(true);
                        }}
                      >
                        Edit profile
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Editor settings */}
        <section className="st-sec" aria-labelledby="h-editor">
          <div className="st-sec-head">
            <h2 id="h-editor">Editor settings</h2>
            <span className="st-saved" role="status">
              {saved ? "Saved" : ""}
            </span>
          </div>

          <div className="st-card">
            <Row
              id="theme"
              title="Theme"
              hint="Colors used in the code editor."
            >
              <select
                className="st-select"
                aria-labelledby="theme-l"
                value={s.theme}
                onChange={(e) => update({ theme: e.target.value })}
              >
                {Object.entries(THEMES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Row>

            <Row
              id="font"
              title="Font size"
              hint="Between 10 and 24 pixels."
            >
              <div className="st-step" role="group" aria-labelledby="font-l">
                <button
                  type="button"
                  aria-label="Decrease font size"
                  disabled={s.fontSize <= 10}
                  onClick={() =>
                    update({ fontSize: s.fontSize - 1 })
                  }
                >
                  −
                </button>

                <output aria-live="polite">{s.fontSize}px</output>

                <button
                  type="button"
                  aria-label="Increase font size"
                  disabled={s.fontSize >= 24}
                  onClick={() =>
                    update({ fontSize: s.fontSize + 1 })
                  }
                >
                  +
                </button>
              </div>
            </Row>

            <Row
              id="wrap"
              title="Word wrap"
              hint="Wrap long lines instead of scrolling sideways."
            >
              <Switch
                labelledBy="wrap-l"
                checked={s.wordWrap}
                onChange={(v) => update({ wordWrap: v })}
              />
            </Row>

            <Row
              id="map"
              title="Minimap"
              hint="Show a small overview of the file on the right."
            >
              <Switch
                labelledBy="map-l"
                checked={s.minimap}
                onChange={(v) => update({ minimap: v })}
              />
            </Row>

            <Row
              id="auto"
              title="Auto save"
              hint="Save your files automatically as you type."
            >
              <Switch
                labelledBy="auto-l"
                checked={s.autoSave}
                onChange={(v) => update({ autoSave: v })}
              />
            </Row>
          </div>

          <Preview s={s} />
        </section>

        {/* Security */}
        <section className="st-sec" aria-labelledby="h-sec">
          <div className="st-sec-head">
            <h2 id="h-sec">Security</h2>
          </div>

          <div className="st-card">
            <Row
              id="pw"
              title="Password"
              hint="Choose a new password for your account."
            >
              <button
                className="st-btn ghost"
                aria-expanded={pwOpen}
                onClick={() => {
                  setPwOpen((o) => !o);
                  setPwDone(false);
                  setPwErrors({});
                }}
              >
                Change password
              </button>
            </Row>

            {pwDone && (
              <div className="st-pw">
                <p className="st-ok" role="status" style={{ margin: 0 }}>
                  Password updated.
                </p>
              </div>
            )}

            {pwOpen && (
              <form className="st-pw" onSubmit={submitPassword} noValidate>
                <div className="st-form">
                  {pwField("current", "Current password", "current-password")}
                  {pwField("next", "New password", "new-password")}
                  {pwField("confirm", "Confirm new password", "new-password")}
                </div>

                <div className="st-btns">
                  <button
                    type="submit"
                    className="st-btn"
                    disabled={pwBusy}
                  >
                    {pwBusy ? "Updating..." : "Update password"}
                  </button>

                  <button
                    type="button"
                    className="st-btn ghost"
                    onClick={() => setPwOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <Row
              id="out"
              title="Log out"
              hint="Sign out of CloudCode on this device."
            >
              <button className="st-btn danger" onClick={logout}>
                Log out
              </button>
            </Row>
          </div>
        </section>
      </main>
    </div>
  );
}
