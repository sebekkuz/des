// Utility to convert arrays of objects to CSV strings.  Accepts an
// array of records and returns a CSV-formatted string with headers.

export function toCsv(records) {
  if (!records || records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const lines = [headers.join(',')];
  for (const rec of records) {
    const row = headers.map((h) => JSON.stringify(rec[h] ?? '')).join(',');
    lines.push(row);
  }
  return lines.join('\n');
}