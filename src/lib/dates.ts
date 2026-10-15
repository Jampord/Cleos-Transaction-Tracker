// Start and end of a local calendar day, in ms since epoch.
export function dayRange(d: Date = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return { start, end };
}

export const formatDate = (ms: number) => new Date(ms).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

export const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
