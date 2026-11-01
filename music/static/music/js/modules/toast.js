// spotify_clone/music/static/music/js/modules/toast.js
import { $, $$, icon } from "./utils.js";


export function toast(text, kind) {
  const box = $("#toasts");

  if (!box) return;

  const element = document.createElement("div");

  element.className = (
    "toast " + (kind === "error" ? "error" : "")
  );

  element.innerHTML = (
    icon(kind === "error" ? "x" : "check")
    + "<span></span>"
  );

  element.lastChild.textContent = text;

  box.appendChild(element);

  setTimeout(() => {
    element.classList.add("out");

    setTimeout(() => {
      element.remove();
    }, 350);
  }, 4000);
}


// Django messages are rendered in #dj-msgs
// (see layouts/base.html) and displayed as toasts.
export function initToasts() {
  // Turbo briefly shows a cached copy of a page while the real one loads. Don't toast for that.
  if (document.documentElement.hasAttribute("data-turbo-preview")) return;

  const messageNodes = $$("#dj-msgs span");

  const hadErrorMessage = messageNodes.some(
    (element) => (
      (element.dataset.tag || "").includes("error")
    )
  );

  messageNodes.forEach((element) => {
    toast(
      element.textContent,
      element.dataset.tag
    );
  });

  $("#dj-msgs")?.replaceChildren();


  // Surface validation failures as a toast
  // as well as inline field errors.
  // This can run more than once for the same page (render + load), so do it once per <body>.
  if (document.body && !document.body.dataset.errorToastDone) {
    const fieldErrors = $$(".field-error span")
      .map((element) => element.textContent.trim())
      .filter(Boolean);

    const formAlert = $(".form-alert");

    if (fieldErrors.length || formAlert) {
      document.body.dataset.errorToastDone = "1";

      const message = (
        formAlert?.textContent.trim()
        || fieldErrors[0]
        || "Please review the highlighted fields."
      );

      if (!hadErrorMessage) {
        setTimeout(() => {
          toast(message, "error");
        }, 180);
      }
    }
  }


  const pending = sessionStorage.getItem("toast");

  if (pending) {
    sessionStorage.removeItem("toast");

    // Django already shows its own message after most actions,
    // so don't show two toasts.
    if (!messageNodes.length) {
      setTimeout(() => {
        toast(pending);
      }, 150);
    }
  }
}


// When a form comes back with errors Turbo renders the page but does NOT fire "turbo:load",
// only "turbo:render". Listen for it so the error toast shows in that case too.
document.addEventListener("turbo:render", () => initToasts());