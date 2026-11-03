const datetimeFormats = {
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  long: { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
  dateTime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  time: { hour: "2-digit", minute: "2-digit" },
} as const;

export default defineI18nConfig(() => ({
  fallbackLocale: "de",
  datetimeFormats: { de: datetimeFormats, fr: datetimeFormats, it: datetimeFormats },
}));
