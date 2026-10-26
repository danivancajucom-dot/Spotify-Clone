import { $, $$, icon } from "./utils.js";

// Drag & drop file upload. Wraps every <div class="dz"> that contains a file input.
const size = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");

export function initDropzones() {
  // dropping a file outside a dropzone shouldn't make the browser open it
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => { if (!e.target.closest(".dz")) e.preventDefault(); });

  $$(".dz").forEach((dz) => {
    const input = $("input[type=file]", dz);
    const audioMode = (input.accept || "").startsWith("audio");
    const noun = audioMode ? "audio file" : "image";
    const current = dz.dataset.current, currentName = (dz.dataset.currentName || "").split("/").pop();
    const ui = document.createElement("div");
    ui.innerHTML = `
      <div class="dz-empty">
        <div class="dz-icon">${icon("upload")}</div>
        <strong>Drag &amp; drop your ${noun} here</strong>
        <span>or <b class="dz-browse">browse files</b></span>
      </div>
      <div class="dz-chosen" hidden>
        <div class="dz-thumb"></div>
        <div class="dz-meta"><strong class="dz-name"></strong><span class="dz-size"></span><span class="dz-tag"></span></div>
        <button type="button" class="icon-btn danger dz-remove" title="Remove" aria-label="Remove file">${icon("x")}</button>
      </div>
      <p class="dz-error" hidden></p>`;
    dz.appendChild(ui);
    const empty = $(".dz-empty", ui), chosen = $(".dz-chosen", ui), thumb = $(".dz-thumb", ui), err = $(".dz-error", ui);
    let objUrl = null;

    function render(file) {
      if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = null; }
      $$("audio", chosen).forEach((a) => a.remove());
      const url = file ? (objUrl = URL.createObjectURL(file)) : current;
      if (!url) { chosen.hidden = true; empty.hidden = false; return; }
      empty.hidden = true; chosen.hidden = false;
      thumb.innerHTML = audioMode ? icon("note") : `<img src="${url}" alt="">`;
      $(".dz-name", ui).textContent = file ? file.name : currentName || "Current file";
      $(".dz-size", ui).textContent = file ? size(file.size) : "";
      const tag = $(".dz-tag", ui);
      tag.textContent = file ? "New" : "Current";
      tag.classList.toggle("cur", !file);
      $(".dz-remove", ui).hidden = !file;
      if (audioMode) { const a = document.createElement("audio"); a.controls = true; a.src = url; chosen.appendChild(a); }
    }
    function accept(file) {
      const ok = file.type.startsWith(audioMode ? "audio/" : "image/");
      err.hidden = ok;
      dz.classList.toggle("invalid", !ok);
      if (!ok) { err.textContent = `That isn't ${audioMode ? "an audio file" : "an image"}. Please choose a valid ${noun}.`; setTimeout(() => dz.classList.remove("invalid"), 500); }
      return ok;
    }
    function take(file) {
      if (!file || !accept(file)) return;
      const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
      render(file);
    }
    ["dragenter", "dragover"].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((t) => dz.addEventListener(t, () => dz.classList.remove("drag")));
    dz.addEventListener("drop", (e) => { e.preventDefault(); take(e.dataTransfer.files[0]); });
    input.addEventListener("change", () => { const f = input.files[0]; if (f && accept(f)) render(f); else if (!f) render(null); else input.value = ""; });
    $(".dz-remove", ui).addEventListener("click", () => { input.value = ""; err.hidden = true; render(null); });
    render(null);
  });
}
