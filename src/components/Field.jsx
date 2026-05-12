export function Field({ children, error, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <em>{error}</em> : null}
    </label>
  );
}

export function Toggle({ checked, label, name, onChange }) {
  return (
    <label className="toggle">
      <input checked={checked} name={name} type="checkbox" onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
