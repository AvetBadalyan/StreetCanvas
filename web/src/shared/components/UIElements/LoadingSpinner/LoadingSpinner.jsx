import React from "react";

import "./LoadingSpinner.scss";

const LoadingSpinner = ({ asOverlay = false, small = false, label = "Loading" }) => {
  const spinner = (
    <span
      className={`spinner ${small ? "spinner--small" : ""}`}
      role="status"
      aria-label={label}
    />
  );

  return asOverlay ? <div className="spinner-overlay">{spinner}</div> : spinner;
};

export default LoadingSpinner;
