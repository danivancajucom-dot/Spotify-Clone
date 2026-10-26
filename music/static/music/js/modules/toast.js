import { $, $$, icon } from "./utils.js";

const box = $("#toasts");

export function toast(text, kind) {
  if (!box) return;
  const t = document.createElement("div");
  t.className = "toast " + (kind === "error" ? "error" : "");
  t.innerHTML = icon(kind === "error" ? "x" : "check") + "<span></span>";
  t.lastChild.textContent = text;
  box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 350); }, 4000);
}

// Django messages are rendered in #dj-msgs (see layouts/base.html) -> show them as toasts
export function initToasts() {
  $$("#dj-msgs span").forEach((s) => toast(s.textContent, s.dataset.tag));

  const pending = sessionStorage.getItem("toast");
  if (pending) {
    sessionStorage.removeItem("toast");
    // Django already shows its own message after most actions, so don't show two toasts
    if (!$$("#dj-msgs span").length) setTimeout(() => toast(pending), 150);
  }
}
