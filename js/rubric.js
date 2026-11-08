// =====================================================================
// Сторінка рубрики: rubric.html?id=kino  (необов'язково &tema=Рецензії)
// Назва, опис, фільтри за підтемами, головний матеріал, сітка карток
// і «Показати ще». Фоторубрика — мозаїка фото, Експерименти — відеокартки.
// =====================================================================

import { setActiveRubric, setPageMeta, reveal } from "./main.js";
import { rubrics, articles } from "./data.js";
import { links, escapeHtml, byNewest, plural } from "./utils.js";
import { cardL, cardM, mosaicTile, notFoundHtml, rubricChips } from "./components.js";

// Скільки карток показувати за раз (під головним матеріалом).
// Поки матеріалів мало, стоїть 3; коли їх стане більше — постав 9.
const PAGE_SIZE = 3;

const params = new URLSearchParams(location.search);
const rubric = rubrics.find((r) => r.id === params.get("id"));
const main = document.querySelector("#main");

const state = {
  subtopic: "",     // "" = усі підтеми
  shown: PAGE_SIZE, // скільки карток сітки зараз видно
};

const all = rubric ? articles.filter((a) => a.rubric === rubric.id).sort(byNewest) : [];
// Підтеми, в яких уже є матеріали. Порожні у фільтрі не показуються —
// з’являться самі, щойно в data.js додасться матеріал із такою підтемою.
const activeSubtopics = rubric ? rubric.subtopics.filter((s) => all.some((a) => a.subtopic === s)) : [];
const filtered = () => (state.subtopic ? all.filter((a) => a.subtopic === state.subtopic) : all);
const countLabel = (n) => `${n} ${plural(n, ["матеріал", "матеріали", "матеріалів"])}`;

// ---------- Розмітка ----------

function filtersHtml() {
  const buttons = [{ value: "", label: "Усі" }, ...activeSubtopics.map((s) => ({ value: s, label: s }))];
  return `
    <div class="filters" role="group" aria-label="Підтеми рубрики">
      ${buttons
        .map(
          (b) => `<button class="chip" type="button" data-subtopic="${escapeHtml(b.value)}" aria-pressed="${b.value === state.subtopic}">${escapeHtml(b.label)}</button>`
        )
        .join("")}
    </div>`;
}

// Ширини плиток мозаїки за візерунком; остання плитка розтягується до кінця ряду
const MOSAIC_DESKTOP = { cols: 6, pattern: [4, 2, 2, 4, 3, 3] };
const MOSAIC_MOBILE = { cols: 2, pattern: [2, 1, 1] };

function mosaicSpans(count, { cols, pattern }) {
  const spans = [];
  let filled = 0;
  for (let i = 0; i < count; i++) {
    let span = pattern[i % pattern.length];
    if (filled + span > cols) filled = 0;
    if (i === count - 1) span = cols - filled; // остання — до кінця ряду
    spans.push(span);
    filled = (filled + span) % cols;
  }
  return spans;
}

function gridItemsHtml(list) {
  if (rubric.layout === "mosaic") {
    const d = mosaicSpans(list.length, MOSAIC_DESKTOP);
    const m = mosaicSpans(list.length, MOSAIC_MOBILE);
    return list.map((a, i) => `<li class="mosaic__item" style="--span:${d[i]};--span-m:${m[i]}">${mosaicTile(a)}</li>`).join("");
  }
  const ratio = rubric.layout === "video" ? "16x9" : "3x2";
  return list.map((a) => `<li>${cardM(a, { ratio })}</li>`).join("");
}

function resultsHtml() {
  const list = filtered();
  // У рубриці ще немає жодного матеріалу
  if (!all.length) {
    return `
      <div class="rubric-empty">
        <p class="lead">У цій рубриці матеріалів ще немає. Ми саме над ними працюємо.</p>
        <a class="btn btn--quiet" href="${links.home()}">На головну</a>
      </div>`;
  }
  if (!list.length) {
    return `
      <div class="rubric-empty">
        <p class="lead">У підтемі «${escapeHtml(state.subtopic)}» поки нічого немає. Ми саме пишемо.</p>
        <button class="btn btn--quiet" type="button" data-subtopic="">Показати всі матеріали рубрики</button>
      </div>`;
  }
  const [lead, ...rest] = list;
  const visible = rest.slice(0, state.shown);
  const left = rest.length - visible.length;
  const gridClass = rubric.layout === "mosaic" ? "mosaic" : "rubric-grid";
  return `
    ${cardL(lead, { level: 2, eager: true, extraClass: "card--feature" })}
    ${
      rest.length
        ? `<section class="rubric-more" aria-labelledby="more-title">
            <h2 class="visually-hidden" id="more-title">Інші матеріали рубрики</h2>
            <ul class="${gridClass}" role="list" id="rubric-list">${gridItemsHtml(visible)}</ul>
            ${
              left > 0
                ? `<div class="load-more"><button class="btn btn--quiet" type="button" data-more aria-controls="rubric-list">Показати ще <span class="load-more__count">${left}</span></button></div>`
                : ""
            }
          </section>`
        : ""
    }`;
}

function pageHtml() {
  const otherRubrics = rubrics.filter((r) => r.id !== rubric.id);
  return `
    <div class="container rubric-page" style="--rubric:${escapeHtml(rubric.color)}">
      <header class="page-head">
        <h1 class="h-page page-head__title"><span class="rubric-mark" aria-hidden="true"></span>${escapeHtml(rubric.name)}</h1>
        <div class="page-head__side">
          <p class="lead">${escapeHtml(rubric.description)}</p>
          <p class="page-head__count">${countLabel(all.length)}</p>
        </div>
      </header>
      ${activeSubtopics.length ? filtersHtml() : ""}
      <p class="visually-hidden" aria-live="polite" data-status></p>
      <div class="rubric-results" data-results>${resultsHtml()}</div>
    </div>
    <section class="container section other-rubrics" aria-labelledby="other-title">
      <h2 class="h-section" id="other-title">Інші рубрики</h2>
      ${rubricChips(otherRubrics, { label: "Інші рубрики" })}
    </section>`;
}

// ---------- Поведінка ----------

function updateResults({ focusFrom = -1 } = {}) {
  const box = main.querySelector("[data-results]");
  box.innerHTML = resultsHtml();
  main.querySelectorAll(".filters [data-subtopic]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.subtopic === state.subtopic)));
  const n = filtered().length;
  main.querySelector("[data-status]").textContent = state.subtopic
    ? `Підтема «${state.subtopic}»: ${countLabel(n)}`
    : `Усі матеріали рубрики: ${countLabel(n)}`;
  // Після «Показати ще» фокус переходить на першу нову картку
  if (focusFrom >= 0) {
    const links = box.querySelectorAll("#rubric-list .card__link");
    links[focusFrom]?.focus();
  }
}

function setSubtopic(value) {
  state.subtopic = activeSubtopics.includes(value) ? value : "";
  state.shown = PAGE_SIZE;
  // Фільтр зберігається в адресі, щоб посиланням можна було поділитися
  const url = new URL(location.href);
  if (state.subtopic) url.searchParams.set("tema", state.subtopic);
  else url.searchParams.delete("tema");
  history.replaceState(null, "", url);
  updateResults();
}

function bind() {
  main.addEventListener("click", (e) => {
    const sub = e.target.closest("[data-subtopic]");
    if (sub) return setSubtopic(sub.dataset.subtopic);
    if (e.target.closest("[data-more]")) {
      const from = state.shown;
      state.shown += PAGE_SIZE;
      updateResults({ focusFrom: from });
    }
  });
}

// ---------- Запуск ----------

if (!rubric) {
  setPageMeta({ title: "Рубрику не знайдено" });
  main.innerHTML =
    notFoundHtml({ title: "Такої рубрики немає", text: "Можливо, її перейменували або в посиланні помилка. Ось усі наші рубрики:" }) +
    `<div class="container">${rubricChips(rubrics)}</div>`;
} else {
  setActiveRubric(rubric.id);
  setPageMeta({ title: rubric.name, description: rubric.description });
  const tema = params.get("tema");
  if (tema && activeSubtopics.includes(tema)) state.subtopic = tema;
  main.innerHTML = pageHtml();
  bind();
  reveal(main);
}
