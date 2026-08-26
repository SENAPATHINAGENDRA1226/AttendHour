import React from "react";

interface SpinnerProps {
  inline?: boolean;
  size?: "small" | "medium";
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  inline = false,
  size = "small",
  label,
  className = "",
}) => {
  const spinnerElement = <span className={`spinner ${size} ${className}`} aria-hidden="true" />;

  if (inline) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {spinnerElement}
        {label && <span>{label}</span>}
      </span>
    );
  }

  return (
    <div className="loading-container">
      {spinnerElement}
      <span>{label || "Loading…"}</span>
    </div>
  );
};

export default Spinner;
