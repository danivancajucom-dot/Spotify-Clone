import { $, $$ } from "./utils.js";

// Login / Sign up dialog on the landing page (components/auth_modal.html).
// Any element with data-auth-open="login" | "register" opens it. Without JS they are normal links.
export function initAuthModal() {
  const modal = $("#auth-modal");
  if (!modal) return;
  const titles = { login: "Welcome back", register: "Create your account" };

  function showTab(name) {
    $$("[role=tab]", modal).forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    $("#panel-login").hidden = name !== "login";
    $("#panel-register").hidden = name !== "register";
    $("#auth-title").textContent = titles[name];
  }
  const firstInput = (name) => $(`#panel-${name} input:not([type=hidden])`, modal);

  function open(name) {
    showTab(name);
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => firstInput(name)?.focus(), 120);
  }
  function close() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  $$("[data-auth-open]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); open(a.dataset.authOpen); }));
  $$("[data-tab]", modal).forEach((b) => b.addEventListener("click", () => { showTab(b.dataset.tab); firstInput(b.dataset.tab)?.focus(); }));
  $("#auth-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) close(); });

  // /?auth=login, /#register ... open straight away
  const want = (modal.dataset.open || location.hash.slice(1)).toLowerCase();
  if (want === "login" || want === "register") open(want);
}
