// spotify_clone/music/static/music/js/main.js

import { $, colourPlaceholders } from "./modules/utils.js";
import { initToasts } from "./modules/toast.js";
import { initDialog } from "./modules/dialog.js";
import { initForms } from "./modules/forms.js";
import { initDropzones } from "./modules/dropzone.js";
import { initPlayer } from "./modules/player.js";
import { initRowMenus } from "./modules/row-menu.js";
import { initAuthModal } from "./modules/auth-modal.js";


function initPage() {

  // Clear stale Turbo snapshots before a form submission.
  // The redirected page will display the latest saved information.
  document.addEventListener(
    "turbo:submit-start",
    () => {
      window.Turbo?.cache?.clear?.();
    },
    { once: true }
  );

  colourPlaceholders();

  // Greeting.
  const greeting = $("#greeting");

  if (greeting) {
    const hour = new Date().getHours();

    const message =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

    greeting.textContent =
      `${message}, ${greeting.dataset.name || ""}`;
  }

  // Topbar shadow on scroll.
  const topbar = $(".topbar");

  if (topbar && !topbar.dataset.scrollInit) {
    topbar.dataset.scrollInit = "1";

    const updateShadow = () => {
      topbar.classList.toggle(
        "scrolled",
        window.scrollY > 8
      );
    };

    window.addEventListener("scroll", updateShadow, {
      passive: true,
    });

    updateShadow();
  }

  // Persistent music player.
  initPlayer();
}


// Initialize once on initial page load.
initToasts();
initDialog();
initRowMenus();
initAuthModal();
initForms();
initDropzones();

initPage();


// Reinitialize page-dependent features after Turbo navigation.
document.addEventListener("turbo:load", () => {
  initPage();
});