export function positionAlerts(position) {
  if (position.status && position.status !== "open") return [];
  const alerts = [];
  const currentValue = Number(position.currentValue || position.credit);
  const credit = Number(position.credit);
  const profitPct = credit > 0 ? (credit - currentValue) / credit : 0;
  const today = new Date();
  const expiry = new Date(`${position.expiry}T16:00:00`);
  const days = Math.ceil((expiry - today) / 86400000);

  if (profitPct >= 0.5 && profitPct <= 0.7) alerts.push("50%-70% profit target");
  if (currentValue >= credit * 2) alerts.push("Spread value 2x entry credit");
  if (Number(position.currentShortDelta ?? position.shortDelta ?? 0) >= 0.35) {
    alerts.push("Short delta 0.35+");
  }
  if (Number(position.underlying || Infinity) <= Number(position.shortStrike)) {
    alerts.push("Underlying at/below short strike");
  }
  if (days <= 2) alerts.push("Expiry risk window");

  return alerts;
}
