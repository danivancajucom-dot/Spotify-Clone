import { $, $$ } from "./utils.js";
import { toast } from "./toast.js";
import { confirmDialog } from "./dialog.js";
import {
  showLoading,
  hideLoading,
} from "./loading.js";

let initialized = false;
let activeKind = "";

function overlay() {
  return $("#admin-manager");
}

function content() {
  return $("#admin-manager-content");
}

function setOpen(open) {
  const modal = overlay();

  if (!modal) return;

  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("manager-open", open);
}


async function load(url, options = {}) {
  const panel = content();

  if (!panel) return;

  panel.classList.add("is-loading-content");

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        ...(options.headers || {}),
      },
      credentials: "same-origin",
    });

    const html = await response.text();

    panel.innerHTML = html;
    panel.classList.remove("is-loading-content");

    const title = $("#admin-manager-title");
    const heading = panel.querySelector("[data-manager-title]");

    if (heading && title) {
      title.textContent = heading.dataset.managerTitle;
    }

    const message = response.headers.get("X-Toast-Message");

    if (message) {
      toast(message, "success");
    }

    [
      "users",
      "artists",
      "albums",
      "tracks",
      "playlists",
    ].forEach((key) => {
      const value = response.headers.get(
        `X-Stats-${key[0].toUpperCase()}${key.slice(1)}`
      );

      const stat = document.querySelector(
        `[data-stat="${key}"] strong`
      );

      if (value !== null && stat) {
        stat.textContent = value;
      }
    });

    if (!response.ok) {
      const errorText =
        panel.querySelector(".form-alert")?.textContent.trim()
        || panel.querySelector(".field-error span")?.textContent.trim()
        || "Please review the highlighted fields.";

      toast(errorText, "error");
    }

    return response;

  } catch (error) {
    panel.classList.remove("is-loading-content");

    toast(
      "Unable to load this management section. Please try again.",
      "error"
    );
  }
}


export function initAdminManager() {
  if (initialized) return;

  initialized = true;

  document.addEventListener("click", async (event) => {
    const target =
      event.target instanceof Element
        ? event.target
        : null;

    if (!target) return;

    const openButton = target.closest("[data-admin-manager]");

    if (openButton) {
      event.preventDefault();

      activeKind = openButton.dataset.adminManager;

      setOpen(true);

      await load(
        `/admin-panel/manage/${activeKind}/`
      );

      return;
    }

    const urlButton = target.closest("[data-admin-url]");

    if (urlButton) {
      event.preventDefault();

      await load(urlButton.dataset.adminUrl);

      return;
    }

    if (
      target.closest("[data-admin-close]")
      || target === overlay()
    ) {
      setOpen(false);
    }
  });


  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) return;


    if (form.matches("[data-admin-search]")) {
      event.preventDefault();

      const params = new URLSearchParams(
        new FormData(form)
      );

      await load(
        `/admin-panel/manage/${activeKind}/?${params.toString()}`
      );

      return;
    }


    if (form.matches("[data-admin-form]")) {
      event.preventDefault();

      showLoading(
        form,
        "Saving record",
        "Please wait while the record is saved…"
      );

      const response = await load(
        form.action || location.href,
        {
          method: "POST",
          body: new FormData(form),
        }
      );

      hideLoading();

      if (response?.ok) {
        // The manager content is already refreshed by load().
      }

      return;
    }


    if (form.matches("[data-admin-delete]")) {
      event.preventDefault();

      const name =
        form.dataset.itemName || "this record";

      const confirmed = await confirmDialog({
        title: "Delete record?",
        text: (
          `Are you sure you want to delete ${name}? `
          + "This action cannot be undone."
        ),
        ok: "Delete",
        danger: true,
        icon: "trash",
      });

      if (!confirmed) return;

      showLoading(
        form,
        "Deleting record",
        "Please wait while this record is removed…"
      );

      await load(
        form.action,
        {
          method: "POST",
          body: new FormData(form),
        }
      );

      hideLoading();
    }
  });


  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape"
      && overlay()?.classList.contains("open")
    ) {
      setOpen(false);
    }
  });
}