const levels = ['error','warn','info','debug'];

function shouldLog(level) {
  if (process.env.QUIET === 'true' || process.env.LOG_LEVEL === 'silent') return false;
  const envLevel = process.env.LOG_LEVEL || 'info';
  const idx = levels.indexOf(level);
  const envIdx = levels.indexOf(envLevel);
  if (idx === -1) return false;
  return envIdx >= 0 ? idx <= envIdx : idx <= 2; // default to info
}

function log(level, ...args) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level.toUpperCase()}]`, ...args);
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
  child: (ns) => ({
    error: (...a) => log('error', `[${ns}]`, ...a),
    warn:  (...a) => log('warn',  `[${ns}]`, ...a),
    info:  (...a) => log('info',  `[${ns}]`, ...a),
    debug: (...a) => log('debug', `[${ns}]`, ...a)
  })
};