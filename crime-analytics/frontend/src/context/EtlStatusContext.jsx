import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchEtlStatus } from "../services/api";

const EtlStatusContext = createContext(null);

export function EtlStatusProvider({ children }) {
  const [statusInfo, setStatusInfo] = useState({
    status: "idle",
    error: null,
    source_file: null,
    auto_import_enabled: true,
    auto_import_triggered: false,
  });
  const [isChecking, setIsChecking] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const lastTerminalStatusRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const pollStatus = async () => {
      try {
        const nextStatus = await fetchEtlStatus();
        if (cancelled) return;

        setStatusInfo(nextStatus);
        setIsChecking(false);

        const terminalStatus = nextStatus.status;
        if (terminalStatus === "running") {
          lastTerminalStatusRef.current = "running";
        }
        if (
          ["completed", "skipped"].includes(terminalStatus) &&
          lastTerminalStatusRef.current !== terminalStatus
        ) {
          setDataVersion((value) => value + 1);
        }
        if (["completed", "skipped", "failed"].includes(terminalStatus)) {
          lastTerminalStatusRef.current = terminalStatus;
        }

        const pollDelay = terminalStatus === "running" ? 2000 : 15000;
        timeoutId = window.setTimeout(pollStatus, pollDelay);
      } catch {
        if (cancelled) return;
        setIsChecking(false);
        timeoutId = window.setTimeout(pollStatus, 15000);
      }
    };

    pollStatus();
    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const value = useMemo(() => {
    const status = statusInfo?.status || "idle";
    return {
      status,
      statusInfo,
      isChecking,
      isRunning: status === "running",
      isWaitingForImport: isChecking || status === "running",
      dataVersion,
    };
  }, [dataVersion, isChecking, statusInfo]);

  return (
    <EtlStatusContext.Provider value={value}>
      {children}
    </EtlStatusContext.Provider>
  );
}

export function useEtlStatus() {
  const context = useContext(EtlStatusContext);
  if (!context) {
    throw new Error("useEtlStatus must be used inside EtlStatusProvider");
  }
  return context;
}
