import { useState, useEffect, useCallback, useRef } from "react";

import { ping } from "../api/client";

// Long enough to cover a serverless cold start (a second or two) plus a slow
// first connection to Atlas, without leaving a visitor staring at a progress
// bar when the API is genuinely down.
const MAX_WAIT_MS = 60000;
// Below this the wake-up screen would flash and disappear, which is worse than
// not showing it at all.
const SLOW_THRESHOLD_MS = 1200;
const RETRY_DELAY_MS = 2500;

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/**
 * Probes the API on mount and keeps retrying while it boots.
 *
 * The API sleeps on free hosting, so the first request in a while pays a cold
 * start. Pages wait on `isReady` instead of each failing separately, which is
 * what lets the app tell "still starting" apart from "broken".
 *
 * @returns {{ status: "checking"|"waking"|"ready"|"offline", elapsed: number, retry: () => void }}
 */
export const useServerStatusState = () => {
  // Only three states are tracked; "waking" is derived below, since it is
  // purely a function of how long "checking" has lasted.
  const [status, setStatus] = useState("checking");
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const startedAt = useRef(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    startedAt.current = Date.now();
    setStatus("checking");
    setElapsed(0);

    // Drives the progress indicator on the wake-up screen.
    const ticker = setInterval(
      () => setElapsed(Date.now() - startedAt.current),
      250
    );

    const probe = async () => {
      while (!signal.aborted) {
        try {
          await ping(signal);
          if (!signal.aborted) setStatus("ready");
          return;
        } catch (err) {
          if (signal.aborted || err.name === "AbortError") return;

          if (Date.now() - startedAt.current > MAX_WAIT_MS) {
            setStatus("offline");
            return;
          }

          try {
            await sleep(RETRY_DELAY_MS, signal);
          } catch {
            return;
          }
        }
      }
    };

    probe();

    return () => {
      controller.abort();
      clearInterval(ticker);
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    status:
      status === "checking" && elapsed > SLOW_THRESHOLD_MS ? "waking" : status,
    elapsed,
    retry,
  };
};
