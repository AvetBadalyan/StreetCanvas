import React from "react";

import { useServerStatus } from "../../../context/server-context";
import Button from "../../FormElements/Button/Button";
import "./ServerStatusBanner.scss";

// Roughly how long a cold start takes. Only paces the progress bar, so being a
// few seconds out is harmless.
const EXPECTED_BOOT_MS = 20000;

/** Explains a slow or failed API while the rest of the page still renders. */
const ServerStatusBanner = () => {
  const { status, elapsed, retry } = useServerStatus();

  if (status === "ready" || status === "checking") return null;

  const isOffline = status === "offline";
  const progress = Math.min(96, (elapsed / EXPECTED_BOOT_MS) * 100);

  return (
    <div
      className={`server-banner ${isOffline ? "server-banner--offline" : ""}`}
      role="status"
    >
      <div className="server-banner__inner">
        <p>
          {isOffline
            ? "We can't reach the server right now. It may be restarting."
            : "Waking the server up — it sleeps when nobody is using it. This takes a few seconds."}
        </p>
        {isOffline && (
          <Button size="small" variant="secondary" onClick={retry}>
            Try again
          </Button>
        )}
      </div>

      {!isOffline && (
        <div className="server-banner__progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

export default ServerStatusBanner;
