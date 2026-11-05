// =====================================================================
// Сторінка автора: author.html?id=slug
// Фото, роль, ім'я, опис, рубрики автора, усі його матеріали (найновіші першими)
// і посилання на інших людей з команди. Невідомий id — стан «не знайдено».
// =====================================================================

import { setPageMeta, reveal } from "./main.js";
import { rubrics, authors, articles } from "./data.js";
import { links, escapeHtml, byNewest, plural, formatDate } from "./utils.js";
import { cardM, avatarHtml, notFoundHtml, rubricChips } from "./components.js";

// Скільки матеріалів показувати за раз
const PAGE_SIZE = 6;

const main = document.querySelector("#main");
const author = authors.find((a) => a.id === new URLSearchParams(location.search).get("id"));
const list = author ? articles.filter((a) => a.author === author.id).sort(byNewest) : [];
let shown = PAGE_SIZE;

const countArticles = (n) => `${n} ${plural(n, ["матеріал", "матеріали", "матеріалів"])}`;

function headHtml() {
  const own = rubrics.filter((r) => list.some((a) => a.rubric === r.id));
  const first = list[list.length - 1];
  return `
    <header class="author-head">
      ${avatarHtml(author, 176)}
      <div class="author-head__text">
        <p class="author-head__role">${escapeHtml(author.role)}</p>
        <h1 class="h-page author-head__name">${escapeHtml(author.name)}</h1>
        <p class="lead">${escapeHtml(author.bio)}</p>
        <p class="meta">
          <span>${countArticles(list.length)}</span>
          ${first ? `<span>Пише з ${escapeHtml(formatDate(first.date))}</span>` : ""}
        </p>
        ${own.length ? rubricChips(own, { label: "Рубрики автора" }) : ""}
      </div>
    </header>`;
}

function articlesHtml() {
  if (!list.length) {
    return `<p class="lead text-muted">Перший матеріал уже в роботі.</p>`;
  }
  const visible = list.slice(0, shown);
  const left = list.length - visible.length;
  return `
    <ul class="rubric-grid author-grid" role="list" id="author-list">
      ${visible.map((a) => `<li>${cardM(a, { showTag: true, author: false })}</li>`).join("")}
    </ul>
    ${
      left > 0
        ? `<div class="load-more"><button class="btn btn--quiet" type="button" data-more aria-controls="author-list">Показати ще <span class="load-more__count">${left}</span></button></div>`
        : ""
    }`;
}

function othersHtml() {
  const others = authors.filter((a) => a.id !== author.id);
  return `
    <section class="container section" aria-labelledby="others-title">
      <div class="section-head">
        <h2 class="section-head__title" id="others-title">Інші автори</h2>
        <a class="link-arrow" href="${links.about("team")}">Уся команда</a>
      </div>
      <ul class="others" role="list">
        ${others
          .map(
            (p) => `
          <li>
            <a class="face" href="${links.author(p.id)}">
              ${avatarHtml(p, 96)}
              <span class="face__name">${escapeHtml(p.name)}</span>
            </a>
          </li>`
          )
          .join("")}
      </ul>
    </section>`;
}

function pageHtml() {
  return `
    <div class="container author-page">
      ${headHtml()}
      <section class="author-articles" aria-labelledby="articles-title">
        <div class="section-head">
          <h2 class="section-head__title" id="articles-title">Матеріали <span class="section-head__note">${list.length}</span></h2>
        </div>
        <div data-articles>${articlesHtml()}</div>
      </section>
    </div>
    ${othersHtml()}`;
}

if (!author) {
  setPageMeta({ title: "Автора не знайдено" });
  main.innerHTML = notFoundHtml({
    title: "Такого автора немає",
    text: "Можливо, посилання застаріло або в ньому помилка. Познайомся з усією командою на сторінці «Про нас».",
  }).replace(
    "</section>",
    `<p><a class="link-arrow" href="${links.about("team")}">Уся команда</a></p></section>`
  );
} else {
  setPageMeta({ title: author.name, description: `${author.role}. ${author.bio}`, type: "profile" });
  main.innerHTML = pageHtml();
  main.addEventListener("click", (e) => {
    if (!e.target.closest("[data-more]")) return;
    const from = shown;
    shown += PAGE_SIZE;
    main.querySelector("[data-articles]").innerHTML = articlesHtml();
    main.querySelectorAll("#author-list .card__link")[from]?.focus();
  });
  reveal(main);
}
