// =====================================================================
// Службові функції: адреси сторінок, дати українською, час читання,
// екранізація тексту. Дані не зберігає — усе береться з data.js.
// =====================================================================

import { rubrics, authors } from "./data.js";

// Корінь сайту рахується від розташування цього файлу (js/utils.js → ../).
// Тому посилання працюють і на Vercel, і в Live Server, і з 404-сторінки на будь-якій глибині.
const ROOT = new URL("../", import.meta.url);

export function url(path = "") {
  const u = new URL(path, ROOT);
  return u.pathname + u.search + u.hash;
}

const q = (key, value) => `?${key}=${encodeURIComponent(value)}`;

// Адреси сторінок. Якщо зміниться назва файлу сторінки — міняти тут.
export const links = {
  home: () => url(""),
  rubric: (id) => url(`rubric.html${q("id", id)}`),
  article: (id) => url(`article.html${q("id", id)}`),
  author: (id) => url(`author.html${q("id", id)}`),
  search: (query) => url(query ? `search.html${q("q", query)}` : "search.html"),
  events: (hash = "") => url(`events.html${hash ? `#${hash}` : ""}`),
  about: (hash = "") => url(`about.html${hash ? `#${hash}` : ""}`),
  asset: (path) => url(path),
};

// Екранізація будь-якого тексту перед вставкою в HTML.
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export const getRubric = (id) => rubrics.find((r) => r.id === id);
export const getAuthor = (id) => authors.find((a) => a.id === id);

// ---------- Дати ----------
// Дата з data.js ("2026-11-03" + "19:00") → об'єкт Date у місцевому часі.
export function toDate(date, time = "00:00") {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

const fmtFull = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" });
const fmtDayMonth = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" });
const fmtWeekday = new Intl.DateTimeFormat("uk-UA", { weekday: "long" });

// «3 листопада 2026» (без хвоста « р.»)
export function formatDate(date) {
  return fmtFull.format(toDate(date)).replace(/\s*р\.?$/u, "");
}

// «3 листопада»
export function formatDayMonth(date) {
  return fmtDayMonth.format(toDate(date));
}

// «вівторок»
export function formatWeekday(date) {
  return fmtWeekday.format(toDate(date));
}

// Частини дати для картки події: { day: "7", month: "листопада", weekday: "субота" }
export function dateParts(date) {
  const parts = fmtDayMonth.formatToParts(toDate(date));
  return {
    day: parts.find((p) => p.type === "day")?.value ?? "",
    month: parts.find((p) => p.type === "month")?.value ?? "",
    weekday: formatWeekday(date),
  };
}

// Машинний формат для <time datetime="">
export const isoDateTime = (date, time) => (time ? `${date}T${time}` : date);

// Date → "2026-11-03" (місцевий час)
export function toISODate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// «сьогодні, 13:15» · «вчора, 21:00» · «2 листопада, 21:00» (для стрічки «Актуальне»)
export function formatWhen(date, time, now = new Date()) {
  const today = toISODate(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  let day;
  if (date === today) day = "сьогодні";
  else if (date === toISODate(y)) day = "вчора";
  else day = formatDayMonth(date);
  return time ? `${day}, ${time}` : day;
}

// Тиждень (понеділок–неділя), у який потрапляє дата
export function weekRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (start.getDay() + 6) % 7; // 0 = понеділок
  start.setDate(start.getDate() - shift);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
}

// «2–8 листопада» або «30 листопада – 6 грудня»
export function formatRange(startISO, endISO) {
  const a = dateParts(startISO);
  const b = dateParts(endISO);
  return a.month === b.month ? `${a.day}–${b.day} ${b.month}` : `${a.day} ${a.month} – ${b.day} ${b.month}`;
}

// Сортування: найновіші першими.
export function byNewest(a, b) {
  return toDate(b.date, b.time) - toDate(a.date, a.time);
}

// ---------- Числа й відмінки ----------
// plural(5, ["матеріал", "матеріали", "матеріалів"]) → «матеріалів»
export function plural(n, [one, few, many]) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

// ---------- Час читання ----------
// Рахується з тексту матеріалу, ~200 слів за хвилину.
const WORDS_PER_MINUTE = 200;

export function readingMinutes(article) {
  const parts = [article.title, article.lead];
  for (const block of article.body || []) {
    if (block.text) parts.push(block.text);
  }
  const words = parts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function readingTime(article) {
  return `${readingMinutes(article)} хв читання`;
}
