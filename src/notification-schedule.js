export const MANILA_TIME_ZONE = "Asia/Manila";

export const NOTIFICATION_SLOTS = [
  { id: "morning-glow", time: "11:15", displayTime: "11:15 AM", label: "Morning glow", prompt: "Pause, breathe, and speak something kind over your day." },
  { id: "evening-reset", time: "19:00", displayTime: "7:00 PM", label: "Evening reset", prompt: "Release the day and return to what matters." },
  { id: "midnight-release", time: "00:15", displayTime: "12:15 AM", label: "Midnight release", prompt: "Let today go gently. Rest is allowed." },
];

export function manilaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    dateCompact: `${value("year")}${value("month")}${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function getDueNotificationSlot(date = new Date(), graceMinutes = 10) {
  const parts = manilaDateParts(date);
  const currentMinute = parts.hour * 60 + parts.minute;
  const slot = NOTIFICATION_SLOTS.find(({ time }) => {
    const [hour, minute] = time.split(":").map(Number);
    const scheduledMinute = hour * 60 + minute;
    return currentMinute >= scheduledMinute && currentMinute <= scheduledMinute + graceMinutes;
  });
  return slot ? { ...slot, dateKey: parts.dateKey } : null;
}
