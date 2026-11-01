// spotify_clone/music/static/music/js/modules/validation.js
import { $, $$, icon } from "./utils.js";
import { toast } from "./toast.js";

// Friendly client-side checks for every form marked `novalidate`.
// The server still validates everything; this just tells people what is wrong
// right away, in plain words, next to the field.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MB = 1024 * 1024;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;

const skip = (el) =>
  el.disabled || ["hidden", "submit", "button", "reset", "image"].includes(el.type);

function labelOf(input) {
  const form = input.form || document;
  const label = input.id ? form.querySelector(`label[for="${input.id}"]`) : null;
  const text = (label?.textContent || input.getAttribute("aria-label") || "").replace("*", "").trim();
  return text || "This field";
}

const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1);

function niceDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function fileProblem(input, file) {
  const wantsAudio = (input.accept || "").startsWith("audio");
  const okType = wantsAudio
    ? file.type.startsWith("audio/") || AUDIO_EXT.test(file.name)
    : (file.type.startsWith("image/") && IMAGE_EXT.test(file.name)) || (!file.type && IMAGE_EXT.test(file.name));
  if (!okType) {
    return wantsAudio
      ? "That isn't a supported audio file. Use MP3, WAV, OGG, M4A, AAC or FLAC."
      : "That isn't a supported image. Use a JPG, PNG, WebP or GIF.";
  }
  const limit = (wantsAudio ? 50 : 5) * MB;
  if (file.size > limit) {
    return `That file is too large. The limit is ${wantsAudio ? 50 : 5} MB.`;
  }
  return "";
}

// Returns the message to show for one control, or "" when it is fine.
export function messageFor(input) {
  const label = labelOf(input);
  const value = input.type === "file" ? "" : (input.value || "").trim();

  if (input.type === "file") {
    const file = input.files && input.files[0];
    if (!file) return input.required ? "Please choose a file to upload." : "";
    return fileProblem(input, file);
  }

  if (input.type === "checkbox") {
    return input.required && !input.checked ? `Please tick “${label}” to continue.` : "";
  }

  if (input.type === "radio") {
    const group = $$(`input[type=radio][name="${input.name}"]`, input.form || document);
    return input.required && !group.some((r) => r.checked) ? "Please choose one option." : "";
  }

  if (input.required && !value) {
    if (input.tagName === "SELECT") return `Please choose ${lower(label)}.`;
    if (input.type === "date") return `Please pick ${lower(label)}.`;
    if (input.type === "email") return "Please enter your email address.";
    if (input.type === "password") {
      if (/password2$/.test(input.id)) return "Please confirm your password.";
      if (/password1$/.test(input.id)) return "Please create a password.";
      return "Please enter your password.";
    }
    return `${label} is required.`;
  }
  if (!value) return "";

  if (input.type === "email" && !EMAIL.test(value)) {
    return "Enter a valid email address, like name@example.com.";
  }

  const minLength = Number(input.getAttribute("minlength"));
  if (minLength && value.length < minLength) {
    return `${label} must be at least ${minLength} characters.`;
  }
  const maxLength = Number(input.getAttribute("maxlength"));
  if (maxLength && value.length > maxLength) {
    return `${label} can be at most ${maxLength} characters.`;
  }

  if (input.pattern && !new RegExp(`^(?:${input.pattern})$`).test(value)) {
    return input.title || `${label} isn't in the right format.`;
  }

  if (input.type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) return `${label} must be a number.`;
    if (input.step !== "any" && !Number.isInteger(n)) return `${label} must be a whole number.`;
    if (input.min !== "" && n < Number(input.min)) return `${label} must be ${input.min} or higher.`;
    if (input.max !== "" && n > Number(input.max)) return `${label} can't be higher than ${input.max}.`;
  }

  if (input.type === "date") {
    if (input.min && value < input.min) return `${label} can't be before ${niceDate(input.min)}.`;
    if (input.max && value > input.max) return `${label} can't be after ${niceDate(input.max)}.`;
  }

  // Sign up form: password rules and the confirmation field
  if (/password1$/.test(input.id) || input.id === "reg_password1") {
    if (value.length < 8) return "Your password needs at least 8 characters.";
    if (/^\d+$/.test(value)) return "Your password can't be only numbers.";
  }
  if (/password2$/.test(input.id)) {
    const first = $(`input[id$="password1"]`, input.form || document);
    if (first && first.value !== input.value) return "The two passwords don't match.";
  }

  return "";
}

function anchorOf(input) {
  return input.closest(".dz, .dp, .pw-wrap") || input;
}

function setError(input, message) {
  const field = input.closest(".field");
  if (!field) return;

  $$(".field-error", field).forEach((e) => e.remove());
  field.classList.toggle("has-error", !!message);

  if (message) {
    const box = document.createElement("div");
    box.className = "field-error";
    box.setAttribute("role", "alert");
    box.innerHTML = `${icon("x")}<span></span>`;
    box.lastChild.textContent = message;
    field.appendChild(box);
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

function validateInput(input) {
  const message = messageFor(input);
  setError(input, message);
  return message;
}

function formAlert(form, show) {
  let alert = $(".js-form-alert", form);
  if (!show) return alert?.remove();
  if (!alert) {
    alert = document.createElement("div");
    alert.className = "form-alert js-form-alert";
    alert.setAttribute("role", "alert");
    alert.innerHTML = `${icon("x")}<div>Please fix the highlighted fields and try again.</div>`;
    form.prepend(alert);
  }
}

function controls(form) {
  const seen = new Set();
  return $$("input, select, textarea", form).filter((el) => {
    if (skip(el) || !el.closest(".field")) return false;
    if (el.type === "radio") {
      if (seen.has(el.name)) return false;
      seen.add(el.name);
    }
    return true;
  });
}

const isChecked = (form) => form.matches("form[novalidate]:not([data-no-validate])");

let started = false;

export function initValidation() {
  if (started) return;
  started = true;

  // Capture phase: runs before the confirm dialog and Turbo get to see the submit.
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !isChecked(form)) return;
    if (event.submitter && event.submitter.hasAttribute("formnovalidate")) return;

    const problems = controls(form).filter((el) => validateInput(el));

    if (problems.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      formAlert(form, true);

      const first_message = $(".field-error span", problems[0].closest(".field"))?.textContent
        || "Please fix the highlighted fields.";
      toast(
        problems.length > 1
          ? `${first_message} (+${problems.length - 1} more to fix)`
          : first_message,
        "error"
      );

      const first = problems[0];
      const target = first.type === "file" ? first.closest(".field") : first;
      target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      if (first.type !== "file") first.focus({ preventScroll: true });
    } else {
      formAlert(form, false);
    }
  }, true);

  // Check a field when the person leaves it (only if they typed something)
  document.addEventListener("focusout", (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement) || !el.form || !isChecked(el.form) || skip(el)) return;
    if (el.type === "file" || el.type === "radio") return;
    if ((el.value || "").trim() || el.closest(".field")?.classList.contains("has-error")) validateInput(el);
  });

  // While fixing a field, re-check it live so the red state clears as soon as it is right
  const live = (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement) || !el.form || !isChecked(el.form) || skip(el)) return;
    const field = el.closest(".field");
    if (field?.classList.contains("has-error") || el.type === "file" || el.type === "date") {
      const message = validateInput(el);
      if (!message && !$$(".field.has-error", el.form).length) formAlert(el.form, false);
    }
  };
  document.addEventListener("input", live);
  document.addEventListener("change", live);
}