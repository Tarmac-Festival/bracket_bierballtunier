import { format, parseISO } from 'date-fns';

export function DateTime({ datetime }: { datetime: string }) {
  const date = parseISO(datetime);
  return <time dateTime={datetime}>{format(date, 'd LLLL yyyy HH:mm')}</time>;
}

export function Time({ datetime }: { datetime: string }) {
  const date = parseISO(datetime);
  return <time dateTime={datetime}>{format(date, 'HH:mm')}</time>;
}

export function formatTime(datetime: string) {
  return format(parseISO(datetime), 'HH:mm');
}

/**
 * Comparator for Array.sort: negative when the first is earlier, positive when it is later
 * and zero when both are at the same time. Returning a boolean here would collapse "earlier"
 * and "same time" into 0 and let the next comparison decide the order.
 */
export function compareDateTime(datetime1: string, datetime2: string) {
  return parseISO(datetime1).getTime() - parseISO(datetime2).getTime();
}
