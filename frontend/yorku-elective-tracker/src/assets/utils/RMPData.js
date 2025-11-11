let rmpCache = null;

export async function fetchRMPData() {
  if (rmpCache) return rmpCache;
  const response = await fetch("/data/yorku_RMP_data.json");
  if (!response.ok) {
    throw new Error("Failed to fetch RMP data");
  }
  const data = await response.json();
  rmpCache = data;
  return data;
}

// Normalize lookups to be case-insensitive and whitespace-safe
export async function getProfessorRating(firstName, lastName) {
  if (!firstName || !lastName) return null;

  const data = await fetchRMPData();
  const prof = data.find(
    (p) =>
      p.first.toLowerCase().trim() === firstName.toLowerCase().trim() &&
      p.last.toLowerCase().trim() === lastName.toLowerCase().trim()
  );

  return prof || null;
}
