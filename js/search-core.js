// =====================================================================
// Ядро пошуку (без бібліотек). Використовують підказки в шапці
// (js/search-suggest.js) і сторінка search.html (js/search.js).
//
// • Нормалізація: нижній регістр, усі апострофи → ', розділові знаки → пробіл,
//   зайві пробіли схлопуються. «ґ» і «г» НЕ змішуються.
// • Матеріал підходить, якщо містить УСІ слова запиту (у будь-яких полях).
// • Ранжування: заголовок > теги/рубрика > лід > автор > текст; при рівності новіші вище.
// =====================================================================

import { rubrics, articles, events } from "./data.js";
import { escapeHtml, getRubric, getAuthor, toDate } from "./utils.js";

const APOSTROPHES = /['’ʼ`‘]/g;
const PUNCTUATION = /[«»"“”„.,!?:;()…—–/\\[\]{}*+=<>|#№%]/g;

// Вага поля. Чим більше число — тим вище матеріал у результатах.
const ARTICLE_WEIGHTS = { title: 10, tags: 6, rubric: 6, lead: 4, author: 3, body: 1 };
const EVENT_WEIGHTS = { title: 10, rubric: 6, place: 4, description: 2 };

export function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Легке «обрізання закінчень», щоб «кав’ярня» знаходила «кав’ярні», а «студентів» — «студенти».
// Працює лише для слів від 5 літер; основа лишається щонайменше з 4 літер.
const ENDINGS = ["ами", "ями", "ії", "ія", "ію", "ові", "еві", "ого", "ому", "ими", "ій", "ий", "ої", "ою", "ею", "ів", "их", "ім", "ям", "ам", "ях", "ах", "ом", "ем", "а", "я", "о", "е", "у", "ю", "і", "ї", "и", "ь", "й"];
const MIN_STEM = 4;

function stem(word) {
  if (word.length < MIN_STEM + 1) return word;
  for (const end of ENDINGS) {
    if (word.endsWith(end) && word.length - end.length >= MIN_STEM) return word.slice(0, -end.length);
  }
  return word;
}

// Запит → унікальні слова (основи)
export function queryTerms(query) {
  const n = normalize(query);
  return n ? [...new Set(n.split(" ").filter(Boolean).map(stem))] : [];
}

const bodyText = (article) => (article.body || []).map((b) => b.text || "").join(" ");

// Індекс будується один раз, при першому пошуку
let articleIndex;
let eventIndex;

function buildIndex() {
  articleIndex = articles.map((a) => ({
    item: a,
    fields: {
      title: normalize(a.title),
      tags: normalize((a.tags || []).join(" ")),
      rubric: normalize(getRubric(a.rubric)?.name),
      lead: normalize(a.lead),
      author: normalize(getAuthor(a.author)?.name),
      body: normalize(bodyText(a)),
    },
  }));
  eventIndex = events.map((e) => ({
    item: e,
    fields: {
      title: normalize(e.title),
      rubric: normalize(getRubric(e.rubric)?.name),
      place: normalize(e.place),
      description: normalize(e.description),
    },
  }));
}

// Збіг на початку слова («кін» → «Кіно») важить повністю, усередині слова («закінчується») — 60%
const MID_WORD_FACTOR = 0.6;

function termWeight(text, term, weight) {
  const i = text.indexOf(term);
  if (i === -1) return 0;
  if (i === 0 || text[i - 1] === " " || ` ${text}`.includes(` ${term}`)) return weight;
  return weight * MID_WORD_FACTOR;
}

// Бал запису: сума найкращих ваг для кожного слова; 0 — якщо хоч одного слова немає
function score(entry, terms, weights) {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const [field, weight] of Object.entries(weights)) {
      if (weight > best) best = Math.max(best, termWeight(entry.fields[field], term, weight));
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

function run(index, terms, weights, tieBreak) {
  return index
    .map((entry) => ({ entry, score: score(entry, terms, weights) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || tieBreak(a.entry.item, b.entry.item))
    .map((r) => r.entry.item);
}

export function searchArticles(query) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  if (!articleIndex) buildIndex();
  return run(articleIndex, terms, ARTICLE_WEIGHTS, (a, b) => toDate(b.date, b.time) - toDate(a.date, a.time));
}

export function searchEvents(query) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  if (!eventIndex) buildIndex();
  // Події з однаковою вагою — найближчі першими
  return run(eventIndex, terms, EVENT_WEIGHTS, (a, b) => toDate(a.date, a.time) - toDate(b.date, b.time));
}

// Підказки для шапки: рубрики, заголовки матеріалів, теги (разом до `limit`)
export function suggest(query, limit = 5) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const matchesAll = (text) => {
    const n = normalize(text);
    return terms.every((t) => n.includes(t));
  };

  const rubricHits = rubrics.filter((r) => matchesAll(r.name)).slice(0, 2).map((r) => ({ type: "rubric", label: r.name, id: r.id, color: r.color }));

  const allTags = [...new Set(articles.flatMap((a) => a.tags || []))];
  const tagHits = allTags.filter(matchesAll).slice(0, 1).map((t) => ({ type: "tag", label: t }));

  const articleSlots = Math.max(0, limit - rubricHits.length - tagHits.length);
  const articleHits = searchArticles(query).slice(0, articleSlots).map((a) => ({ type: "article", label: a.title, id: a.id, rubric: a.rubric }));

  return [...rubricHits, ...articleHits, ...tagHits].slice(0, limit);
}

// ---------- Підсвітка збігів ----------
// Текст екранізується, збіги обгортаються в <mark>. Сирий запит у HTML не потрапляє.
function ranges(text, terms) {
  const low = String(text).toLowerCase().replace(APOSTROPHES, "'");
  // Якщо нижній регістр змінив довжину рядка (рідкісні символи) — без підсвітки
  if (low.length !== String(text).length) return [];
  const found = [];
  for (const term of terms) {
    let i = low.indexOf(term);
    while (i !== -1) {
      found.push([i, i + term.length]);
      i = low.indexOf(term, i + term.length);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of found) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

export function highlight(text, query) {
  const src = String(text ?? "");
  const terms = Array.isArray(query) ? query : queryTerms(query);
  const rs = terms.length ? ranges(src, terms) : [];
  if (!rs.length) return escapeHtml(src);
  let html = "";
  let pos = 0;
  for (const [a, b] of rs) {
    html += escapeHtml(src.slice(pos, a)) + "<mark>" + escapeHtml(src.slice(a, b)) + "</mark>";
    pos = b;
  }
  return html + escapeHtml(src.slice(pos));
}

// Уривок тексту довкола першого збігу (для результатів, де слово знайшлося лише в тексті)
export function snippet(text, query, length = 180) {
  const src = String(text ?? "");
  const terms = Array.isArray(query) ? query : queryTerms(query);
  const rs = ranges(src, terms);
  if (!rs.length) return "";
  let start = Math.max(0, rs[0][0] - 60);
  if (start > 0) {
    const space = src.indexOf(" ", start);
    start = space !== -1 && space < rs[0][0] ? space + 1 : start;
  }
  let end = Math.min(src.length, start + length);
  if (end < src.length) {
    const space = src.lastIndexOf(" ", end);
    if (space > rs[0][1]) end = space;
  }
  return (start > 0 ? "…" : "") + src.slice(start, end) + (end < src.length ? "…" : "");
}

export { bodyText };
