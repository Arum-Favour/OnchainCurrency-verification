/**
 * Fetches composited printable note data from the API.
 */
export async function fetchPrintableNote(serialNumber, token) {
  const response = await fetch(
    `/api/currency/printable/${encodeURIComponent(serialNumber)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate printable note');
  }

  return data;
}
