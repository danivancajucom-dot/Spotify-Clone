import { $, icon } from "./utils.js";

let resolver = null;
let initialized = false;

function getModal() {
  return $("#modal");
}

export function confirmDialog(options = {}) {
  const modal = getModal();

  // Allow the form to work even if the confirmation modal is unavailable.
  if (
    !modal ||
    !$("#m-title") ||
    !$("#m-text") ||
    !$("#m-ok") ||
    !$("#m-cancel") ||
    !$("#m-icon")
  ) {
    return Promise.resolve(
      window.confirm(options.text || options.title || "Continue?")
    );
  }

  $("#m-title").textContent = options.title || "Are you sure?";
  $("#m-text").textContent = options.text || "";
  $("#m-ok").textContent = options.ok || "Confirm";

  $("#m-ok").className =
    "btn " + (options.danger ? "danger" : "");

  const dialog = $(".dialog", modal);

  if (dialog) {
    dialog.classList.toggle("danger", Boolean(options.danger));
  }

  $("#m-icon").classList.toggle(
    "danger",
    Boolean(options.danger)
  );

  $("#m-icon").innerHTML = icon(
    options.icon || (options.danger ? "trash" : "heart")
  );

  modal.classList.add("open");

  return new Promise((resolve) => {
    // Resolve any previously pending confirmation before opening another.
    if (resolver) {
      resolver(false);
    }

    resolver = resolve;
    $("#m-ok").focus();
  });
}

function closeModal(confirmed) {
  const modal = getModal();

  if (modal) {
    modal.classList.remove("open");
  }

  const resolve = resolver;
  resolver = null;

  if (resolve) {
    resolve(confirmed);
  }
}

export function initDialog() {
  if (initialized) return;
  initialized = true;

  // Event delegation is important because Turbo can replace modal elements.
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    if (target.closest("#m-ok")) {
      event.preventDefault();
      closeModal(true);
      return;
    }

    if (target.closest("#m-cancel")) {
      event.preventDefault();
      closeModal(false);
      return;
    }

    const modal = getModal();

    if (modal && target === modal) {
      closeModal(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && getModal()?.classList.contains("open")) {
      closeModal(false);
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) return;
    if (!form.dataset.confirm || form.dataset.done === "1") return;

    event.preventDefault();

    const confirmed = await confirmDialog({
      title: form.dataset.confirm,
      text: form.dataset.confirmText,
      ok: form.dataset.confirmOk,
      danger: form.dataset.danger === "1",
      icon: form.dataset.icon,
    });

    if (!confirmed) return;

    // Prevent this form from opening the same confirmation twice.
    form.dataset.done = "1";

    if (form.dataset.toast) {
      try {
        sessionStorage.setItem("toast", form.dataset.toast);
      } catch {
        // Submission should still work if sessionStorage is unavailable.
      }
    }

    const heart = $(".heart", form);

    if (heart) {
      heart.classList.add("pop");

      window.setTimeout(() => {
        HTMLFormElement.prototype.submit.call(form);
      }, 250);
    } else {
      HTMLFormElement.prototype.submit.call(form);
    }
  });
}