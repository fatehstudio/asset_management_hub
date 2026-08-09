export const REMINDER_START_DATE = '2026-08-01';

export const isReminderDateIncluded = (date) =>
  Boolean(date) && date >= REMINDER_START_DATE;
