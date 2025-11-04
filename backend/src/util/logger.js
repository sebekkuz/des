// Simple logger.  In a production system this would integrate with
// Winston or pino.  For now it prints timestamped messages to the
// console.

export function log(level, msg) {
  const time = new Date().toISOString();
  console.log(`[${time}] [${level.toUpperCase()}] ${msg}`);
}