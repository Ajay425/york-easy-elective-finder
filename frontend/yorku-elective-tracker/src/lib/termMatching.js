export function termMatchesSelection(term, selection) {
  if (!selection) return true;

  const current = String(term || "").trim().toUpperCase();
  const selected = String(selection || "").trim().toUpperCase();
  if (!current || !selected) return false;

  return current === selected || current.startsWith(selected);
}
