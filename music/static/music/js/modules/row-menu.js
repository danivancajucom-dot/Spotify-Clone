// spotify_clone/music/static/music/js/modules/row-menu.js
import { $$ } from "./utils.js";

// Three-dots menu on every song row (components/track_row.html).
//
// The menu is moved to <body> while it is open so the table's scroll area and the
// row animations can never clip it, then put back into its row when it closes.
let openState = null; // { button, menu, home }
let initialized = false;

function placeMenu(button, menu) {
  const gap = 6;
  const edge = 8;
  const rect = button.getBoundingClientRect();

  menu.style.visibility = "hidden";
  menu.style.top = "0px";
  menu.style.left = "0px";
  menu.hidden = false;

  const width = menu.offsetWidth;
  const height = menu.offsetHeight;

  // Right edge of the menu lines up with the right edge of the button.
  let left = rect.right - width;
  left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));

  // Open downwards, or upwards when there is no room below.
  let top = rect.bottom + gap;
  if (top + height > window.innerHeight - edge) {
    top = Math.max(edge, rect.top - height - gap);
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = "";
}

function openMenu(button) {
  const home = button.parentElement;
  const menu = home?.querySelector(":scope > .row-menu");
  if (!menu) return;

  document.body.appendChild(menu);
  placeMenu(button, menu);

  button.setAttribute("aria-expanded", "true");
  openState = { button, menu, home };

  menu.querySelector(".menu-item:not(:disabled)")?.focus({ preventScroll: true });
}

function closeMenu({ restoreFocus = false } = {}) {
  if (!openState) return;

  const { button, menu, home } = openState;
  openState = null;

  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");

  // Put the menu back into its row after the click that closed it has finished,
  // so a form button inside it still submits normally.
  setTimeout(() => {
    if (home.isConnected) home.appendChild(menu);
    else menu.remove();
  }, 0);

  if (restoreFocus && button.isConnected) button.focus();
}

export function initRowMenus() {
  if (initialized) return;
  initialized = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest(".row-menu-btn");

    if (button) {
      event.preventDefault();
      const sameButton = openState && openState.button === button;
      closeMenu();
      if (!sameButton) openMenu(button);
      return;
    }

    // Choosing an item closes the menu; clicking anywhere else does too.
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (!openState) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = $$(".menu-item:not(:disabled)", openState.menu);
      if (!items.length) return;

      const index = items.indexOf(document.activeElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length].focus();
    }
  });

  // A menu that follows a scrolled or resized page would end up in the wrong place.
  document.addEventListener("scroll", () => closeMenu(), true);
  window.addEventListener("resize", () => closeMenu());

  // Never leave a menu behind when Turbo changes or caches the page.
  document.addEventListener("turbo:before-visit", () => closeMenu());
  document.addEventListener("turbo:before-cache", () => closeMenu());
}