// spotify_clone/music/static/music/js/modules/loading.js
import { $, $$ } from "./utils.js";
import { toast } from "./toast.js";

let activeForm = null;
let safetyTimer = null;
let hooked = false;

// If nothing answers within this time, give the screen back instead of freezing it.
const GIVE_UP_AFTER_MS = 30000;


export function showLoading(
  form,
  title = "Saving your changes",
  message = "Please wait while we update your music space…"
) {
  const overlay = $("#loading-overlay");

  if (!overlay) return;

  activeForm = form || null;

  $("#loading-title").textContent = title;
  $("#loading-message").textContent = message;

  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  if (form) {
    const submit = form.querySelector(
      'button[type="submit"],button:not([type])'
    );

    if (submit) {
      submit.dataset.originalText ||= (
        submit.textContent.trim()
      );

      submit.disabled = true;
      submit.classList.add("is-submitting");
    }
  }

  clearTimeout(safetyTimer);
  safetyTimer = setTimeout(() => {
    hideLoading();
    toast("This is taking longer than expected. Please check your input and try again.", "error");
  }, GIVE_UP_AFTER_MS);
}


export function hideLoading() {
  clearTimeout(safetyTimer);
  safetyTimer = null;

  const overlay = $("#loading-overlay");

  overlay?.classList.remove("open");
  overlay?.setAttribute("aria-hidden", "true");

  // Re-enable every submit button we disabled (the form may no longer be the active one)
  $$("button.is-submitting").forEach((button) => {
    button.disabled = false;
    button.classList.remove("is-submitting");
  });

  activeForm = null;
}


// Whatever happens to a request, the loading screen must always close again.
function hookAutoHide() {
  if (hooked) return;
  hooked = true;

  // A Turbo form request finished (redirect, validation error, or failure)
  document.addEventListener("turbo:submit-end", (event) => {
    hideLoading();

    const result = event.detail || {};

    // success is undefined/false-with-error when the server answered in a way Turbo
    // could not display (a network error, or a 200 that is not a redirect).
    if (result.error || result.success === undefined) {
      toast("Something went wrong while saving. Please check your input and try again.", "error");
    }
  });

  document.addEventListener("turbo:fetch-request-error", () => hideLoading());
  document.addEventListener("turbo:before-render", () => hideLoading());
  document.addEventListener("turbo:render", () => hideLoading());
  document.addEventListener("turbo:load", () => hideLoading());

  // Back/forward button can bring a frozen page with the overlay still open
  window.addEventListener("pageshow", () => hideLoading());
}

hookAutoHide();


export function initLoading() {
  hookAutoHide();

  document.addEventListener("submit", (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    // Another handler (validation, confirm dialog) already stopped this submit
    if (event.defaultPrevented) {
      return;
    }

    if (
      form.matches(
        "[data-admin-form], [data-admin-search], [data-admin-delete]"
      )
    ) {
      return;
    }

    // Confirmation forms are shown only after the user confirms them.
    if (
      form.dataset.confirm
      && form.dataset.done !== "1"
    ) {
      return;
    }

    showLoading(
      form,
      form.dataset.loadingTitle || "Processing request",
      form.dataset.loadingMessage
        || "Please wait while we complete this action…"
    );
  });
}