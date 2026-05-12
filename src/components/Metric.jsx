export function Metric({ label, value, tone = "" }) {
  return (
    <div className={`metric ${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
