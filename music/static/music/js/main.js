import { $, colourPlaceholders } from "./modules/utils.js";
import { initToasts } from "./modules/toast.js";
import { initDialog } from "./modules/dialog.js";
import { initForms } from "./modules/forms.js";
import { initDropzones } from "./modules/dropzone.js";
import { initPlayer } from "./modules/player.js";
import { initAuthModal } from "./modules/auth-modal.js";

function initPage() {
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
      topbar.classList.toggle("scrolled", window.scrollY > 8);
    };

    window.addEventListener("scroll", updateShadow, {
      passive: true,
    });

    updateShadow();
  }

  initPlayer();
}

// Initialize once on initial page load.
initToasts();
initDialog();
initAuthModal();
initForms();
initDropzones();

initPage();

// Reinitialize page-dependent features after Turbo navigation.
document.addEventListener("turbo:load", () => {
  initPage();
});