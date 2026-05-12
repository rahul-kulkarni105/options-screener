export const money = (value) =>
  value == null || !Number.isFinite(Number(value))
    ? "n/a"
    : Number(value).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      });

export const pct = (value) =>
  value == null || !Number.isFinite(Number(value)) ? "n/a" : `${(Number(value) * 100).toFixed(1)}%`;

export const num = (value, digits = 2) =>
  value == null || !Number.isFinite(Number(value)) ? "n/a" : Number(value).toFixed(digits);

export function warningTone(text) {
  return /failed|inside|above|wide|high-beta|VIX|earnings|below|2x/i.test(text) ? "bad" : "warn";
}
