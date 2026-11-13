
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import { LANGS, ICONS } from "../../Data/editorData";

function Toolbar({
  project,
  lang,
  onLang,
  onSave,
  onRun,
  onStop,
  onShare,
  running,
  saved,
  userName,
}) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleNavigate = (path) => {
    setProfileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setProfileOpen(false);
    navigate("/logout");
  };

  return (
    <header className="ed-bar">

      {/* Brand */}
      <button
        type="button"
        className="ed-logo"
        onClick={() => handleNavigate("/dashboard")}
        title="Go to Dashboard"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span className="ed-logo-icon">
          <svg
            viewBox="0 0 32 32"
            width="27"
            height="27"
            aria-hidden="true"
          >
            <rect
              width="32"
              height="32"
              rx="8"
              fill="#2a56f0"
            />
            <path
              d="m13 11-5 5 5 5M19 11l5 5-5 5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span>CloudCode</span>
      </button>

      <span className="ed-sep" />

      {/* Current project */}
      <span
        className="ed-proj"
        title={project || "Untitled Project"}
      >
        {project || "Untitled Project"}
      </span>

      {/* Language selection */}
      <select
        className="ed-select"
        aria-label="Programming language"
        value={lang}
        onChange={(event) => onLang(event.target.value)}
        title="Select programming language"
        disabled={running}
      >
        {Object.keys(LANGS).map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>

      <span className="ed-spacer" />

      {/* Save status */}
      <span
        className="ed-saved"
        role="status"
        title={saved ? "All changes saved" : "Unsaved changes"}
      >
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            marginRight: 6,
            background: saved ? "#23d18b" : "#e2c08d",
          }}
        />
        {saved ? "Saved" : "Unsaved"}
      </span>

      {/* Save button */}
      <button
        type="button"
        className="ed-btn"
        onClick={onSave}
        title="Save current file"
        disabled={running}
      >
        <Icon d={ICONS.save} />
        <span>Save</span>
      </button>

      {/* Run / Stop button */}
      {running ? (
        <button
          type="button"
          className="ed-btn"
          onClick={onStop}
          title="Stop code execution"
          style={{
            background: "#dc2626",
            color: "#ffffff",
            border: "1px solid #dc2626",
          }}
        >
          <span aria-hidden="true">■</span>
          <span>Stop</span>
        </button>
      ) : (
        <button
          type="button"
          className="ed-btn run"
          onClick={onRun}
          title="Run code"
        >
          <Icon d={ICONS.run} />
          <span>Run</span>
        </button>
      )}

      {/* Share button */}
      <button
        type="button"
        className="ed-btn"
        onClick={onShare}
        title="Share project"
      >
        <Icon d={ICONS.share} />
        <span>Share</span>
      </button>

      {/* Profile dropdown */}
      <div className="ed-profile" ref={profileRef}>
        <button
          type="button"
          className="ed-avatar"
          onClick={() =>
            setProfileOpen((previous) => !previous)
          }
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          title={userName || "Profile"}
        >
          {userName?.charAt(0).toUpperCase() || "U"}
        </button>

        {profileOpen && (
          <div
            className="ed-profile-menu"
            role="menu"
            aria-label="Account menu"
          >
            <div className="ed-profile-info">
              <div className="ed-profile-name">
                {userName || "Developer"}
              </div>

              <div className="ed-profile-label">
                CloudCode account
              </div>
            </div>

            <div className="ed-profile-divider" />

            <button
              type="button"
              className="ed-profile-item"
              role="menuitem"
              onClick={() => handleNavigate("/dashboard")}
            >
              <span aria-hidden="true">⌂</span>
              Dashboard
            </button>

            <button
              type="button"
              className="ed-profile-item"
              role="menuitem"
              onClick={() => handleNavigate("/profile")}
            >
              <span aria-hidden="true">◉</span>
              View Profile
            </button>

            <div className="ed-profile-divider" />

            <button
              type="button"
              className="ed-profile-item logout"
              role="menuitem"
              onClick={handleLogout}
            >
              <span aria-hidden="true">↪</span>
              Logout
            </button>
          </div>
        )}
      </div>

    </header>
  );
}

export default Toolbar;
