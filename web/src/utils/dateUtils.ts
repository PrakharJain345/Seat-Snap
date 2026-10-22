export function formatShowDate(dateStr: string): {
  badge: string;
  isToday: boolean;
  isTomorrow: boolean;
  timeStr: string;
  fullDateStr: string;
} {
  const showDate = new Date(dateStr);
  const now = new Date();

  // Reset hours for day comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const showDayStart = new Date(showDate.getFullYear(), showDate.getMonth(), showDate.getDate());

  const diffDays = Math.round((showDayStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = showDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) {
    return {
      badge: "Tonight",
      isToday: true,
      isTomorrow: false,
      timeStr,
      fullDateStr: `Tonight at ${timeStr}`,
    };
  }

  if (diffDays === 1) {
    return {
      badge: "Tomorrow",
      isToday: false,
      isTomorrow: true,
      timeStr,
      fullDateStr: `Tomorrow at ${timeStr}`,
    };
  }

  if (diffDays > 1 && diffDays < 7) {
    const weekday = showDate.toLocaleDateString(undefined, { weekday: "short" });
    return {
      badge: `This ${weekday}`,
      isToday: false,
      isTomorrow: false,
      timeStr,
      fullDateStr: `This ${weekday} • ${timeStr}`,
    };
  }

  const formattedDate = showDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return {
    badge: formattedDate,
    isToday: false,
    isTomorrow: false,
    timeStr,
    fullDateStr: `${formattedDate} • ${timeStr}`,
  };
}
