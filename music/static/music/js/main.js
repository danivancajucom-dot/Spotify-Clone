// spotify_clone/music/static/music/js/main.js

import { $, colourPlaceholders } from "./modules/utils.js";
import { initToasts } from "./modules/toast.js";
import { initDialog } from "./modules/dialog.js";
import { initForms } from "./modules/forms.js";
import { initDropzones } from "./modules/dropzone.js";
import { initPlayer } from "./modules/player.js";
import { initRowMenus } from "./modules/row-menu.js";
import { initAuthModal } from "./modules/auth-modal.js";
import { initLoading } from "./modules/loading.js";
import { initAdminManager } from "./modules/admin-manager.js";

function initPage() {
  // Clear stale Turbo snapshots before a form submission.
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

function initDatePickers() {
  if (typeof window.flatpickr !== "function") return;

  document.querySelectorAll(
    'input[type="date"]:not([data-flatpickr-init])'
  ).forEach((input) => {
    input.dataset.flatpickrInit = "1";

    window.flatpickr(input, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "F j, Y",
      allowInput: true,
      disableMobile: true,
      monthSelectorType: "static",
    });
  });
}

function initMobileNavigation() {
  if (document.documentElement.dataset.mobileNavInit === "1") return;

  document.documentElement.dataset.mobileNavInit = "1";

  const close = () => {
    document.body.classList.remove("nav-open");

    const button = $("#mobile-nav-toggle");

    button?.setAttribute("aria-expanded", "false");
    button?.setAttribute("aria-label", "Open navigation");
  };

  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element ? event.target : null;

    if (!target) return;

    if (target.closest("#mobile-nav-toggle")) {
      const open = !document.body.classList.contains("nav-open");

      document.body.classList.toggle("nav-open", open);

      const button = $("#mobile-nav-toggle");

      button?.setAttribute("aria-expanded", String(open));
      button?.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation"
      );

      return;
    }

    if (target.closest("#app-sidebar a")) close();

    if (
      document.body.classList.contains("nav-open") &&
      !target.closest("#app-sidebar")
    ) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

// Initialize once on initial page load.
initToasts();
initDialog();
initRowMenus();
initAuthModal();
initForms();
initLoading();
initAdminManager();
initDropzones();
initMobileNavigation();
initDatePickers();

initPage();

// Reinitialize page-dependent features after Turbo navigation.
document.addEventListener("turbo:load", () => {
  initToasts();
  initForms();
  initDropzones();
  initDatePickers();
  initPage();
});