// usePendingJoin: gère le code d'invitation en attente entre l'arrivée
// sur l'URL ?join=CODE et l'auto-join post-auth.
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "pendingJoinCode";

export const usePendingJoin = () => {
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  // Au montage : lire l'URL et localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Lire la query string
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("join");

    if (codeFromUrl) {
      const sanitized = codeFromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (sanitized.length === 6) {
        // Stocker en localStorage pour survivre au signup
        localStorage.setItem(STORAGE_KEY, sanitized);
        setPendingCode(sanitized);

        // Nettoyer l'URL pour éviter de re-déclencher au refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("join");
        window.history.replaceState({}, "", url.toString());
        return;
      }
    }

    // 2. Sinon, lire localStorage (cas où l'user était déjà là avant signup)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPendingCode(stored);
    }
  }, []);

  const clearPending = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setPendingCode(null);
  }, []);

  return { pendingCode, clearPending };
};
