import { Check, Copy, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Toggle } from "../../components/Field.jsx";
import { Panel } from "../../components/Panel.jsx";
import {
  BUILT_IN_PRESETS,
  loadCustomPresets,
  makeCustomPreset,
  persistCustomPresets,
  presetSettingsFrom,
  uniquePresetName
} from "./presets.js";
import { applyPreset, resetSettings, saveSettings, updateSetting } from "./settingsSlice.js";

const numericFields = new Set([
  "minDelta",
  "maxDelta",
  "minCreditPct",
  "maxSpreadWidth",
  "minOpenInterest",
  "minVolume",
  "accountSize",
  "riskPerIdeaPct",
  "maxWeeklyRiskPct",
  "correlationGroupCapPct"
]);

function fieldError(validationErrors, name) {
  return validationErrors?.[name]?.[0] || "";
}

export function SettingsPanels({ onSaved, validationErrors }) {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const [customPresets, setCustomPresets] = useState(() => loadCustomPresets());
  const [selectedPresetKey, setSelectedPresetKey] = useState(`built-in:${BUILT_IN_PRESETS[0].id}`);
  const [presetName, setPresetName] = useState("");
  const presetOptions = useMemo(
    () => [
      ...BUILT_IN_PRESETS.map((preset) => ({
        ...preset,
        key: `built-in:${preset.id}`,
        kind: "built-in"
      })),
      ...customPresets.map((preset) => ({
        ...preset,
        key: `custom:${preset.id}`,
        kind: "custom"
      }))
    ],
    [customPresets]
  );
  const selectedPreset =
    presetOptions.find((preset) => preset.key === selectedPresetKey) || presetOptions[0];

  useEffect(() => {
    function reloadCustomPresets() {
      setCustomPresets(loadCustomPresets());
    }

    window.addEventListener("put-spread-presets-updated", reloadCustomPresets);
    return () => window.removeEventListener("put-spread-presets-updated", reloadCustomPresets);
  }, []);

  function handleChange(event) {
    const { checked, name, type, value } = event.target;
    dispatch(
      updateSetting({
        name,
        value: type === "checkbox" ? checked : numericFields.has(name) ? Number(value) : value
      })
    );
  }

  function handleSave() {
    dispatch(saveSettings());
    onSaved?.("Settings saved locally.");
  }

  function handlePresetSelect(event) {
    const key = event.target.value;
    const preset = presetOptions.find((item) => item.key === key);
    setSelectedPresetKey(key);
    setPresetName(preset?.kind === "custom" ? preset.name : "");
  }

  function handleApplyPreset() {
    if (!selectedPreset) return;
    dispatch(applyPreset(selectedPreset.settings));
    onSaved?.(`${selectedPreset.name} preset applied.`);
  }

  function handleDuplicatePreset() {
    if (!selectedPreset) return;
    const name = uniquePresetName(`${selectedPreset.name} Copy`, customPresets);
    const preset = makeCustomPreset({ name, settings: selectedPreset.settings });
    const nextPresets = persistCustomPresets([...customPresets, preset]);
    window.dispatchEvent(new Event("put-spread-presets-updated"));
    setCustomPresets(nextPresets);
    setSelectedPresetKey(`custom:${preset.id}`);
    setPresetName(preset.name);
    dispatch(applyPreset(preset.settings));
    onSaved?.(`${preset.name} saved locally.`);
  }

  function handleSaveCustomPreset() {
    const currentSettings = presetSettingsFrom(settings);
    const name =
      presetName.trim() ||
      uniquePresetName(`${selectedPreset?.name || "Custom Preset"} Copy`, customPresets);
    let savedPreset;
    let nextPresets;

    if (selectedPreset?.kind === "custom") {
      savedPreset = {
        id: selectedPreset.id,
        name,
        settings: currentSettings
      };
      nextPresets = persistCustomPresets(
        customPresets.map((preset) => (preset.id === selectedPreset.id ? savedPreset : preset))
      );
    } else {
      savedPreset = makeCustomPreset({
        name: uniquePresetName(name, customPresets),
        settings: currentSettings
      });
      nextPresets = persistCustomPresets([...customPresets, savedPreset]);
    }

    window.dispatchEvent(new Event("put-spread-presets-updated"));
    setCustomPresets(nextPresets);
    setSelectedPresetKey(`custom:${savedPreset.id}`);
    setPresetName(savedPreset.name);
    onSaved?.(`${savedPreset.name} preset saved locally.`);
  }

  function handleResetDefaults() {
    dispatch(resetSettings());
    onSaved?.("Conservative defaults restored.");
  }

  return (
    <>
      <Panel className="controls preset-panel" title="Strategy Presets">
        <div className="form-grid">
          <Field label="Preset">
            <select value={selectedPreset?.key || ""} onChange={handlePresetSelect}>
              <optgroup label="Built-in">
                {BUILT_IN_PRESETS.map((preset) => (
                  <option key={preset.id} value={`built-in:${preset.id}`}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
              {customPresets.length ? (
                <optgroup label="Custom">
                  {customPresets.map((preset) => (
                    <option key={preset.id} value={`custom:${preset.id}`}>
                      {preset.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </Field>
          <Field label="Custom preset name">
            <input
              name="presetName"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
            />
          </Field>
        </div>
        <div className="preset-actions">
          <button className="button button--ghost" type="button" onClick={handleApplyPreset}>
            <Check size={15} />
            Apply
          </button>
          <button className="button button--ghost" type="button" onClick={handleDuplicatePreset}>
            <Copy size={15} />
            Duplicate
          </button>
          <button className="button button--ghost" type="button" onClick={handleSaveCustomPreset}>
            <Save size={15} />
            Save Custom
          </button>
          <button className="button button--ghost" type="button" onClick={handleResetDefaults}>
            <RotateCcw size={15} />
            Defaults
          </button>
        </div>
        <p className="preset-note">Starting rules only; not advice or guaranteed edge.</p>
      </Panel>

      <Panel
        className="controls"
        title="Strategy Rules"
        action={
          <button className="button button--ghost" type="button" onClick={handleSave}>
            <Save size={15} />
            Save
          </button>
        }
      >
        <Field label="Symbol universe">
          <textarea name="universe" rows="3" value={settings.universe} onChange={handleChange} />
        </Field>
        <div className="form-grid">
          <Field error={fieldError(validationErrors, "expiry")} label="Expiry">
            <input
              min={new Date().toISOString().slice(0, 10)}
              name="expiry"
              type="date"
              value={settings.expiry}
              onChange={handleChange}
            />
          </Field>
          <Field label="Manual blocklist">
            <input
              name="manualBlocklist"
              value={settings.manualBlocklist}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "minDelta")} label="Min short delta">
            <input
              max="0.6"
              min="0.01"
              name="minDelta"
              step="0.01"
              type="number"
              value={settings.minDelta}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "maxDelta")} label="Max short delta">
            <input
              max="0.8"
              min="0.01"
              name="maxDelta"
              step="0.01"
              type="number"
              value={settings.maxDelta}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "minCreditPct")} label="Min credit % width">
            <input
              max="0.8"
              min="0.01"
              name="minCreditPct"
              step="0.01"
              type="number"
              value={settings.minCreditPct}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "maxSpreadWidth")} label="Max spread width">
            <input
              min="1"
              name="maxSpreadWidth"
              step="0.5"
              type="number"
              value={settings.maxSpreadWidth}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "minOpenInterest")} label="Min open interest">
            <input
              min="1"
              name="minOpenInterest"
              step="10"
              type="number"
              value={settings.minOpenInterest}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "minVolume")} label="Min volume">
            <input
              min="1"
              name="minVolume"
              step="1"
              type="number"
              value={settings.minVolume}
              onChange={handleChange}
            />
          </Field>
        </div>
      </Panel>

      <Panel className="controls" title="Market & Risk Rules">
        <div className="toggle-grid">
          <Toggle
            checked={settings.trendGate}
            label="Trend gate"
            name="trendGate"
            onChange={handleChange}
          />
          <Toggle
            checked={settings.vixGate}
            label="VIX regime gate"
            name="vixGate"
            onChange={handleChange}
          />
          <Toggle
            checked={settings.autoEvents}
            label="Auto events"
            name="autoEvents"
            onChange={handleChange}
          />
        </div>
        <div className="form-grid">
          <Field error={fieldError(validationErrors, "accountSize")} label="Account size">
            <input
              min="1"
              name="accountSize"
              step="1000"
              type="number"
              value={settings.accountSize}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "macroEventMode")} label="Macro events">
            <select name="macroEventMode" value={settings.macroEventMode} onChange={handleChange}>
              <option value="warn">Warn</option>
              <option value="block">Block candidates</option>
              <option value="ignore">Ignore</option>
            </select>
          </Field>
          <Field error={fieldError(validationErrors, "riskPerIdeaPct")} label="Risk per idea %">
            <input
              max="10"
              min="0.1"
              name="riskPerIdeaPct"
              step="0.1"
              type="number"
              value={settings.riskPerIdeaPct}
              onChange={handleChange}
            />
          </Field>
          <Field error={fieldError(validationErrors, "maxWeeklyRiskPct")} label="Max weekly risk %">
            <input
              max="50"
              min="0.1"
              name="maxWeeklyRiskPct"
              step="0.1"
              type="number"
              value={settings.maxWeeklyRiskPct}
              onChange={handleChange}
            />
          </Field>
          <Field
            error={fieldError(validationErrors, "correlationGroupCapPct")}
            label="Correlation cap %"
          >
            <input
              max="25"
              min="0.1"
              name="correlationGroupCapPct"
              step="0.1"
              type="number"
              value={settings.correlationGroupCapPct}
              onChange={handleChange}
            />
          </Field>
        </div>
        <Field label="Manual macro events">
          <textarea
            name="manualMacroEvents"
            placeholder={"2026-05-15 CPI\n2026-05-21 Jobs report"}
            rows="3"
            value={settings.manualMacroEvents}
            onChange={handleChange}
          />
        </Field>
      </Panel>
    </>
  );
}
