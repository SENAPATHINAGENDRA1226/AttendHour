import React from "react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  style,
}) => {
  if (!message) return null;

  return (
    <div className="error-banner" style={style} role="alert">
      <div className="error-banner-content">
        <span>⚠</span>
        <span>{message}</span>
      </div>
      {(onRetry || onDismiss) && (
        <div style={{ display: "flex", gap: "6px" }}>
          {onRetry && (
            <button className="btn secondary" type="button" onClick={onRetry}>
              Try again
            </button>
          )}
          {onDismiss && (
            <button className="btn secondary" type="button" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorBanner;
