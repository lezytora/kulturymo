// =====================================================================
// Сторінка 404: дружній текст, пошук і рубрики (з data.js).
// Vercel показує 404.html за будь-якою адресою, тому шляхи в 404.html
// абсолютні (/js/...), а посилання тут будуються від кореня сайту через utils.js.
// =====================================================================

import "./main.js";
import { rubrics } from "./data.js";
import { links } from "./utils.js";
import { rubricChips } from "./components.js";

const box = document.querySelector("[data-404-rubrics]");
if (box) box.innerHTML = rubricChips(rubrics, { label: "Рубрики" });

// Пошук і кнопка «На головну» ведуть у корінь сайту (на випадок, якщо сайт лежить не в корені домену)
document.querySelector("[data-404-search]")?.setAttribute("action", links.search());
document.querySelector("[data-404-home]")?.setAttribute("href", links.home());
