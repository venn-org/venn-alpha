const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;
}

export function activeStatusText(lastActiveAt) {
  if (!lastActiveAt) return 'Offline';
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'Active now';
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Active ${days}d ago`;
}
