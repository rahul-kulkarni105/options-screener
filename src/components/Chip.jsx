export function Chip({ children, tone = "" }) {
  return <span className={`chip ${tone}`.trim()}>{children}</span>;
}
