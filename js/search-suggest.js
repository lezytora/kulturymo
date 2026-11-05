// =====================================================================
// Підказки під полем пошуку в шапці.
// До 5 підказок (рубрики, матеріали, теги) + рядок «Усі результати».
// ↑/↓ — вибір, Enter — відкрити вибране або сторінку пошуку, Esc — закрити.
// =====================================================================

import { links, escapeHtml, getRubric } from "./utils.js";
import { suggest, highlight } from "./search-core.js";

const DEBOUNCE_MS = 150;
const LIMIT = 5;
const MIN_LENGTH = 2; // підказки з’являються від двох символів

const TYPE_LABEL = { rubric: "Рубрика", article: "Матеріал", tag: "Тег" };

export function initSuggest(header) {
  const form = header.querySelector(".header-search");
  const input = form.querySelector(".header-search__input");
  const list = form.querySelector(".search-suggest");
  let items = [];   // [{ href, ... }]
  let active = -1;  // індекс вибраного пункту
  let timer;

  const hrefFor = (s, query) => {
    if (s.type === "rubric") return links.rubric(s.id);
    if (s.type === "article") return links.article(s.id);
    if (s.type === "tag") return links.search(s.label);
    return links.search(query);
  };

  function close() {
    list.hidden = true;
    list.innerHTML = "";
    items = [];
    active = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function setActive(i) {
    active = i;
    list.querySelectorAll("[role=option]").forEach((el, n) => el.setAttribute("aria-selected", String(n === i)));
    if (i >= 0) input.setAttribute("aria-activedescendant", `suggest-${i}`);
    else input.removeAttribute("aria-activedescendant");
  }

  function render() {
    const query = input.value.trim();
    if (query.length < MIN_LENGTH) return close();
    const found = suggest(query, LIMIT);
    items = [...found, { type: "all" }].map((s) => ({ ...s, href: hrefFor(s, query) }));

    list.innerHTML = items
      .map((s, i) => {
        if (s.type === "all") {
          return `<li class="suggest suggest--all" id="suggest-${i}" role="option" aria-selected="false" data-index="${i}">
            ${found.length ? "Усі результати за запитом" : "Шукати"} «${escapeHtml(query)}» <span aria-hidden="true">→</span>
          </li>`;
        }
        const color = s.type === "rubric" ? s.color : getRubric(s.rubric)?.color;
        return `<li class="suggest" id="suggest-${i}" role="option" aria-selected="false" data-index="${i}">
            <span class="suggest__type"${color ? ` style="--rubric:${escapeHtml(color)}"` : ""}>${TYPE_LABEL[s.type]}</span>
            <span class="suggest__label">${highlight(s.label, query)}</span>
          </li>`;
      })
      .join("");
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActive(-1);
  }

  function go(i) {
    const item = items[i];
    if (item) window.location.href = item.href;
  }

  input.setAttribute("role", "combobox");

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, DEBOUNCE_MS);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active < items.length - 1 ? active + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active > 0 ? active - 1 : items.length - 1);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // без вибраного пункту Enter надсилає форму → search.html?q=
      go(active);
    }
  });

  // mousedown, щоб поле не втрачало фокус до кліку
  list.addEventListener("mousedown", (e) => e.preventDefault());
  list.addEventListener("click", (e) => {
    const li = e.target.closest("[data-index]");
    if (li) go(Number(li.dataset.index));
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("[data-index]");
    if (li && Number(li.dataset.index) !== active) setActive(Number(li.dataset.index));
  });

  document.addEventListener("search:close", close);
  document.addEventListener("search:open", () => {
    if (input.value.trim().length >= MIN_LENGTH) render();
  });
}
