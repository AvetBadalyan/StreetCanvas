/** Renders a byte count for a user-facing message, e.g. "4 MB". */
const formatBytes = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
};

module.exports = { formatBytes };
