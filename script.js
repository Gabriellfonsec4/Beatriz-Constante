const photos = {
  portrait: { file: "IMG_3875.jpeg", crop: [126, 462, 458, 462], rotate: 0 },
  "sobrancelha-1": {
    file: "IMG_3868.jpeg",
    crop: [0, 278, 709, 925],
    rotate: 90,
  },
  "sobrancelha-2": {
    file: "IMG_3871.jpeg",
    crop: [0, 365, 709, 700],
    rotate: 90,
  },
  "sobrancelha-3": {
    file: "IMG_3873.jpeg",
    crop: [0, 280, 709, 870],
    rotate: 90,
  },
  "labio-1": { file: "IMG_3869.jpeg", crop: [0, 280, 709, 925], rotate: 90 },
  "labio-2": { file: "IMG_3870.jpeg", crop: [0, 417, 709, 680], rotate: 90 },
  "labio-3": { file: "IMG_3872.jpeg", crop: [0, 290, 709, 855], rotate: 90 },
};

const imageCache = new Map();
const rendered = new Map();

function loadImage(file) {
  if (imageCache.has(file)) return imageCache.get(file);

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Não foi possível carregar imagens/${file}`));
    image.src = `imagens/${file}`;
  });

  imageCache.set(file, promise);
  return promise;
}

async function makePhoto(key) {
  if (rendered.has(key)) return rendered.get(key);

  const config = photos[key];
  const source = await loadImage(config.file);
  const [x, y, width, height] = config.crop;

  const crop = document.createElement("canvas");
  crop.width = width;
  crop.height = height;
  crop
    .getContext("2d")
    .drawImage(source, x, y, width, height, 0, 0, width, height);

  const output = document.createElement("canvas");
  const sideways = Math.abs(config.rotate) === 90;
  output.width = sideways ? height : width;
  output.height = sideways ? width : height;

  const context = output.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "contrast(1.035) saturate(1.045) brightness(1.015)";

  if (config.rotate === 90) {
    context.translate(output.width, 0);
    context.rotate(Math.PI / 2);
  } else if (config.rotate === -90) {
    context.translate(0, output.height);
    context.rotate(-Math.PI / 2);
  }

  context.drawImage(crop, 0, 0);
  rendered.set(key, output);
  return output;
}

async function fillCanvas(canvas, key) {
  try {
    const photo = await makePhoto(key);
    canvas.width = photo.width;
    canvas.height = photo.height;
    canvas.getContext("2d").drawImage(photo, 0, 0);
  } catch (error) {
    console.error(error);
    canvas.setAttribute("aria-label", "Imagem indisponível");
  }
}

document.querySelectorAll("canvas[data-photo]").forEach((canvas) => {
  fillCanvas(canvas, canvas.dataset.photo);
});
fillCanvas(document.querySelector("#portrait"), "portrait");

/* Abas da galeria */
const tabs = [...document.querySelectorAll(".gallery-tab")];
const panels = [...document.querySelectorAll(".gallery-panel")];

function selectTab(name, focus = false) {
  tabs.forEach((tab) => {
    const selected = tab.dataset.tab === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });

  panels.forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));

  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    selectTab(next.dataset.tab, true);
  });
});

document.querySelectorAll("[data-show-tab]").forEach((link) => {
  link.addEventListener("click", () => selectTab(link.dataset.showTab));
});

/* Zoom da galeria */
const dialog = document.querySelector("#lightbox");
const largeCanvas = document.querySelector("#lightbox-canvas");
const caption = document.querySelector("#lightbox-caption");
let currentItems = [];
let currentIndex = 0;

async function showCurrentImage() {
  const item = currentItems[currentIndex];
  if (!item) return;

  try {
    const photo = await makePhoto(item.dataset.image);
    largeCanvas.width = photo.width;
    largeCanvas.height = photo.height;
    largeCanvas.getContext("2d").drawImage(photo, 0, 0);
    caption.textContent = item.dataset.caption;
  } catch (error) {
    console.error(error);
    caption.textContent = "Imagem indisponível";
  }
}

document.querySelectorAll(".gallery-item").forEach((item) => {
  item.addEventListener("click", async () => {
    currentItems = [
      ...item.closest(".gallery-panel").querySelectorAll(".gallery-item"),
    ];
    currentIndex = currentItems.indexOf(item);
    dialog.showModal();
    document.body.classList.add("no-scroll");
    await showCurrentImage();
  });
});

function changeImage(direction) {
  if (!currentItems.length) return;
  currentIndex =
    (currentIndex + direction + currentItems.length) % currentItems.length;
  showCurrentImage();
}

document
  .querySelector(".lightbox-close")
  .addEventListener("click", () => dialog.close());
document
  .querySelector(".lightbox-prev")
  .addEventListener("click", () => changeImage(-1));
document
  .querySelector(".lightbox-next")
  .addEventListener("click", () => changeImage(1));

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () =>
  document.body.classList.remove("no-scroll"),
);

document.addEventListener("keydown", (event) => {
  if (!dialog.open) return;
  if (event.key === "ArrowRight") changeImage(1);
  if (event.key === "ArrowLeft") changeImage(-1);
});

/* Seção interativa */
const selection = {
  area: "sobrancelhas",
  estilo: "natural",
};

const suggestions = {
  "sobrancelhas-natural": {
    title: "Um olhar naturalmente seu.",
    description:
      "Para quem deseja valorizar as sobrancelhas mantendo uma expressão leve e autêntica.",
  },
  "sobrancelhas-definido": {
    title: "Mais presença para o seu olhar.",
    description:
      "Para quem gosta de sobrancelhas com definição, respeitando os traços do rosto.",
  },
  "labios-natural": {
    title: "Um toque sutil de cor.",
    description:
      "Para quem quer valorizar a aparência dos lábios com um efeito delicado.",
  },
  "labios-definido": {
    title: "Seu sorriso em evidência.",
    description:
      "Para quem busca mais definição de cor e contorno, de acordo com uma avaliação individual.",
  },
};

function updateSuggestion() {
  const key = `${selection.area}-${selection.estilo}`;
  const suggestion = suggestions[key];

  document.querySelector("#choice-title").textContent = suggestion.title;
  document.querySelector("#choice-description").textContent =
    suggestion.description;

  const areaText = selection.area === "labios" ? "lábios" : "sobrancelhas";
  const styleText =
    selection.estilo === "natural" ? "mais natural" : "mais definido";

  const message = `Oi, Beatriz! Conheci seu site. Tenho interesse em ${areaText} e gosto de um resultado ${styleText}. Podemos conversar sobre uma avaliação?`;
  document.querySelector("#choice-whatsapp").href =
    `https://wa.me/5521985386414?text=${encodeURIComponent(message)}`;
}

document.querySelectorAll(".choice-options").forEach((group) => {
  group.querySelectorAll(".choice-option").forEach((button) => {
    button.addEventListener("click", () => {
      selection[group.dataset.group] = button.dataset.value;

      group.querySelectorAll(".choice-option").forEach((option) => {
        const selected = option === button;
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });

      updateSuggestion();
    });
  });
});

updateSuggestion();

/* Menu mobile */
const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

menuButton.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menu");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();
