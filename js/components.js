// =====================================================================
// Спільні шматки розмітки: картки матеріалів (L, M, S), картка події,
// фото-заглушки, плашки рубрик, мета (автор · дата · час читання).
// Використовуються на головній, у рубриках, статтях, пошуку й у авторів.
// Увесь текст із data.js проходить через escapeHtml.
// =====================================================================

import { links, escapeHtml, getRubric, getAuthor, formatDate, formatWhen, isoDateTime, readingTime, dateParts } from "./utils.js";

export const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

// Розміри для атрибутів width/height справжніх фото (щоб не стрибала верстка)
const SIZES = { "16x9": [1600, 900], "3x2": [1200, 800], "4x5": [960, 1200], "1x1": [800, 800] };

const srcUrl = (src) => (/^(https?:)?\/\//.test(src) || src.startsWith("data:") ? src : links.asset(src));

// ---------- Фото / заглушка ----------
// Поки src порожній — кольоровий блок з підписом «Фото» (role="img" + aria-label = alt).
export function mediaHtml({ src = "", alt = "", ratio = "3x2", color = "", video = false, eager = false, play = "", extraClass = "" } = {}) {
  const cls = `media media--${ratio}${video ? " media--video" : ""}${extraClass ? " " + extraClass : ""}`;
  const style = color ? ` style="--rubric:${escapeHtml(color)}"` : "";
  const playBtn = video ? `<span class="play${play ? ` play--${play}` : ""}" aria-hidden="true">${PLAY_ICON}</span>` : "";
  if (src) {
    const [w, h] = SIZES[ratio] || SIZES["3x2"];
    const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    return `<div class="${cls}"${style}><img src="${escapeHtml(srcUrl(src))}" alt="${escapeHtml(alt)}" width="${w}" height="${h}" ${loading} decoding="async">${playBtn}</div>`;
  }
  return `<div class="${cls}"${style} role="img" aria-label="${escapeHtml(alt)}">${playBtn}<span class="media__label" aria-hidden="true">${video ? "Відео" : "Фото"}</span></div>`;
}

// Кругле фото людини
// decorative: true — ім’я вже написане поруч текстом, тож alt порожній (скрінрідер не читає двічі)
// eager: true — фото видно одразу при відкритті сторінки (не відкладати завантаження)
export function avatarHtml(author, size = 72, { decorative = false, eager = false } = {}) {
  const name = escapeHtml(author.name);
  const loading = eager ? `fetchpriority="high"` : `loading="lazy"`;
  const inner = author.photo
    ? `<img src="${escapeHtml(srcUrl(author.photo))}" alt="${decorative ? "" : name}" width="${size * 2}" height="${size * 2}" ${loading} decoding="async">`
    : `<span class="media__label" aria-hidden="true">Фото</span>`;
  const role = author.photo || decorative ? (decorative && !author.photo ? ` aria-hidden="true"` : "") : ` role="img" aria-label="${name}"`;
  return `<div class="media avatar" style="--avatar-size:${size}px"${role}>${inner}</div>`;
}

// ---------- Плашка рубрики ----------
export function tagHtml(rubricId, { link = true } = {}) {
  const r = getRubric(rubricId);
  if (!r) return "";
  const style = `style="--rubric:${escapeHtml(r.color)}"`;
  return link
    ? `<a class="tag" href="${links.rubric(r.id)}" ${style}>${escapeHtml(r.name)}</a>`
    : `<span class="tag" ${style}>${escapeHtml(r.name)}</span>`;
}

// ---------- Мета: автор · дата · час читання ----------
export function metaHtml(article, { author = true, date = true, when = false, reading = true } = {}) {
  const parts = [];
  const a = getAuthor(article.author);
  if (author && a) parts.push(`<a href="${links.author(a.id)}">${escapeHtml(a.name)}</a>`);
  if (date) {
    const label = when ? formatWhen(article.date, article.time) : formatDate(article.date);
    parts.push(`<time datetime="${isoDateTime(article.date, article.time)}">${escapeHtml(label)}</time>`);
  }
  if (reading) parts.push(`<span>${readingTime(article)}</span>`);
  return `<div class="meta">${parts.join("")}</div>`;
}

const rubricColor = (article) => getRubric(article.rubric)?.color || "";
const isVideo = (article) => Boolean(article.video);

// Фото для картки: обкладинка, а якщо її немає — постер відео
function coverOf(article) {
  const cover = article.cover || {};
  if (!cover.src && article.video?.poster) return { ...cover, src: article.video.poster };
  return cover;
}

// ---------- Картка L: фото 16:9, великий заголовок, лід ----------
export function cardL(article, { level = 3, eager = false, extraClass = "" } = {}) {
  return `
    <article class="card card--l${extraClass ? " " + extraClass : ""}">
      ${mediaHtml({ ...coverOf(article), ratio: "16x9", color: rubricColor(article), video: isVideo(article), eager })}
      <div class="card__body">
        ${tagHtml(article.rubric)}
        <h${level} class="card__title"><a class="card__link" href="${links.article(article.id)}">${escapeHtml(article.title)}</a></h${level}>
        ${article.lead ? `<p class="card__lead">${escapeHtml(article.lead)}</p>` : ""}
        ${metaHtml(article)}
      </div>
    </article>`;
}

// ---------- Картка M: фото 3:2, заголовок, дата, автор ----------
export function cardM(article, { level = 3, showTag = false, ratio = "3x2", author = true } = {}) {
  return `
    <article class="card card--m${isVideo(article) ? " card--video" : ""}">
      ${mediaHtml({ ...coverOf(article), ratio, color: rubricColor(article), video: isVideo(article), play: "small" })}
      <div class="card__body">
        ${showTag ? tagHtml(article.rubric) : ""}
        <h${level} class="card__title"><a class="card__link" href="${links.article(article.id)}">${escapeHtml(article.title)}</a></h${level}>
        ${metaHtml(article, { author })}
      </div>
    </article>`;
}

// ---------- Картка S: без фото — рубрика, заголовок, дата ----------
export function cardS(article, { level = 3, when = false, showTag = true, author = false } = {}) {
  return `
    <article class="card card--s">
      ${showTag ? tagHtml(article.rubric) : ""}
      <h${level} class="card__title"><a class="card__link" href="${links.article(article.id)}">${escapeHtml(article.title)}</a></h${level}>
      ${metaHtml(article, { author, when })}
    </article>`;
}

// ---------- Жанр події (Балет, Опера, Комедія…) — нейтральна плашка без посилання ----------
export function genreTags(event) {
  const list = event.genres || [];
  return list.length ? `<span class="genre-tags">${list.map((g) => `<span class="tag tag--genre">${escapeHtml(g)}</span>`).join("")}</span>` : "";
}

// ---------- Картка події: велика цифра дня, місяць, назва, місце, час ----------
export function cardEvent(event, { level = 3 } = {}) {
  const d = dateParts(event.date);
  return `
    <article class="card card--event">
      <time class="event-date" datetime="${isoDateTime(event.date, event.time)}">
        <span class="event-date__day">${d.day}</span>
        <span class="event-date__month">${escapeHtml(d.month)}</span>
        <span class="event-date__weekday">${escapeHtml(d.weekday)}</span>
      </time>
      <div class="card__body">
        ${genreTags(event)}
        <h${level} class="card__title"><a class="card__link" href="${links.events(event.id)}">${escapeHtml(event.title)}</a></h${level}>
        <p class="event-info">
          <span>${escapeHtml(event.place)}</span>
          <strong>${escapeHtml(event.time)}</strong>
        </p>
        <span class="link-arrow" aria-hidden="true">Детальніше</span>
      </div>
    </article>`;
}

// ---------- Плитка мозаїки (Фоторубрика): фото на всю плитку, підпис на темній плашці ----------
export function mosaicTile(article, { level = 3 } = {}) {
  return `
    <article class="card card--tile">
      ${mediaHtml({ ...coverOf(article), ratio: "3x2", color: rubricColor(article) })}
      <div class="tile__caption">
        <h${level} class="card__title"><a class="card__link" href="${links.article(article.id)}">${escapeHtml(article.title)}</a></h${level}>
        <time datetime="${isoDateTime(article.date, article.time)}">${escapeHtml(formatDate(article.date))}</time>
      </div>
    </article>`;
}

// ---------- Стан «не знайдено» (невідомий id у адресі) ----------
export function notFoundHtml({ title, text }) {
  return `
    <section class="container empty-state">
      <h1 class="h-page">${escapeHtml(title)}</h1>
      <p class="lead">${escapeHtml(text)}</p>
      <p><a class="btn" href="${links.home()}">На головну</a></p>
    </section>`;
}

// ---------- Чіпси рубрик ----------
export function rubricChips(rubricList, { activeId = "", scroll = false, label = "Рубрики" } = {}) {
  const items = rubricList
    .map((r) => {
      const current = r.id === activeId ? ' aria-current="page"' : "";
      return `<li><a class="chip" href="${links.rubric(r.id)}" style="--rubric:${escapeHtml(r.color)}"${current}><span class="chip__swatch" aria-hidden="true"></span>${escapeHtml(r.name)}</a></li>`;
    })
    .join("");
  return `<nav aria-label="${escapeHtml(label)}"><ul class="chips${scroll ? " chips--scroll" : ""}" role="list">${items}</ul></nav>`;
}
