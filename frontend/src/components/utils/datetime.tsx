import { format, parseISO } from 'date-fns';

import i18n from '../../../i18n';

export function DateTime({ datetime }: { datetime: string }) {
  const date = parseISO(datetime);
  return <time dateTime={datetime}>{format(date, 'd LLLL yyyy HH:mm')}</time>;
}

export function Time({ datetime, withDate = false }: { datetime: string; withDate?: boolean }) {
  return (
    <time dateTime={datetime}>{withDate ? formatDayAndTime(datetime) : formatTime(datetime)}</time>
  );
}

export function formatTime(datetime: string) {
  return format(parseISO(datetime), 'HH:mm');
}

/**
 * The calendar day, written the way the chosen language writes it and with the weekday in
 * front, so a tournament that runs over several days stays readable.
 */
export function formatDay(datetime: string) {
  return new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(parseISO(datetime));
}

export function formatDayAndTime(datetime: string) {
  return `${formatDay(datetime)} ${formatTime(datetime)}`;
}

/**
 * Whether the given moments fall on more than one calendar day. A time on its own only says
 * enough when everything happens on the same day.
 */
export function spansMultipleDays(datetimes: (string | null | undefined)[]) {
  const days = new Set(
    datetimes
      .filter((datetime): datetime is string => datetime != null)
      .map((datetime) => format(parseISO(datetime), 'yyyy-MM-dd')),
  );
  return days.size > 1;
}

/**
 * Comparator for Array.sort: negative when the first is earlier, positive when it is later
 * and zero when both are at the same time. Returning a boolean here would collapse "earlier"
 * and "same time" into 0 and let the next comparison decide the order.
 */
export function compareDateTime(datetime1: string, datetime2: string) {
  return parseISO(datetime1).getTime() - parseISO(datetime2).getTime();
}
