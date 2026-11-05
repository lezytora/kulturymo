// =====================================================================
// «Культуримо» — спільні частини всіх сторінок: шапка, футер, мобільне
// меню, розкриття пошуку. Змінюєш тут — змінюється на всіх сторінках.
//
// Кожна сторінка має в HTML порожні
//   <header class="site-header" data-site-header></header>
//   <footer class="site-footer" data-site-footer></footer>
// і підключає цей файл (або свій модуль, який його імпортує).
// =====================================================================

import { site, rubrics } from "./data.js";
import { links, escapeHtml } from "./utils.js";
import { initSuggest } from "./search-suggest.js";

// Пункти верхнього ряду шапки (праворуч). Додати сторінку — новий рядок тут.
const PAGE_LINKS = [
  { id: "events", label: "Що відвідати", href: links.events() },
  { id: "about", label: "Про нас", href: links.about() },
];

// Іконки (inline SVG, колір = колір тексту)
const ICON = {
  search: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
  chevron: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
};

const MOBILE_MAX = 767; // до цієї ширини — мобільна шапка з бургером

const page = document.body.dataset.page || "";
const params = new URLSearchParams(location.search);
let activeRubric = page === "rubric" ? params.get("id") : null;

// ---------- Розмітка ----------

function brandHtml(extraClass = "") {
  return `
    <a class="brand ${extraClass}" href="${links.home()}" aria-label="${escapeHtml(site.name)}, на головну">
      <img class="brand__logo" src="${links.asset("assets/logo.svg")}" alt="" width="32" height="32">
      <span class="brand__name">${escapeHtml(site.name)}</span>
    </a>`;
}

function rubricLink(r, { swatch = false } = {}) {
  const current = r.id === activeRubric ? ' aria-current="page"' : "";
  return `<a href="${links.rubric(r.id)}" data-rubric="${escapeHtml(r.id)}" style="--rubric:${escapeHtml(r.color)}"${current}>${
    swatch ? '<span class="chip__swatch" aria-hidden="true"></span>' : ""
  }${escapeHtml(r.name)}</a>`;
}

function pageLink(p) {
  const current = p.id === page ? ' aria-current="page"' : "";
  return `<a href="${p.href}"${current}>${escapeHtml(p.label)}</a>`;
}

function headerHtml() {
  return `
    <div class="container header-top">
      ${brandHtml()}
      <nav class="header-links" aria-label="Сторінки">
        ${PAGE_LINKS.map(pageLink).join("")}
      </nav>
      <!-- СОЦМЕРЕЖІ — додати пізніше -->
      <button class="icon-btn search-toggle" type="button" aria-label="Відкрити пошук" aria-expanded="false" aria-controls="header-search">${ICON.search}</button>
      <button class="icon-btn menu-toggle" type="button" aria-label="Відкрити меню" aria-expanded="false" aria-controls="mobile-menu">${ICON.menu}</button>
    </div>

    <form class="header-search" id="header-search" role="search" action="${links.search()}" method="get" hidden>
      <div class="container header-search__inner">
        <span class="header-search__icon" aria-hidden="true">${ICON.search}</span>
        <label class="visually-hidden" for="header-search-input">Пошук по сайту</label>
        <input class="header-search__input" id="header-search-input" type="search" name="q"
          placeholder="Замки, кіно, автор, подія…" autocomplete="off" enterkeyhint="search"
          aria-autocomplete="list" aria-controls="search-suggest" aria-expanded="false">
        <button class="icon-btn search-close" type="button" aria-label="Закрити пошук">${ICON.close}</button>
      </div>
      <div class="container search-suggest-wrap">
        <ul class="search-suggest" id="search-suggest" role="listbox" aria-label="Підказки пошуку" hidden></ul>
      </div>
    </form>

    <nav class="rubric-nav" aria-label="Рубрики">
      <div class="container rubric-nav__inner">
        <ul class="rubric-nav__list" role="list">
          ${rubrics.map((r) => `<li class="rubric-nav__item">${rubricLink(r)}</li>`).join("")}
        </ul>
        <div class="rubric-nav__more" hidden>
          <button class="rubric-nav__more-btn" type="button" aria-expanded="false" aria-controls="rubric-more">Ще ${ICON.chevron}</button>
          <ul class="rubric-nav__dropdown" id="rubric-more" role="list" hidden></ul>
        </div>
      </div>
    </nav>

    <div class="mobile-menu" id="mobile-menu" hidden>
      <nav class="container mobile-menu__inner" aria-label="Меню">
        <ul class="mobile-menu__rubrics" role="list">
          ${rubrics.map((r) => `<li>${rubricLink(r, { swatch: true })}</li>`).join("")}
        </ul>
        <ul class="mobile-menu__pages" role="list">
          ${PAGE_LINKS.map((p) => `<li>${pageLink(p)}</li>`).join("")}
          <li><a href="${links.search()}"${page === "search" ? ' aria-current="page"' : ""}>Пошук</a></li>
        </ul>
      </nav>
    </div>`;
}

function footerHtml() {
  return `
    <div class="container">
      <div class="footer-top">
        <div class="footer-about">
          ${brandHtml("brand--inverse")}
          <p>${escapeHtml(site.description)}</p>
        </div>
        <nav class="footer-nav footer-nav--rubrics" aria-label="Рубрики у футері">
          <h2 class="footer-nav__title">Рубрики</h2>
          <ul role="list">
            ${rubrics.map((r) => `<li>${rubricLink(r, { swatch: true })}</li>`).join("")}
          </ul>
        </nav>
        <nav class="footer-nav" aria-label="Редакція">
          <h2 class="footer-nav__title">Редакція</h2>
          <ul role="list">
            ${PAGE_LINKS.map((p) => `<li>${pageLink(p)}</li>`).join("")}
            <li><a href="${links.about("join")}">Запропонувати тему</a></li>
            <li><a href="${links.search()}">Пошук</a></li>
          </ul>
        </nav>
        <!-- СОЦМЕРЕЖІ — додати пізніше -->
      </div>
      <p class="footer-wordmark" aria-hidden="true">${escapeHtml(site.name)}</p>
      <div class="footer-bottom">
        <p>© ${site.year} ${escapeHtml(site.name)}. Студентське медіа.</p>
        <p>${escapeHtml(site.tagline)}</p>
      </div>
    </div>`;
}

// ---------- Поведінка ----------

const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;

let header;
let footer;

// «Ще ▾»: рубрики, що не влазять в один рядок, ховаються в список.
function fitRubricNav() {
  const list = header.querySelector(".rubric-nav__list");
  const items = [...list.children];
  const more = header.querySelector(".rubric-nav__more");
  const moreBtn = more.querySelector(".rubric-nav__more-btn");
  const dropdown = more.querySelector(".rubric-nav__dropdown");

  items.forEach((li) => (li.hidden = false));
  more.hidden = true;
  if (list.clientWidth === 0 || list.scrollWidth <= list.clientWidth + 1) {
    closeMore();
    dropdown.innerHTML = "";
    moreBtn.removeAttribute("data-current");
    return;
  }

  more.hidden = false;
  const overflow = [];
  for (let i = items.length - 1; i >= 0 && list.scrollWidth > list.clientWidth + 1; i--) {
    items[i].hidden = true;
    overflow.unshift(items[i]);
  }
  dropdown.innerHTML = overflow.map((li) => `<li>${li.innerHTML}</li>`).join("");
  // Якщо активна рубрика схована в «Ще» — підсвічуємо саму кнопку
  moreBtn.toggleAttribute("data-current", overflow.some((li) => li.querySelector("[aria-current]")));
}

function openMore() {
  const btn = header.querySelector(".rubric-nav__more-btn");
  btn.setAttribute("aria-expanded", "true");
  header.querySelector(".rubric-nav__dropdown").hidden = false;
}

function closeMore({ focus = false } = {}) {
  const btn = header?.querySelector(".rubric-nav__more-btn");
  if (!btn || btn.getAttribute("aria-expanded") !== "true") return;
  btn.setAttribute("aria-expanded", "false");
  header.querySelector(".rubric-nav__dropdown").hidden = true;
  if (focus) btn.focus();
}

// Мобільне меню на весь екран
function setPageInert(value) {
  for (const el of [document.querySelector("main"), footer]) {
    if (el) el.inert = value;
  }
}

function openMenu() {
  closeSearch();
  const btn = header.querySelector(".menu-toggle");
  btn.setAttribute("aria-expanded", "true");
  btn.setAttribute("aria-label", "Закрити меню");
  btn.innerHTML = ICON.close;
  header.querySelector(".mobile-menu").hidden = false;
  document.documentElement.classList.add("is-locked");
  setPageInert(true);
}

function closeMenu({ focus = false } = {}) {
  const btn = header?.querySelector(".menu-toggle");
  if (!btn || btn.getAttribute("aria-expanded") !== "true") return;
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Відкрити меню");
  btn.innerHTML = ICON.menu;
  header.querySelector(".mobile-menu").hidden = true;
  document.documentElement.classList.remove("is-locked");
  setPageInert(false);
  if (focus) btn.focus();
}

// Пошук у шапці: розкривається на всю ширину, Esc закриває
function openSearch() {
  closeMenu();
  closeMore();
  const form = header.querySelector(".header-search");
  form.hidden = false;
  header.classList.add("is-search-open");
  header.querySelector(".search-toggle").setAttribute("aria-expanded", "true");
  const input = form.querySelector("input");
  input.focus();
  input.select();
  document.dispatchEvent(new CustomEvent("search:open", { detail: { input } }));
}

function closeSearch({ focus = false } = {}) {
  const form = header?.querySelector(".header-search");
  if (!form || form.hidden) return;
  form.hidden = true;
  header.classList.remove("is-search-open");
  const toggle = header.querySelector(".search-toggle");
  toggle.setAttribute("aria-expanded", "false");
  document.dispatchEvent(new CustomEvent("search:close"));
  if (focus) toggle.focus();
}

function bindHeader() {
  header.querySelector(".search-toggle").addEventListener("click", openSearch);
  header.querySelector(".search-close").addEventListener("click", () => closeSearch({ focus: true }));

  const form = header.querySelector(".header-search");
  form.addEventListener("submit", (e) => {
    const input = form.querySelector("input");
    input.value = input.value.trim();
    if (!input.value) e.preventDefault(); // порожній запит нікуди не веде
  });

  header.querySelector(".menu-toggle").addEventListener("click", () => {
    const open = header.querySelector(".menu-toggle").getAttribute("aria-expanded") === "true";
    open ? closeMenu() : openMenu();
  });

  // Перехід за посиланням із меню — меню закриваємо (інакше «Назад» поверне відкрите меню)
  header.querySelector(".mobile-menu").addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  // Сторінка відновлена з кешу браузера кнопкою «Назад» — скидаємо відкриті панелі
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    closeMenu();
    closeSearch();
    closeMore();
  });

  header.querySelector(".rubric-nav__more-btn").addEventListener("click", (e) => {
    e.currentTarget.getAttribute("aria-expanded") === "true" ? closeMore() : openMore();
  });

  // Клік поза пошуком чи «Ще» закриває їх
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".rubric-nav__more")) closeMore();
    if (!e.target.closest(".header-search, .search-toggle")) closeSearch();
  });

  // Фокус пішов зі списку «Ще» — закриваємо
  header.querySelector(".rubric-nav__more").addEventListener("focusout", (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) closeMore();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!header.querySelector(".header-search").hidden) closeSearch({ focus: true });
    else if (header.querySelector(".rubric-nav__more-btn").getAttribute("aria-expanded") === "true") closeMore({ focus: true });
    else if (header.querySelector(".menu-toggle").getAttribute("aria-expanded") === "true") closeMenu({ focus: true });
  });

  // Перерахунок «Ще» при зміні ширини й після завантаження шрифтів
  const nav = header.querySelector(".rubric-nav__inner");
  new ResizeObserver(() => fitRubricNav()).observe(nav);
  document.fonts?.ready.then(fitRubricNav);

  // Повернулися на десктоп — мобільне меню закриваємо
  window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).addEventListener("change", () => {
    if (!isMobile()) closeMenu();
  });
}

// Підсвітити рубрику в меню (напр. сторінка матеріалу знає свою рубрику лише після завантаження даних)
export function setActiveRubric(id) {
  activeRubric = id;
  if (!header) return;
  header.querySelectorAll("[data-rubric]").forEach((a) => {
    a.toggleAttribute("aria-current", a.dataset.rubric === id);
    if (a.dataset.rubric === id) a.setAttribute("aria-current", "page");
  });
  fitRubricNav();
}

// Заголовок вкладки, description і Open Graph для динамічних сторінок (рубрика, матеріал, автор)
function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.append(el);
  }
  el.setAttribute("content", value);
}

export function setPageMeta({ title, description, type, published } = {}) {
  if (title) {
    document.title = `${title} — ${site.name}`;
    setMeta("property", "og:title", title);
  }
  if (description) {
    setMeta("name", "description", description);
    setMeta("property", "og:description", description);
  }
  if (type) setMeta("property", "og:type", type);
  if (published) setMeta("property", "article:published_time", published);
}

// Поява блоків при прокручуванні: елементи з data-reveal з'являються один раз,
// їхні дочірні елементи — з невеликою затримкою один за одним.
// Без JS або з prefers-reduced-motion усе одразу видно.
export function reveal(root = document) {
  const els = [...root.querySelectorAll("[data-reveal]:not(.is-revealed)")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduce) {
    els.forEach((el) => el.classList.add("is-revealed"));
    return;
  }
  document.documentElement.classList.add("has-reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

// Перехід до якоря (#team, #join, #id-події) після того, як сторінку відрендерив JS.
// Браузер сам до якоря не прокрутить: на момент завантаження цього елемента ще немає.
// Повертає знайдений елемент (або null). Елемент отримує клас .is-target для підсвітки.
export function scrollToHash({ focus = true } = {}) {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return null;
  const el = document.getElementById(id);
  if (!el) return null;
  document.querySelectorAll(".is-target").forEach((x) => x.classList.remove("is-target"));
  el.classList.add("is-target");
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "start" });
    if (focus) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
  });
  return el;
}

// Посилання на поле пошуку в шапці (для підказок, етап 5)
export const headerSearch = {
  open: openSearch,
  close: closeSearch,
  get input() {
    return header?.querySelector(".header-search__input");
  },
};

function init() {
  header = document.querySelector("[data-site-header]");
  footer = document.querySelector("[data-site-footer]");
  if (header) {
    header.innerHTML = headerHtml();
    bindHeader();
    initSuggest(header);
    fitRubricNav();
  }
  if (footer) footer.innerHTML = footerHtml();
}

init();
