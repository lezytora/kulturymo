// =====================================================================
// Афіша «Що відвідати»: events.html (необов'язково ?rubryka=kino, #id-події)
// Усі події з data.js, згруповані за днями, фільтр за рубрикою.
// Найближчі події зверху; ті, що вже минули, — у згорнутому блоці внизу.
// На кожну подію можна дати посилання: events.html#id (так ведуть картки з головної й пошуку).
// =====================================================================

import { setPageMeta, scrollToHash } from "./main.js";
import { rubrics, events } from "./data.js";
import { escapeHtml, getRubric, toDate, toISODate, dateParts, isoDateTime, plural } from "./utils.js";
import { tagHtml } from "./components.js";

const main = document.querySelector("#main");
const today = toISODate(new Date());
const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
})();

const byTime = (a, b) => toDate(a.date, a.time) - toDate(b.date, b.time);
const all = [...events].sort(byTime);
const isPast = (e) => e.date < today;

// У фільтрі лише рубрики, в яких є події (у порядку меню)
const filterRubrics = rubrics.filter((r) => all.some((e) => e.rubric === r.id));

const state = { rubric: "" }; // "" = усі рубрики

const countEvents = (n) => `${n} ${plural(n, ["подія", "події", "подій"])}`;
const visible = () => (state.rubric ? all.filter((e) => e.rubric === state.rubric) : all);

// ---------- Розмітка ----------

function filtersHtml() {
  const buttons = [{ id: "", name: "Усі", color: "" }, ...filterRubrics];
  return `
    <div class="filters" role="group" aria-label="Фільтр за рубрикою">
      ${buttons
        .map(
          (r) => `<button class="chip" type="button" data-rubric-filter="${escapeHtml(r.id)}" aria-pressed="${r.id === state.rubric}"${
            r.color ? ` style="--rubric:${escapeHtml(r.color)}"` : ""
          }>${r.color ? '<span class="chip__swatch" aria-hidden="true"></span>' : ""}${escapeHtml(r.name)}</button>`
        )
        .join("")}
    </div>`;
}

function eventRow(e) {
  const r = getRubric(e.rubric);
  return `
    <li>
      <article class="event-row" id="${escapeHtml(e.id)}"${r ? ` style="--rubric:${escapeHtml(r.color)}"` : ""} aria-labelledby="${escapeHtml(e.id)}-title">
        <time class="event-row__time" datetime="${isoDateTime(e.date, e.time)}">${escapeHtml(e.time)}</time>
        <div class="event-row__body">
          ${tagHtml(e.rubric)}
          <h3 class="event-row__title" id="${escapeHtml(e.id)}-title">${escapeHtml(e.title)}</h3>
          <p class="event-row__desc">${escapeHtml(e.description)}</p>
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
  return `
    <section class="day${rel ? " day--soon" : ""}" aria-labelledby="day-${date}">
      <h2 class="day__head" id="day-${date}">
        <time datetime="${date}">
          <span class="day__num">${d.day}</span>
          <span class="day__month">${escapeHtml(d.month)}</span>
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

function resultsHtml({ pastOpen = false } = {}) {
  const list = visible();
  const upcoming = list.filter((e) => !isPast(e));
  const past = list.filter(isPast).reverse(); // минулі: найсвіжіші першими
  const rubricName = state.rubric ? getRubric(state.rubric)?.name : "";

  const upcomingHtml = upcoming.length
    ? daysHtml(upcoming)
    : `<div class="events-none">
        <p class="lead">${
          rubricName ? `У рубриці «${escapeHtml(rubricName)}» найближчих подій поки немає.` : "Найближчих подій поки немає. Ми саме збираємо нову афішу."
        }</p>
        ${state.rubric ? `<button class="btn btn--quiet" type="button" data-rubric-filter="">Показати всі події</button>` : ""}
      </div>`;

  const pastHtml = past.length
    ? `<details class="events-past" data-past${pastOpen ? " open" : ""}>
        <summary class="events-past__summary">Минулі події <span class="load-more__count">${past.length}</span></summary>
        <div class="events-past__list">${daysHtml(past)}</div>
      </details>`
    : "";

  return upcomingHtml + pastHtml;
}

function pageHtml() {
  const upcoming = all.filter((e) => !isPast(e)).length;
  return `
    <div class="container events-page">
      <header class="page-head">
        <h1 class="h-page">Що відвідати</h1>
        <div class="page-head__side">
          <p class="lead">Кіно, квартирники, лекції й поїздки до замків. Події, на які ми йдемо самі й кличемо тебе.</p>
          <p class="page-head__count">${upcoming ? `Попереду ${countEvents(upcoming)}` : "Нових подій поки немає"}</p>
        </div>
      </header>
      ${filtersHtml()}
      <p class="visually-hidden" aria-live="polite" data-status></p>
      <div class="events-list" data-results></div>
    </div>`;
}

// ---------- Поведінка ----------

function update({ announce = false, pastOpen = false } = {}) {
  main.querySelector("[data-results]").innerHTML = resultsHtml({ pastOpen });
  main.querySelectorAll("[data-rubric-filter]").forEach((b) => {
    if (b.closest(".filters")) b.setAttribute("aria-pressed", String(b.dataset.rubricFilter === state.rubric));
  });
  if (announce) {
    const n = visible().filter((e) => !isPast(e)).length;
    const name = state.rubric ? getRubric(state.rubric)?.name : "Усі рубрики";
    main.querySelector("[data-status]").textContent = `${name}: попереду ${countEvents(n)}`;
  }
}

function setRubric(id) {
  state.rubric = filterRubrics.some((r) => r.id === id) ? id : "";
  // Фільтр зберігається в адресі, щоб посиланням можна було поділитися
  const url = new URL(location.href);
  if (state.rubric) url.searchParams.set("rubryka", state.rubric);
  else url.searchParams.delete("rubryka");
  url.hash = "";
  history.replaceState(null, "", url);
  update({ announce: true });
}

// Відкрили посилання на конкретну подію (#id): знімаємо фільтр, якщо він її ховає,
// розгортаємо «Минулі події», якщо подія вже минула, і прокручуємо до неї.
function showHashTarget() {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = all.find((e) => e.id === id);
  if (!target) return;
  if (state.rubric && target.rubric !== state.rubric) {
    state.rubric = "";
    const url = new URL(location.href);
    url.searchParams.delete("rubryka");
    history.replaceState(null, "", url);
  }
  update({ pastOpen: isPast(target) });
  scrollToHash();
}

function init() {
  setPageMeta({ title: "Що відвідати", description: "Афіша культурних подій Львова для студентів і молоді: кіно, квартирники, лекції, прогулянки, поїздки до замків." });
  const fromUrl = new URLSearchParams(location.search).get("rubryka");
  if (fromUrl && filterRubrics.some((r) => r.id === fromUrl)) state.rubric = fromUrl;

  main.innerHTML = pageHtml();
  update();
  showHashTarget();

  main.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rubric-filter]");
    if (btn) setRubric(btn.dataset.rubricFilter);
  });
  window.addEventListener("hashchange", showHashTarget);
}

init();
