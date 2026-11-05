// =====================================================================
// Сторінка матеріалу: article.html?id=slug
// Плашка рубрики, заголовок, лід, автор, дата, час читання, обкладинка,
// текст із підзаголовками, цитатами, галереєю й відео; теги, блок автора,
// «Читайте також».
// =====================================================================

import { setActiveRubric, setPageMeta, reveal } from "./main.js";
import { articles } from "./data.js";
import { links, escapeHtml, getRubric, getAuthor, formatDate, isoDateTime, readingTime, byNewest } from "./utils.js";
import { mediaHtml, avatarHtml, tagHtml, cardM, notFoundHtml, PLAY_ICON } from "./components.js";

const RELATED_COUNT = 3; // скільки карток у «Читайте також»

const params = new URLSearchParams(location.search);
const article = articles.find((a) => a.id === params.get("id"));
const main = document.querySelector("#main");

// ---------- Блоки тексту ----------

const YT_ID = /^[\w-]{6,20}$/; // формат ID відео з YouTube

function videoHtml(youtubeId, color) {
  const id = YT_ID.test(youtubeId || "") ? youtubeId : "";
  // Є ID — кнопка Play підвантажує плеєр YouTube лише після кліку (сторінка не важчає)
  if (id) {
    return `
      <figure class="wide video-embed" data-youtube="${escapeHtml(id)}">
        <div class="media media--16x9 media--video" style="--rubric:${escapeHtml(color)}">
          <button class="play" type="button" aria-label="Відтворити відео">${PLAY_ICON}</button>
          <span class="media__label" aria-hidden="true">Відео</span>
        </div>
      </figure>`;
  }
  // ID ще немає — заглушка з іконкою Play
  return `
    <figure class="wide video-embed">
      ${mediaHtml({ alt: "Відео до матеріалу", ratio: "16x9", color, video: true })}
    </figure>`;
}

function galleryHtml(items, color) {
  return `
    <figure class="wide gallery${items.length % 2 ? " gallery--odd" : ""}">
      <ul class="gallery__grid" role="list">
        ${items.map((it) => `<li>${mediaHtml({ src: it.src, alt: it.alt, ratio: "3x2", color })}</li>`).join("")}
      </ul>
      ${items.some((it) => it.alt) ? `<figcaption class="visually-hidden">Галерея: ${items.length} фото</figcaption>` : ""}
    </figure>`;
}

function blockHtml(block, color) {
  switch (block.type) {
    case "p":
      return `<p>${escapeHtml(block.text)}</p>`;
    case "h2":
      return `<h2>${escapeHtml(block.text)}</h2>`;
    case "quote":
      return `<blockquote class="pullquote"><p>${escapeHtml(block.text)}</p></blockquote>`;
    case "gallery":
      return galleryHtml(block.items || [], color);
    case "video":
      return videoHtml(block.youtubeId, color);
    default:
      return "";
  }
}

// ---------- Розмітка сторінки ----------

function relatedList() {
  const others = [...articles].filter((a) => a.id !== article.id).sort(byNewest);
  const same = others.filter((a) => a.rubric === article.rubric);
  const fill = others.filter((a) => a.rubric !== article.rubric);
  return [...same, ...fill].slice(0, RELATED_COUNT);
}

function pageHtml() {
  const rubric = getRubric(article.rubric);
  const author = getAuthor(article.author);
  const color = rubric?.color || "";
  const cover = article.cover || {};

  return `
    <article class="article" style="--rubric:${escapeHtml(color)}">
      <header class="container article__head">
        <div class="article__col">
          ${tagHtml(article.rubric)}
          <h1 class="article__title">${escapeHtml(article.title)}</h1>
          <p class="article__lead">${escapeHtml(article.lead)}</p>
          <div class="byline">
            ${author ? `<a class="byline__photo" href="${links.author(author.id)}" tabindex="-1" aria-hidden="true">${avatarHtml(author, 48)}</a>` : ""}
            <div class="byline__text">
              ${author ? `<a class="byline__name" href="${links.author(author.id)}">${escapeHtml(author.name)}</a>` : ""}
              <div class="meta">
                <time datetime="${isoDateTime(article.date, article.time)}">${formatDate(article.date)}</time>
                <span>${readingTime(article)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <figure class="container article__cover">
        ${mediaHtml({ src: cover.src, alt: cover.alt, ratio: "16x9", color, eager: true })}
        ${cover.caption ? `<figcaption>${escapeHtml(cover.caption)}</figcaption>` : ""}
      </figure>

      <div class="container">
        <div class="article__col prose">
          ${article.body.map((b) => blockHtml(b, color)).join("")}
        </div>
      </div>

      <footer class="container article__foot">
        <div class="article__col">
          ${
            article.tags?.length
              ? `<nav class="article__tags" aria-label="Теги матеріалу">
                  <ul class="chips" role="list">
                    ${article.tags.map((t) => `<li><a class="chip" href="${links.search(t)}">${escapeHtml(t)}</a></li>`).join("")}
                  </ul>
                </nav>`
              : ""
          }
          ${
            author
              ? `<section class="author-box" aria-labelledby="author-box-name">
                  <a href="${links.author(author.id)}" tabindex="-1" aria-hidden="true">${avatarHtml(author, 96)}</a>
                  <div class="author-box__text">
                    <h2 class="author-box__name" id="author-box-name"><a href="${links.author(author.id)}">${escapeHtml(author.name)}</a></h2>
                    <p class="author-box__role">${escapeHtml(author.role)}</p>
                    <p>${escapeHtml(author.bio)}</p>
                    <a class="link-arrow" href="${links.author(author.id)}">Усі матеріали автора</a>
                  </div>
                </section>`
              : ""
          }
        </div>
      </footer>
    </article>

    <section class="container section related" aria-labelledby="related-title" data-reveal>
      <div class="section-head">
        <h2 class="section-head__title" id="related-title">Читайте також</h2>
        ${rubric ? `<a class="link-arrow" href="${links.rubric(rubric.id)}">До рубрики «${escapeHtml(rubric.name)}»</a>` : ""}
      </div>
      <ul class="related__grid" role="list">
        ${relatedList().map((a) => `<li>${cardM(a, { showTag: a.rubric !== article.rubric })}</li>`).join("")}
      </ul>
    </section>`;
}

// Клік по Play — замість заглушки вбудовується плеєр YouTube (youtube-nocookie)
function bindVideo() {
  main.addEventListener("click", (e) => {
    const btn = e.target.closest(".video-embed[data-youtube] .play");
    if (!btn) return;
    const fig = btn.closest(".video-embed");
    const id = fig.dataset.youtube;
    const box = fig.querySelector(".media");
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="Відео: ${escapeHtml(article.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    box.querySelector("iframe").focus();
  });
}

// ---------- Запуск ----------

if (!article) {
  setPageMeta({ title: "Матеріал не знайдено" });
  main.innerHTML = notFoundHtml({
    title: "Такого матеріалу немає",
    text: "Можливо, його перенесли або в посиланні помилка. Спробуй пошук або почни з головної.",
  });
} else {
  setActiveRubric(article.rubric);
  setPageMeta({ title: article.title, description: article.lead, type: "article", published: isoDateTime(article.date, article.time) });
  main.innerHTML = pageHtml();
  bindVideo();
  reveal(main);
}
