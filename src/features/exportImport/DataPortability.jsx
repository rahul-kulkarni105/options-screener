import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Panel } from "../../components/Panel.jsx";
import { buildExportPayload, exportFilename, parseImportText } from "../../lib/exportImport.js";
import { replacePositions } from "../positions/positionsSlice.js";
import { loadCustomPresets, persistCustomPresets } from "../screener/presets.js";
import { replaceSettings } from "../screener/settingsSlice.js";

function downloadJson(payload) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFilename();
  link.click();
  URL.revokeObjectURL(url);
}

export function DataPortability({ onStatus }) {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const positions = useSelector((state) => state.positions);
  const fileInputRef = useRef(null);

  function handleExport() {
    downloadJson(
      buildExportPayload({
        customPresets: loadCustomPresets(),
        positions,
        settings
      })
    );
    onStatus?.("Local settings, presets, positions, and journal snapshot exported.");
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = parseImportText(await file.text());
      dispatch(replaceSettings(imported.settings));
      dispatch(replacePositions(imported.positions));
      persistCustomPresets(imported.customPresets);
      window.dispatchEvent(new Event("put-spread-presets-updated"));
      onStatus?.(
        `Imported ${imported.customPresets.length} presets and ${imported.positions.length} positions.`
      );
    } catch (error) {
      onStatus?.(error.message || "Import failed.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <Panel className="controls" title="Export / Import">
      <div className="data-actions">
        <button className="button button--ghost" type="button" onClick={handleExport}>
          <Download size={15} />
          Export Local Data
        </button>
        <button
          className="button button--ghost"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} />
          Import Backup
        </button>
      </div>
      <input
        ref={fileInputRef}
        accept="application/json"
        className="visually-hidden"
        type="file"
        onChange={handleImport}
      />
      <p className="preset-note">
        Export includes settings, custom presets, tracked positions, and a journal snapshot.
      </p>
    </Panel>
  );
}
