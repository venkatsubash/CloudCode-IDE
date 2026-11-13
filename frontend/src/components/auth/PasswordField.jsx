import { useState } from "react";

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="rg-field">
      <label className="rg-label" htmlFor={id}>
        {label}
      </label>

      <div className="rg-input-wrap">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="rg-input has-toggle"
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={`${id}-msg`}
        />

        <button
          type="button"
          className="rg-toggle"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {error ? (
        <p id={`${id}-msg`} className="rg-error">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-msg`}
          className={`rg-hint ${hint.good ? "good" : ""}`}
        >
          {hint.text}
        </p>
      ) : null}
    </div>
  );
}

export default PasswordField;