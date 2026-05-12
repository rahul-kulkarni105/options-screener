import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Chip } from "../../components/Chip.jsx";
import { Panel } from "../../components/Panel.jsx";
import { money, num, warningTone } from "../../lib/format.js";
import { positionAlerts } from "../../lib/positionAlerts.js";
import { clearPositions, closePosition, removePosition, updatePosition } from "./positionsSlice.js";

function editablePosition(position) {
  return {
    currentShortDelta: position.currentShortDelta ?? position.shortDelta ?? "",
    currentValue: position.currentValue ?? position.credit ?? "",
    notes: position.entryNotes ?? position.notes ?? "",
    status: position.status || "open",
    underlying: position.underlying ?? position.price ?? ""
  };
}

function PositionCard({ index, position }) {
  const dispatch = useDispatch();
  const [draft, setDraft] = useState(() => editablePosition(position));
  const [closeDraft, setCloseDraft] = useState({
    exitNotes: position.exitNotes || "",
    exitSide: position.exitSide || "debit",
    exitValue: position.exitValue ?? position.currentValue ?? position.credit ?? ""
  });
  const alerts = positionAlerts({ ...position, ...draft });
  const isClosed = (position.status || draft.status) === "closed";

  function updateDraft(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function updateCloseDraft(event) {
    const { name, value } = event.target;
    setCloseDraft((current) => ({ ...current, [name]: value }));
  }

  function saveUpdates() {
    dispatch(
      updatePosition({
        index,
        updates: {
          currentShortDelta: Number(draft.currentShortDelta),
          currentValue: Number(draft.currentValue),
          entryNotes: draft.notes,
          notes: draft.notes,
          status: draft.status,
          underlying: Number(draft.underlying)
        }
      })
    );
  }

  function closeTrackedPosition() {
    dispatch(
      closePosition({
        exitNotes: closeDraft.exitNotes,
        exitSide: closeDraft.exitSide,
        exitValue: Number(closeDraft.exitValue),
        index
      })
    );
    setDraft((current) => ({ ...current, status: "closed", currentValue: closeDraft.exitValue }));
  }

  return (
    <article className="position-card">
      <strong>
        {position.symbol} {position.expiry} {position.shortStrike}P/{position.longStrike}P
      </strong>
      <span>
        Credit {money(position.credit)} | Contracts {position.contracts} | Entry{" "}
        {new Date(position.trackedAt).toLocaleString()}
      </span>
      {position.realizedPnL != null ? (
        <span>Realized P/L {money(position.realizedPnL)}</span>
      ) : null}

      <div className="position-edit-grid">
        <label>
          <span>Mark</span>
          <input
            min="0"
            name="currentValue"
            step="0.01"
            type="number"
            value={draft.currentValue}
            onChange={updateDraft}
          />
        </label>
        <label>
          <span>Underlying</span>
          <input
            min="0"
            name="underlying"
            step="0.01"
            type="number"
            value={draft.underlying}
            onChange={updateDraft}
          />
        </label>
        <label>
          <span>Short delta</span>
          <input
            max="1"
            min="0"
            name="currentShortDelta"
            step="0.01"
            type="number"
            value={draft.currentShortDelta}
            onChange={updateDraft}
          />
        </label>
        <label>
          <span>Status</span>
          <select name="status" value={draft.status} onChange={updateDraft}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
      </div>

      <label className="position-notes">
        <span>Notes</span>
        <textarea name="notes" rows="2" value={draft.notes} onChange={updateDraft} />
      </label>

      <div className="chips">
        {alerts.length ? (
          alerts.map((alert) => (
            <Chip key={alert} tone={warningTone(alert)}>
              {alert}
            </Chip>
          ))
        ) : (
          <Chip>{isClosed ? "Closed" : "No active alerts"}</Chip>
        )}
      </div>

      <div className="close-row">
        <select name="exitSide" value={closeDraft.exitSide} onChange={updateCloseDraft}>
          <option value="debit">Exit debit</option>
          <option value="credit">Exit credit</option>
        </select>
        <input
          min="0"
          name="exitValue"
          step="0.01"
          type="number"
          value={closeDraft.exitValue}
          onChange={updateCloseDraft}
        />
        <button type="button" onClick={closeTrackedPosition}>
          Close
        </button>
      </div>

      <label className="position-notes">
        <span>Exit notes</span>
        <textarea
          name="exitNotes"
          rows="2"
          value={closeDraft.exitNotes}
          onChange={updateCloseDraft}
        />
      </label>

      <div className="actions">
        <button type="button" onClick={saveUpdates}>
          <Save size={15} />
          Save Update
        </button>
        <button type="button" onClick={() => dispatch(removePosition(index))}>
          Remove
        </button>
      </div>

      {position.updateHistory?.length ? (
        <span>Updates {num(position.updateHistory.length, 0)}</span>
      ) : null}
    </article>
  );
}

export function PositionMonitor() {
  const dispatch = useDispatch();
  const positions = useSelector((state) => state.positions);

  return (
    <Panel
      className="wide"
      title="Position Monitor"
      action={
        <button
          className="button button--ghost"
          type="button"
          onClick={() => dispatch(clearPositions())}
        >
          <Trash2 size={15} />
          Clear
        </button>
      }
    >
      {positions.length ? (
        <div className="position-grid">
          {positions.map((position, index) => (
            <PositionCard
              index={index}
              key={`${position.id}-${position.trackedAt}`}
              position={position}
            />
          ))}
        </div>
      ) : (
        <p className="empty">No tracked positions.</p>
      )}
    </Panel>
  );
}
