function logInfo(message, extra = {}) {
  console.log(`[INFO] ${message}`, extra);
}

function logError(message, extra = {}) {
  console.error(`[ERROR] ${message}`, extra);
}

module.exports = { logInfo, logError };
