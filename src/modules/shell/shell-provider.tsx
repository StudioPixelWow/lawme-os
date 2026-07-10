"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ShellState = {
  commandOpen: boolean;
  assistantOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellState | null>(null);

/**
 * Shell UI state: the command bar and the עמית panel.
 * ⌘K / Ctrl+K toggles the command bar; Esc closes the topmost layer.
 * Future global providers (query, auth, theme) compose around this.
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        if (commandOpen) setCommandOpen(false);
        else if (assistantOpen) setAssistantOpen(false);
      }
    },
    [commandOpen, assistantOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const value = useMemo(
    () => ({ commandOpen, assistantOpen, setCommandOpen, setAssistantOpen }),
    [commandOpen, assistantOpen],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellState {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell must be used inside <ShellProvider>");
  }
  return context;
}
