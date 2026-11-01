// spotify_clone/music/static/music/js/modules/forms.js
import { $, $$, icon } from "./utils.js";
import { initValidation } from "./validation.js";


// Clear the red error state as soon as the person starts typing again.
function clearErrorsOnInput() {
  $$(".field.has-error input, .field.has-error textarea, .field.has-error select")
    .forEach((input) => {
      if (input.dataset.errorClearInit) return;

      input.dataset.errorClearInit = "1";

      input.addEventListener(
        "input",
        () => {
          input.closest(".field")?.classList.remove("has-error");
        },
        { once: true }
      );

      input.addEventListener(
        "change",
        () => {
          input.closest(".field")?.classList.remove("has-error");
        },
        { once: true }
      );
    });
}


// Password checklist (only on the register page after a failed sign up).
function passwordRules() {
  const rules = $("#pw-rules");

  if (
    !rules
    || rules.dataset.initialized === "1"
  ) {
    return;
  }

  rules.dataset.initialized = "1";

  const p1 = $("#id_password1");
  const p2 = $("#id_password2");

  if (!p1 || !p2) return;

  const li = (key) => (
    $(`[data-rule="${key}"]`, rules)
  );

  const set = (key, ok) => {
    const element = li(key);

    element.classList.toggle("ok", ok === true);
    element.classList.toggle("bad", ok === false);
  };

  const errors = $$(".field-error")
    .map((element) => element.textContent.toLowerCase())
    .join(" ");

  set("len", !/too short|at least/.test(errors));
  set("num", !/entirely numeric|only numbers/.test(errors));
  set("common", !/too common/.test(errors));
  set("similar", !/too similar/.test(errors));
  set("match", !/match/.test(errors));


  p1.addEventListener("input", () => {
    const value = p1.value;

    set("len", value.length >= 8);

    set(
      "num",
      value.length
        ? !/^\d+$/.test(value)
        : false
    );

    set(
      "match",
      value.length
        ? value === p2.value
        : false
    );

    set("common", null);
    set("similar", null);
  });


  p2.addEventListener("input", () => {
    set(
      "match",
      p1.value.length
        ? p1.value === p2.value
        : false
    );
  });
}


// Eye button on every password input.
function passwordToggle() {
  $$("input[type=password]").forEach((input) => {
    if (input.dataset.passwordToggleInit === "1") {
      return;
    }

    input.dataset.passwordToggleInit = "1";

    const wrap = document.createElement("div");

    wrap.className = "pw-wrap";

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const button = document.createElement("button");

    button.type = "button";
    button.className = "pw-toggle";
    button.setAttribute(
      "aria-label",
      "Show password"
    );

    button.innerHTML = icon("eye");

    button.addEventListener("click", () => {
      const show = input.type === "password";

      input.type = show
        ? "text"
        : "password";

      button.innerHTML = icon(
        show ? "eye-off" : "eye"
      );

      button.setAttribute(
        "aria-label",
        show
          ? "Hide password"
          : "Show password"
      );
    });

    wrap.appendChild(button);
  });
}


export function initForms() {
  // Checks blank / invalid fields before anything is sent, and shows the red error + toast.
  initValidation();

  passwordToggle();
  clearErrorsOnInput();
  passwordRules();
}


// A form that comes back with errors is rendered by Turbo without a "turbo:load" event,
// so set the new page's fields up again on every render.
document.addEventListener("turbo:render", () => initForms());
document.addEventListener("turbo:load", () => initForms());