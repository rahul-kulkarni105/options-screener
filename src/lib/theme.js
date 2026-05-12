export const THEME_STORAGE_KEY = "putSpreadWeeklyScreener.theme";
export const THEMES = {
  DARK: "dark",
  LIGHT: "light"
};

export function isTheme(value) {
  return value === THEMES.LIGHT || value === THEMES.DARK;
}

export function systemTheme() {
  if (globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches) return THEMES.DARK;
  return THEMES.LIGHT;
}

export function storedTheme(storage = globalThis.localStorage) {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : "";
  } catch {
    return "";
  }
}

export function initialTheme(storage = globalThis.localStorage) {
  return storedTheme(storage) || systemTheme();
}

export function applyTheme(theme, root = globalThis.document?.documentElement) {
  const nextTheme = isTheme(theme) ? theme : THEMES.LIGHT;
  root?.setAttribute("data-theme", nextTheme);
  return nextTheme;
}

export function persistTheme(theme, storage = globalThis.localStorage) {
  const nextTheme = isTheme(theme) ? theme : THEMES.LIGHT;
  try {
    storage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // localStorage can be unavailable in hardened browser contexts.
  }
  return nextTheme;
}

export function nextTheme(theme) {
  return theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
}
