// =====================================================================
// Головна сторінка. Усі блоки збираються з data.js:
//  A. Головний матеріал + «Актуальне»
//  B. Стрічка рубрик
//  C. «Що відвідати цього тижня»
//  D. Блоки рубрик (L + 3 M; на мобільному L + список S)
//  E. Тизер команди
// =====================================================================

import { reveal } from "./main.js";
import { site, rubrics, articles, events, authors } from "./data.js";
import { links, escapeHtml, byNewest, toISODate, weekRange, formatRange, toDate } from "./utils.js";
import { cardL, cardM, cardS, cardEvent, rubricChips, avatarHtml } from "./components.js";

// Налаштування головної — змінювати тут
const LATEST_COUNT = 6;        // скільки пунктів у «Актуальне»
const EVENTS_MIN = 4;          // мінімум подій у блоці «Що відвідати»
const EVENTS_MAX = 6;          // максимум подій у блоці
const CARDS_PER_RUBRIC = 4;    // 1 велика + 3 середні
const TEAM_PREVIEW = 4;        // скільки облич у тизері команди

const sorted = [...articles].sort(byNewest);
const featured = sorted.find((a) => a.featured) || sorted[0];
const rest = sorted.filter((a) => a !== featured);

// ---------- A. Головний матеріал + «Актуальне» ----------
function heroHtml() {
  const latest = rest.slice(0, LATEST_COUNT);
  return `
    <section class="hero container" aria-label="Головне">
      <div class="hero__main">
        ${cardL(featured, { level: 1, eager: true, extraClass: "card--hero" })}
      </div>
      <section class="latest" aria-labelledby="latest-title">
        <h2 class="latest__title" id="latest-title">Актуальне</h2>
        <ol class="list-s latest__list" role="list">
          ${latest.map((a) => `<li>${cardS(a, { when: true })}</li>`).join("")}
        </ol>
        <a class="link-arrow latest__all" href="${links.search()}">Усі матеріали</a>
      </section>
    </section>`;
}

// ---------- B. Стрічка рубрик ----------
function chipsHtml() {
  return `
    <div class="container home-chips">
      ${rubricChips(rubrics, { scroll: true, label: "Рубрики медіа" })}
    </div>`;
}

// ---------- C. «Що відвідати цього тижня» ----------
function weekEvents(now = new Date()) {
  const today = toISODate(now);
  const { start, end } = weekRange(now);
  const upcoming = [...events]
    .filter((e) => e.date >= today)
    .sort((a, b) => toDate(a.date, a.time) - toDate(b.date, b.time));
  const thisWeek = upcoming.filter((e) => e.date <= end);
  // Якщо цього тижня подій замало — добираємо найближчі наступні
  const list = thisWeek.length >= EVENTS_MIN ? thisWeek : upcoming.slice(0, EVENTS_MIN);
  return { list: list.slice(0, EVENTS_MAX), range: formatRange(start, end) };
}

function eventsHtml() {
  const { list, range } = weekEvents();
  const body = list.length
    ? `<ul class="events-strip" role="list" style="--cols:${list.length === 4 ? 4 : 3}">${list.map((e) => `<li>${cardEvent(e)}</li>`).join("")}</ul>`
    : `<p class="events-empty">Афіша на цей тиждень ще збирається. Зазирни на <a class="link" href="${links.events()}">сторінку подій</a> трохи згодом.</p>`;
  return `
    <section class="container section home-events" aria-labelledby="events-title" data-reveal>
      <div class="section-head">
        <h2 class="section-head__title" id="events-title">Що відвідати цього тижня <span class="section-head__note">${escapeHtml(range)}</span></h2>
        <a class="link-arrow" href="${links.events()}">Уся афіша</a>
      </div>
      ${body}
    </section>`;
}

// ---------- D. Блоки рубрик ----------
function rubricBlockHtml(rubric) {
  // Головний матеріал не дублюємо в блоці його рубрики
  const list = rest.filter((a) => a.rubric === rubric.id).slice(0, CARDS_PER_RUBRIC);
  if (!list.length) return "";
  const [first, ...others] = list;
  const titleId = `rubric-${rubric.id}`;
  return `
    <section class="container section rubric-block" style="--rubric:${escapeHtml(rubric.color)}" aria-labelledby="${titleId}" data-reveal>
      <div class="section-head">
        <h2 class="section-head__title" id="${titleId}"><a href="${links.rubric(rubric.id)}"><span class="rubric-mark" aria-hidden="true"></span>${escapeHtml(rubric.name)}</a></h2>
        <a class="link-arrow" href="${links.rubric(rubric.id)}" aria-label="До рубрики «${escapeHtml(rubric.name)}»">До рубрики</a>
      </div>
      <div class="rubric-block__grid">
        ${cardL(first, { level: 3 })}
        <ul class="rubric-block__list" role="list">
          ${others.map((a) => `<li>${cardM(a)}</li>`).join("")}
        </ul>
      </div>
    </section>`;
}

// ---------- E. Тизер команди ----------
function teamHtml() {
  const people = authors.slice(0, TEAM_PREVIEW);
  return `
    <section class="container section" aria-labelledby="team-title">
     <div class="team-teaser" data-reveal>
      <div class="team-teaser__text">
        <h2 class="h-section" id="team-title">Наша команда</h2>
        <p class="lead">${escapeHtml(site.name)} роблять студенти, які пишуть, знімають і монтують між парами. Ми ходимо на події, про які розповідаємо, і перевіряємо маршрути власними ногами.</p>
        <a class="btn" href="${links.about("team")}">Познайомитися з командою</a>
      </div>
      <ul class="team-teaser__faces" role="list">
        ${people
          .map(
            (p) => `
          <li>
            <a class="face" href="${links.author(p.id)}">
              ${avatarHtml(p, 112)}
              <span class="face__name">${escapeHtml(p.name)}</span>
            </a>
          </li>`
          )
          .join("")}
      </ul>
     </div>
    </section>`;
}

function render() {
  const main = document.querySelector("#main");
  main.innerHTML = [heroHtml(), chipsHtml(), eventsHtml(), ...rubrics.map(rubricBlockHtml), teamHtml()].join("");
  reveal(main);
}

render();
