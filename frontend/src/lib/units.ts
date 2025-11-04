// Simple unit conversion helpers.  In a real implementation, this module
// should handle parsing strings like "2.5 h" and convert between time
// units.  Here we provide minimal examples.

export function parseTime(value: string): number {
  // Accept formats like "5", "5 s", "2.5 min", "1h".  Return seconds.
  const parts = value.trim().split(/\s+/);
  const num = parseFloat(parts[0]);
  const unit = parts[1] || 's';
  switch (unit) {
    case 's':
      return num;
    case 'min':
    case 'm':
      return num * 60;
    case 'h':
    case 'hr':
      return num * 3600;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}