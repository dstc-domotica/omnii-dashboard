import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // During SSR, default to light mode
    if (!isBrowser()) {
      return "light";
    }
    
    // Check localStorage first
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored && (stored === "light" || stored === "dark")) {
        return stored;
      }
    } catch (e) {
      // localStorage might not be available
    }
    
    // Check system preference
    try {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (e) {
      // matchMedia might not be available
    }
    
    return "light";
  });

  useEffect(() => {
    if (!isBrowser()) return;
    
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // localStorage might not be available
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, setTheme, toggleTheme };
}

