import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, initialTheme, nextTheme, persistTheme, THEMES } from "../../lib/theme.js";

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => initialTheme());
  const isDark = theme === THEMES.DARK;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleToggle() {
    setTheme((current) => persistTheme(nextTheme(current)));
  }

  return (
    <button
      aria-label={`Use ${isDark ? "light" : "dark"} theme`}
      className="theme-toggle"
      title={`Use ${isDark ? "light" : "dark"} theme`}
      type="button"
      onClick={handleToggle}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
