const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadTheme({ prefersDark = false, storedValue = "" } = {}) {
  const source = fs.readFileSync(path.join(__dirname, "theme.js"), "utf8");
  const script = `${source.replaceAll("export const ", "const ").replaceAll("export function ", "function ")}
globalThis.themeApi = {
  THEME_STORAGE_KEY,
  THEMES,
  applyTheme,
  initialTheme,
  isTheme,
  nextTheme,
  persistTheme,
  storedTheme,
  systemTheme
};`;
  const root = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const localStorage = {
    value: storedValue,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    }
  };
  const context = {
    document: { documentElement: root },
    localStorage,
    matchMedia: () => ({ matches: prefersDark })
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  return { api: context.themeApi, localStorage, root };
}

test("initialTheme prefers stored value over system preference", () => {
  const { api } = loadTheme({ prefersDark: true, storedValue: "light" });

  assert.equal(api.initialTheme(), "light");
});

test("initialTheme falls back to system preference", () => {
  const { api } = loadTheme({ prefersDark: true });

  assert.equal(api.initialTheme(), "dark");
});

test("theme helpers apply, persist, and toggle valid themes", () => {
  const { api, localStorage, root } = loadTheme();

  assert.equal(api.nextTheme("light"), "dark");
  assert.equal(api.nextTheme("dark"), "light");
  assert.equal(api.applyTheme("dark"), "dark");
  assert.equal(root.attributes["data-theme"], "dark");
  assert.equal(api.persistTheme("dark"), "dark");
  assert.equal(localStorage.value, "dark");
});

test("theme helpers normalize invalid values", () => {
  const { api, root } = loadTheme({ storedValue: "sepia" });

  assert.equal(api.storedTheme(), "");
  assert.equal(api.applyTheme("sepia"), "light");
  assert.equal(root.attributes["data-theme"], "light");
});
