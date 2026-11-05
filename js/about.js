// =====================================================================
// Сторінка «Про нас»: about.html (якорі #team і #join)
//  • вступ: хто ми, місія, три принципи редакції (тексти — site.about у data.js);
//  • команда: картки з фото, роллю, ім'ям і коротким описом (масив authors);
//  • «Долучайся до нас»: як стати автором + форма «Запропонувати тему».
// Форма нікуди не відправляє дані (бекенду немає): після надсилання — «Дякуємо!».
// =====================================================================

import { setPageMeta, scrollToHash } from "./main.js";
import { site, authors, articles } from "./data.js";
import { links, escapeHtml, plural } from "./utils.js";
import { mediaHtml } from "./components.js";

const main = document.querySelector("#main");
const about = site.about;

const articleCount = (authorId) => articles.filter((a) => a.author === authorId).length;
const countArticles = (n) => `${n} ${plural(n, ["матеріал", "матеріали", "матеріалів"])}`;

// ---------- Вступ ----------
function introHtml() {
  return `
    <div class="container about-intro">
      <header class="about-intro__head">
        <h1 class="h-page">Про нас</h1>
        <p class="about-statement">${escapeHtml(about.statement)}</p>
      </header>
      <div class="about-intro__text">
        ${about.intro.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </div>
      <section class="principles" aria-labelledby="principles-title">
        <h2 class="principles__title" id="principles-title">Принципи редакції</h2>
        <ol class="principles__list" role="list">
          ${about.principles
            .map(
              (p) => `
            <li class="principle">
              <h3 class="principle__title">${escapeHtml(p.title)}</h3>
              <p class="principle__text">${escapeHtml(p.text)}</p>
            </li>`
            )
            .join("")}
        </ol>
      </section>
    </div>`;
}

// ---------- Команда ----------
function personHtml(person) {
  const n = articleCount(person.id);
  return `
    <li>
      <article class="card person">
        ${mediaHtml({ src: person.photo, alt: person.name, ratio: "4x5", extraClass: "person__photo" })}
        <div class="card__body">
          <p class="person__role">${escapeHtml(person.role)}</p>
          <h3 class="card__title person__name"><a class="card__link" href="${links.author(person.id)}">${escapeHtml(person.name)}</a></h3>
          <p class="person__bio">${escapeHtml(person.bio)}</p>
          ${n ? `<p class="meta"><span>${countArticles(n)}</span></p>` : ""}
        </div>
      </article>
    </li>`;
}

function teamHtml() {
  return `
    <section class="container section team" id="team" aria-labelledby="team-title">
      <div class="section-head">
        <h2 class="section-head__title" id="team-title">Команда <span class="section-head__note">${authors.length} ${plural(authors.length, ["людина", "людини", "людей"])}</span></h2>
      </div>
      <ul class="team-grid" role="list">${authors.map(personHtml).join("")}</ul>
    </section>`;
}

// ---------- Долучайся ----------
function joinHtml() {
  return `
    <section class="container section" id="join" aria-labelledby="join-title">
      <div class="join">
        <div class="join__text">
          <h2 class="h-section" id="join-title">Долучайся до нас</h2>
          <p class="lead">${escapeHtml(about.join.text)}</p>
          <ol class="join__steps" role="list">
            ${about.join.steps.map((s, i) => `<li><span class="join__step-num" aria-hidden="true">${i + 1}</span><span>${escapeHtml(s)}</span></li>`).join("")}
          </ol>
        </div>
        <div class="join__form-wrap">
          <form class="join-form" data-join-form aria-labelledby="join-form-title">
            <h3 class="join-form__title" id="join-form-title">Запропонувати тему</h3>
            <div class="field">
              <label class="field__label" for="join-name">Ім’я</label>
              <input class="field__input" id="join-name" name="name" type="text" autocomplete="name" maxlength="80" required>
            </div>
            <div class="field">
              <label class="field__label" for="join-message">Тема або ідея</label>
              <textarea class="field__input field__input--area" id="join-message" name="message" rows="5" maxlength="2000" required aria-describedby="join-message-hint"></textarea>
              <p class="field__hint" id="join-message-hint">Про що варто розповісти й чому це цікаво саме зараз.</p>
            </div>
            <button class="btn" type="submit">Надіслати тему</button>
          </form>
          <div class="join-thanks" role="status" tabindex="-1" data-join-thanks></div>
        </div>
      </div>
    </section>`;
}

// ---------- Форма ----------
function bindForm() {
  const form = main.querySelector("[data-join-form]");
  const thanks = main.querySelector("[data-join-thanks]");

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // нікуди не відправляємо: бекенду немає
    const name = form.elements.name.value.trim();

    // Текст подяки збираємо через textContent: введене ім'я не потрапляє в HTML
    const title = document.createElement("p");
    title.className = "join-thanks__title";
    title.textContent = name ? `Дякуємо, ${name}!` : "Дякуємо!";
    const text = document.createElement("p");
    text.textContent = "Ми отримали твою тему й обговоримо її на найближчій планірці редакції.";
    const again = document.createElement("button");
    again.type = "button";
    again.className = "btn btn--quiet";
    again.textContent = "Запропонувати ще одну тему";
    again.addEventListener("click", () => {
      thanks.replaceChildren();
      thanks.classList.remove("is-visible");
      form.reset();
      form.hidden = false;
      form.elements.name.focus();
    });

    form.hidden = true;
    thanks.replaceChildren(title, text, again);
    thanks.classList.add("is-visible");
    thanks.focus();
  });
}

function init() {
  setPageMeta({ title: "Про нас", description: "Хто робить «Культуримо»: редакція студентського медіа про культуру Львова. Як долучитися й запропонувати тему." });
  main.innerHTML = introHtml() + teamHtml() + joinHtml();
  bindForm();
  scrollToHash({ focus: false });
  window.addEventListener("hashchange", () => scrollToHash({ focus: false }));
}

init();
