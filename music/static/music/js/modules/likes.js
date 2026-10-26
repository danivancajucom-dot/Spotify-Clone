// spotify_clone/music/static/music/js/modules/likes.js
import { $, $$, icon } from "./utils.js";
import { toast } from "./toast.js";

// Heart / favourite button.
// The confirm dialog (dialog.js) fires a cancelable "confirmed" event on the form; we take over
// here and send the request with fetch() so the page never reloads and the music keeps playing.

function setFormState(form, liked) {
  const title = form.dataset.trackTitle || "This track";
  $(".heart", form)?.classList.toggle("on", liked);

  // The dialog text always describes the NEXT click, so flip it to match the new state.
  form.dataset.confirm = liked ? "Remove from Liked Songs?" : "Add to Liked Songs?";
  form.dataset.confirmText = liked
    ? `“${title}” will be removed from your Liked Songs.`
    : `“${title}” will be saved to your Liked Songs.`;
  form.dataset.confirmOk = liked ? "Unlike" : "Like";
  form.dataset.toast = liked ? "Removed from Liked Songs" : "Added to Liked Songs";
  if (liked) form.dataset.danger = "1";
  else delete form.dataset.danger;
}

function refreshLikedPage() {
  const list = $("[data-liked-page]");
  if (!list) return;
  const rows = $$("tr.track", list);
  rows.forEach((row, i) => { const n = $(".num", row); if (n) n.textContent = String(i + 1); });
  const count = $("#liked-count");
  if (count) count.textContent = `${rows.length} song${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) {
    list.innerHTML = `<div class="empty">${icon("heart")}<p>Tap the heart next to a track to save it here.</p></div>`;
  }
}

function applyLike(trackId, liked) {
  $$(`form.like-form[data-track-id="${trackId}"]`).forEach((form) => {
    setFormState(form, liked);

    const heart = $(".heart", form);
    if (heart) {
      heart.classList.add("pop");
      setTimeout(() => heart.classList.remove("pop"), 500);
    }

    // On the Liked Songs page an unliked track leaves the list.
    const row = form.closest("tr.track");
    if (!liked && row && row.closest("[data-liked-page]")) {
      row.classList.add("leaving");
      setTimeout(() => { row.remove(); refreshLikedPage(); }, 320);
    }
  });
}

async function submitLike(form) {
  const heart = $(".heart", form);
  if (heart) heart.disabled = true;
  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    });
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    if (!res.ok || !isJson) {
      if (res.redirected && res.url.includes("/login")) { location.href = res.url; return; } // session expired
      throw new Error(`Unexpected response (${res.status})`);
    }
    const data = await res.json();
    applyLike(String(data.track_id), !!data.liked);
    toast(data.liked ? "Added to Liked Songs" : "Removed from Liked Songs");
  } catch (err) {
    console.warn("Could not update Liked Songs:", err);
    toast("Couldn't update Liked Songs. Please try again.", "error");
  } finally {
    if (heart) heart.disabled = false;
  }
}

export function initLikes() {
  document.addEventListener("confirmed", (e) => {
    const form = e.target.closest?.("form.like-form");
    if (!form) return;
    e.preventDefault(); // we send it ourselves, no page reload
    submitLike(form);
  });
}