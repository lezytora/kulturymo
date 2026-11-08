// =====================================================================
// Сторінка пошуку: search.html?q=запит
// Порожній запит — рубрики й стрічка свіжих матеріалів («Усі матеріали»).
// Є результати — кількість, матеріали з підсвіткою збігів, окремо події.
// Нічого не знайдено — пояснення, підказки й рубрики.
// =====================================================================

import { setPageMeta, reveal } from "./main.js";
import { rubrics, articles } from "./data.js";
import { links, escapeHtml, byNewest, plural, formatDayMonth, formatDate, isoDateTime, getAuthor, readingTime } from "./utils.js";
import { tagHtml, rubricChips, genreTags } from "./components.js";
import { searchArticles, searchEvents, highlight, snippet, queryTerms, normalize, bodyText } from "./search-core.js";

const FEED_PAGE = 8;     // скільки свіжих матеріалів показувати за раз без запиту
const LIVE_DEBOUNCE = 250;

const main = document.querySelector("#main");
let feedShown = FEED_PAGE;

const countArticles = (n) => `${n} ${plural(n, ["матеріал", "матеріали", "матеріалів"])}`;
const countEvents = (n) => `${n} ${plural(n, ["подію", "події", "подій"])}`;

// ---------- Рядки результатів ----------

function articleRow(article, query) {
  const terms = queryTerms(query);
  // Текст під заголовком: лід, а якщо збіг лише в тексті статті — уривок довкола нього
  const leadHit = terms.length && terms.some((t) => normalize(article.lead).includes(t));
  const bodyHit = terms.length && !leadHit && !terms.some((t) => normalize(article.title).includes(t)) ? snippet(bodyText(article), terms) : "";
  const text = bodyHit || article.lead;
  return `
    <article class="card card--s result">
      ${tagHtml(article.rubric)}
      <h3 class="card__title"><a class="card__link" href="${links.article(article.id)}">${highlight(article.title, terms)}</a></h3>
      <p class="result__text">${highlight(text, terms)}</p>
      ${resultMeta(article, terms)}
    </article>`;
}

// Мета з підсвіченим ім’ям автора (щоб було видно, чому знайшовся матеріал)
function resultMeta(article, terms) {
  const a = getAuthor(article.author);
  return `
    <div class="meta">
      ${a ? `<a href="${links.author(a.id)}">${highlight(a.name, terms)}</a>` : ""}
      <time datetime="${isoDateTime(article.date, article.time)}">${formatDate(article.date)}</time>
      <span>${readingTime(article)}</span>
    </div>`;
}

function eventRow(event, query) {
  const terms = queryTerms(query);
  return `
    <article class="card card--s result">
      ${genreTags(event)}
      <h3 class="card__title"><a class="card__link" href="${links.events(event.id)}">${highlight(event.title, terms)}</a></h3>
      <p class="result__text">${highlight(event.description, terms)}</p>
      <div class="meta">
        <time datetime="${isoDateTime(event.date, event.time)}">${formatDayMonth(event.date)}, ${escapeHtml(event.time)}</time>
        <span>${highlight(event.place, terms)}</span>
      </div>
    </article>`;
}

// ---------- Стани сторінки ----------

function emptyQueryHtml() {
  const feed = [...articles].sort(byNewest);
  const visible = feed.slice(0, feedShown);
  return {
    status: `Усього ${countArticles(feed.length)}`,
    html: `
      <section class="search-section" aria-labelledby="s-rubrics">
        <h2 class="search-section__title" id="s-rubrics">Рубрики</h2>
        ${rubricChips(rubrics)}
      </section>
      <section class="search-section" aria-labelledby="s-feed">
        <h2 class="search-section__title" id="s-feed">Свіжі матеріали</h2>
        <ol class="list-s" role="list" id="search-feed">${visible.map((a) => `<li>${articleRow(a, "")}</li>`).join("")}</ol>
        ${
          feed.length > visible.length
            ? `<div class="load-more"><button class="btn btn--quiet" type="button" data-more aria-controls="search-feed">Показати ще <span class="load-more__count">${feed.length - visible.length}</span></button></div>`
            : ""
        }
      </section>`,
  };
}

function noResultsHtml(query) {
  return {
    status: `Нічого не знайдено за запитом «${query}»`,
    quiet: true,
    html: `
      <div class="search-empty">
        <p class="lead">Нічого не знайдено за запитом «${escapeHtml(query)}».</p>
        <ul class="search-tips">
          <li>Перевір, чи правильно написане слово.</li>
          <li>Спробуй коротший запит або інше слово: «кіно» замість «кінопоказ».</li>
          <li>Або зазирни в одну з рубрик:</li>
        </ul>
        ${rubricChips(rubrics)}
      </div>`,
  };
}

function resultsHtml(query) {
  const found = searchArticles(query);
  const evts = searchEvents(query);
  if (!found.length && !evts.length) return noResultsHtml(query);

  const parts = ["Знайдено"];
  if (found.length) parts.push(countArticles(found.length));
  if (found.length && evts.length) parts.push("і");
  if (evts.length) parts.push(countEvents(evts.length));
  return {
    status: parts.join(" "),
    html: `
      ${
        found.length
          ? `<section class="search-section" aria-labelledby="s-articles">
              <h2 class="search-section__title" id="s-articles">Матеріали <span class="search-section__count">${found.length}</span></h2>
              <ol class="list-s" role="list">${found.map((a) => `<li>${articleRow(a, query)}</li>`).join("")}</ol>
            </section>`
          : ""
      }
      ${
        evts.length
          ? `<section class="search-section" aria-labelledby="s-events">
              <h2 class="search-section__title" id="s-events">Події <span class="search-section__count">${evts.length}</span></h2>
              <ol class="list-s" role="list">${evts.map((e) => `<li>${eventRow(e, query)}</li>`).join("")}</ol>
            </section>`
          : ""
      }`,
  };
}

// ---------- Рендер ----------

function render(query) {
  const q = query.trim();
  const { status, html, quiet = false } = q ? resultsHtml(q) : emptyQueryHtml();
  const statusEl = main.querySelector("[data-status]");
  statusEl.textContent = status;
  // Коли нічого не знайдено, текст уже є в панелі — статус лишаємо лише для скрінрідерів
  statusEl.classList.toggle("visually-hidden", quiet);
  main.querySelector("[data-results]").innerHTML = html;
  setPageMeta({ title: q ? `Пошук: ${q}` : "Пошук", description: "Пошук матеріалів, авторів і подій на сайті «Культуримо»." });
}

function syncUrl(query) {
  const url = new URL(location.href);
  if (query.trim()) url.searchParams.set("q", query.trim());
  else url.searchParams.delete("q");
  history.replaceState(null, "", url);
}

function init() {
  const initial = new URLSearchParams(location.search).get("q") || "";
  main.innerHTML = `
    <div class="container search-page">
      <h1 class="h-page search-page__title">Пошук</h1>
      <form class="search-form" role="search" action="${links.search()}" method="get">
        <label class="visually-hidden" for="search-q">Пошуковий запит</label>
        <input class="search-form__input" id="search-q" type="search" name="q" autocomplete="off" enterkeyhint="search"
          placeholder="Замок, рецензія, квартирник, ім’я автора…">
        <button class="btn" type="submit">Знайти</button>
      </form>
      <p class="search-status" role="status" aria-live="polite" data-status></p>
      <div class="search-results" data-results></div>
    </div>`;

  const input = main.querySelector("#search-q");
  input.value = initial; // значення ставимо через .value, не через HTML — запит не потрапляє в розмітку
  render(initial);

  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      feedShown = FEED_PAGE;
      render(input.value);
      syncUrl(input.value);
    }, LIVE_DEBOUNCE);
  });

  main.querySelector(".search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    clearTimeout(timer);
    render(input.value);
    syncUrl(input.value);
    main.querySelector("[data-results] .card__link")?.closest(".search-section")?.querySelector("h2")?.scrollIntoView({ block: "nearest" });
  });

  main.addEventListener("click", (e) => {
    if (!e.target.closest("[data-more]")) return;
    const from = feedShown;
    feedShown += FEED_PAGE;
    render(input.value);
    main.querySelectorAll("#search-feed .card__link")[from]?.focus();
  });

  // Порожній запит при відкритті — фокус у поле
  if (!initial) input.focus({ preventScroll: true });
  reveal(main);
}

init();
