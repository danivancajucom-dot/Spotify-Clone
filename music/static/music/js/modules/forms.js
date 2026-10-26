import { $, $$, icon } from "./utils.js";

// Clear the red error state as soon as the person starts typing again
function clearErrorsOnInput() {
  $$(".field.has-error input, .field.has-error textarea").forEach((i) =>
    i.addEventListener("input", () => i.closest(".field").classList.remove("has-error"), { once: true }));
}

// Password checklist (only on the register page after a failed sign up)
function passwordRules() {
  const rules = $("#pw-rules");
  if (!rules) return;
  const p1 = $("#id_password1"), p2 = $("#id_password2");
  const li = (k) => $(`[data-rule="${k}"]`, rules);
  const set = (k, ok) => { const e = li(k); e.classList.toggle("ok", ok === true); e.classList.toggle("bad", ok === false); };
  const errs = $$(".field-error").map((e) => e.textContent.toLowerCase()).join(" ");
  set("len", !/too short|at least/.test(errs));
  set("num", !/entirely numeric/.test(errs));
  set("common", !/too common/.test(errs));
  set("similar", !/too similar/.test(errs));
  set("match", !/match/.test(errs));
  p1.addEventListener("input", () => {
    const v = p1.value;
    set("len", v.length >= 8);
    set("num", v.length ? !/^\d+$/.test(v) : false);
    set("match", v.length ? v === p2.value : false);
    set("common", null); set("similar", null);
  });
  p2.addEventListener("input", () => set("match", p1.value.length ? p1.value === p2.value : false));
}

// Eye button on every password input
function passwordToggle() {
  $$("input[type=password]").forEach((inp) => {
    const wrap = document.createElement("div");
    wrap.className = "pw-wrap";
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    const b = document.createElement("button");
    b.type = "button"; b.className = "pw-toggle"; b.setAttribute("aria-label", "Show password");
    b.innerHTML = icon("eye");
    b.addEventListener("click", () => {
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.innerHTML = icon(show ? "eye-off" : "eye");
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
    wrap.appendChild(b);
  });
}

export function initForms() {
  passwordToggle();
  clearErrorsOnInput();
  passwordRules();
}
