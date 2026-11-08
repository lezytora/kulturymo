// =====================================================================
// Афіша «Що відвідати»: events.html (необов'язково ?zhanr=Опера, #id-події)
// Вистави з data.js, згруповані за днями, фільтр за жанром (поле genres).
// Минулі покази не показуються. На кожен показ можна дати посилання events.html#id
// (так ведуть картки з головної й пошуку).
// =====================================================================

import { setPageMeta, scrollToHash } from "./main.js";
import { events } from "./data.js";
import { escapeHtml, toDate, toISODate, dateParts, isoDateTime, plural } from "./utils.js";
import { genreTags } from "./components.js";

// Порядок жанрів у фільтрі. Новий жанр із data.js, якого тут немає, додасться в кінець.
const GENRE_ORDER = ["Балет", "Опера", "Комедія", "Казка", "Драма", "Мюзикл"];

const main = document.querySelector("#main");
const today = toISODate(new Date());
const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
})();

const byTime = (a, b) => toDate(a.date, a.time) - toDate(b.date, b.time);
// Лише сьогоднішні й майбутні покази
const all = events.filter((e) => e.date >= today).sort(byTime);

const genres = [...new Set(all.flatMap((e) => e.genres || []))].sort(
  (a, b) => (GENRE_ORDER.indexOf(a) + 1 || 99) - (GENRE_ORDER.indexOf(b) + 1 || 99)
);

const state = { genre: "" }; // "" = усі жанри

const countEvents = (n) => `${n} ${plural(n, ["показ", "покази", "показів"])}`;
const visible = () => (state.genre ? all.filter((e) => (e.genres || []).includes(state.genre)) : all);

// ---------- Розмітка ----------

function filtersHtml() {
  return `
    <div class="filters" role="group" aria-label="Фільтр за жанром">
      ${["", ...genres]
        .map((g) => `<button class="chip" type="button" data-genre="${escapeHtml(g)}" aria-pressed="${g === state.genre}">${g ? escapeHtml(g) : "Усі"}</button>`)
        .join("")}
    </div>`;
}

function eventRow(e) {
  return `
    <li>
      <article class="event-row" id="${escapeHtml(e.id)}" aria-labelledby="${escapeHtml(e.id)}-title">
        <time class="event-row__time" datetime="${isoDateTime(e.date, e.time)}">${escapeHtml(e.time)}</time>
        <div class="event-row__body">
          ${genreTags(e)}
          <h3 class="event-row__title" id="${escapeHtml(e.id)}-title">${escapeHtml(e.title)}</h3>
          ${e.description ? `<p class="event-row__desc">${escapeHtml(e.description)}</p>` : ""}
          <p class="event-row__place"><span class="visually-hidden">Місце: </span>${escapeHtml(e.place)}</p>
        </div>
      </article>
    </li>`;
}

function dayLabel(date) {
  if (date === today) return "сьогодні";
  if (date === tomorrow) return "завтра";
  return "";
}

function dayHtml(date, list) {
  const d = dateParts(date);
  const rel = dayLabel(date);
  // Подія наступного року — показуємо рік біля місяця
  const year = date.slice(0, 4) !== today.slice(0, 4) ? ` ${date.slice(0, 4)}` : "";
  return `
    <section class="day${rel ? " day--soon" : ""}" aria-labelledby="day-${date}">
      <h2 class="day__head" id="day-${date}">
        <time datetime="${date}">
          <span class="day__num">${d.day}</span>
          <span class="day__month">${escapeHtml(d.month)}${year}</span>
          <span class="day__weekday">${escapeHtml(d.weekday)}</span>
          ${rel ? `<span class="day__rel">${rel}</span>` : ""}
        </time>
      </h2>
      <ol class="day__list" role="list">${list.map(eventRow).join("")}</ol>
    </section>`;
}

// Групуємо за датою, зберігаючи порядок
function daysHtml(list) {
  const groups = new Map();
  for (const e of list) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date).push(e);
  }
  return [...groups].map(([date, items]) => dayHtml(date, items)).join("");
}

function resultsHtml() {
  const list = visible();
  if (list.length) return daysHtml(list);
  return `
    <div class="events-none">
      <p class="lead">${
        state.genre ? `Найближчих вистав у жанрі «${escapeHtml(state.genre)}» поки немає.` : "Найближчих подій поки немає. Ми саме збираємо нову афішу."
      }</p>
      ${state.genre ? `<button class="btn btn--quiet" type="button" data-genre="">Показати всі події</button>` : ""}
    </div>`;
}

function pageHtml() {
  return `
    <div class="container events-page">
      <header class="page-head">
        <h1 class="h-page">Що відвідати</h1>
        <div class="page-head__side">
          <p class="lead">Вистави львівських театрів: балет, опера, комедія, казка, драма й мюзикл.</p>
          <p class="page-head__count">${all.length ? `Попереду ${countEvents(all.length)}` : "Нових подій поки немає"}</p>
        </div>
      </header>
      ${genres.length ? filtersHtml() : ""}
      <p class="visually-hidden" aria-live="polite" data-status></p>
      <div class="events-list" data-results></div>
    </div>`;
}

// ---------- Поведінка ----------

function update({ announce = false } = {}) {
  main.querySelector("[data-results]").innerHTML = resultsHtml();
  main.querySelectorAll(".filters [data-genre]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.genre === state.genre)));
  if (announce) {
    main.querySelector("[data-status]").textContent = `${state.genre || "Усі жанри"}: ${countEvents(visible().length)}`;
  }
}

function setGenre(g) {
  state.genre = genres.includes(g) ? g : "";
  // Фільтр зберігається в адресі, щоб посиланням можна було поділитися
  const url = new URL(location.href);
  if (state.genre) url.searchParams.set("zhanr", state.genre);
  else url.searchParams.delete("zhanr");
  url.hash = "";
  history.replaceState(null, "", url);
  update({ announce: true });
}

// Відкрили посилання на конкретний показ (#id): знімаємо фільтр, якщо він його ховає, і прокручуємо до нього.
function showHashTarget() {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = all.find((e) => e.id === id);
  if (!target) return;
  if (state.genre && !(target.genres || []).includes(state.genre)) {
    state.genre = "";
    const url = new URL(location.href);
    url.searchParams.delete("zhanr");
    history.replaceState(null, "", url);
    update();
  }
  scrollToHash();
}

function init() {
  setPageMeta({ title: "Що відвідати", description: "Афіша вистав у театрах Львова: балет, опера, комедія, казка, драма й мюзикл." });
  const fromUrl = new URLSearchParams(location.search).get("zhanr");
  if (fromUrl && genres.includes(fromUrl)) state.genre = fromUrl;

  main.innerHTML = pageHtml();
  update();
  showHashTarget();

  main.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-genre]");
    if (btn) setGenre(btn.dataset.genre);
  });
  window.addEventListener("hashchange", showHashTarget);
}

init();
