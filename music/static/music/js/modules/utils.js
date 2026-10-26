// Small helpers shared by every module.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// <svg> that points at the icon sprite (components/icons.html)
export const icon = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;

// Turn a text into a hue (0-360) so placeholders get a stable colour
export function hueFrom(text) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// Give every [data-seed] element its own colour
export function colourPlaceholders() {
  $$("[data-seed]").forEach((el) => el.style.setProperty("--h", hueFrom(el.dataset.seed)));
}
