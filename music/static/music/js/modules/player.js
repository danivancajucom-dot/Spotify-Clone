import { $, $$, icon, hueFrom } from "./utils.js";

let audio = null;
let queue = [];
let currentIndex = -1;
let currentKey = "";
let wired = false;

const trackFromButton = (button) => ({
  src: button.dataset.src,
  title: button.dataset.title || "Unknown track",
  artist: button.dataset.artist || "",
  cover: button.dataset.cover || "",
  key: `${button.dataset.src}|${button.dataset.title || ""}`,
});

export function initPlayer() {
  const player = $("#player");
  if (!player) return;

  if (!audio) {
    audio = new Audio();
    audio.volume = 0.8;
    audio.preload = "metadata";
  }

  const fmt = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";

    return `${Math.floor(seconds / 60)}:${String(
      Math.floor(seconds % 60)
    ).padStart(2, "0")}`;
  };

  const paint = (element) => {
    const max = Number(element.max) || 1;
    const value = Number(element.value) || 0;
    element.style.setProperty("--p", `${(value / max) * 100}%`);
  };

  function showTrack(track) {
    const title = $("#np-title");
    const artist = $("#np-artist");
    const cover = $("#np-cover");

    if (title) title.textContent = track.title;
    if (artist) artist.textContent = track.artist;

    if (cover) {
      if (track.cover) {
        const img = document.createElement("img");
        img.src = track.cover;
        img.alt = "";
        cover.replaceChildren(img);
      } else {
        cover.innerHTML = icon("disc");
      }

      cover.style.setProperty("--h", hueFrom(track.title));
    }

    player.classList.add("show");
    renderQueue();
  }

  function renderQueue() {
    const list = $("#queue-list");
    if (!list) return;

    list.replaceChildren();

    if (!queue.length) {
      const empty = document.createElement("li");
      empty.textContent = "Play a track to build your queue.";
      empty.style.cursor = "default";
      list.append(empty);
      return;
    }

    queue.forEach((track, index) => {
      const item = document.createElement("li");

      if (index === currentIndex) {
        item.classList.add("active");
      }

      const number = document.createElement("span");
      number.className = "q-number";
      number.textContent =
        index === currentIndex && !audio.paused
          ? "♫"
          : String(index + 1);

      const copy = document.createElement("span");

      const title = document.createElement("span");
      title.className = "q-title";
      title.textContent = track.title;

      const artist = document.createElement("span");
      artist.className = "q-artist";
      artist.textContent = track.artist;

      copy.append(title, artist);
      item.append(number, copy);

      item.addEventListener("click", () => playIndex(index));
      list.append(item);
    });
  }

  function markPlaying() {
    const toggle = $("#p-toggle");

    if (toggle) {
      toggle.innerHTML = icon(audio.paused ? "play" : "pause");
      toggle.setAttribute(
        "aria-label",
        audio.paused ? "Play" : "Pause"
      );
      toggle.querySelector(".ic")?.classList.add("fill");
    }

    $$("tr.track").forEach((row) => {
      row.classList.remove("playing");
    });

    const track = queue[currentIndex];

    if (track && !audio.paused) {
      const row = $$(".play-btn[data-src]")
        .find((button) => trackFromButton(button).key === track.key)
        ?.closest("tr.track");

      row?.classList.add("playing");
    }

    renderQueue();
  }

  function buildQueue(buttons, startButton) {
    const tracks = buttons
      .filter((button) => button.dataset.src && !button.disabled)
      .map(trackFromButton);

    if (!tracks.length) return false;

    queue = tracks;

    currentIndex = Math.max(
      0,
      tracks.findIndex(
        (track) => track.key === trackFromButton(startButton).key
      )
    );

    return true;
  }

  async function playIndex(index) {
    if (!queue.length || index < 0 || index >= queue.length) return;

    currentIndex = index;

    const track = queue[index];
    currentKey = track.key;

    const url = new URL(track.src, document.baseURI).href;

    if (audio.src !== url) {
      audio.src = url;
      audio.currentTime = 0;
    }

    showTrack(track);

    try {
      await audio.play();
    } catch (error) {
      console.warn(
        "Playback could not start. Check that the audio file exists and press Play.",
        error
      );
    }

    markPlaying();
  }

  function startQueueFrom(button) {
    const table =
      button.closest(".table-wrap") ||
      button.closest("table")?.parentElement ||
      document;

    const buttons = $$(".play-btn[data-src]:not(:disabled)", table);

    if (!buildQueue(buttons, button)) return;

    playIndex(currentIndex);
  }

  if (!wired) {
    wired = true;

    document.addEventListener("click", (event) => {
      const playAll = event.target.closest("[data-play-all]");

      if (playAll) {
        const table =
          $(".table-wrap") ||
          $("table.tracks")?.parentElement;

        const buttons = table
          ? $$(".play-btn[data-src]:not(:disabled)", table)
          : [];

        if (buttons.length && buildQueue(buttons, buttons[0])) {
          playIndex(0);
        }

        return;
      }

      const button = event.target.closest(".play-btn[data-src]");

      if (button && !button.disabled) {
        event.preventDefault();

        const track = trackFromButton(button);

        if (track.key === currentKey) {
          if (audio.paused) {
            audio.play().catch((error) => {
              console.warn("Playback failed:", error);
            });
          } else {
            audio.pause();
          }

          return;
        }

        startQueueFrom(button);
        return;
      }

      if (event.target.closest("#p-toggle")) {
        if (!queue.length) {
          const first = $(".play-btn[data-src]:not(:disabled)");

          if (first) startQueueFrom(first);
        } else if (audio.paused) {
          audio.play().catch((error) => {
            console.warn("Playback failed:", error);
          });
        } else {
          audio.pause();
        }

        return;
      }

      if (event.target.closest("#p-next")) {
        if (queue.length) {
          playIndex((currentIndex + 1) % queue.length);
        }

        return;
      }

      if (event.target.closest("#p-prev")) {
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
        } else if (queue.length) {
          playIndex(
            (currentIndex - 1 + queue.length) % queue.length
          );
        }

        return;
      }

      if (event.target.closest("#p-queue-toggle")) {
        const panel = $("#queue-panel");

        if (panel) panel.hidden = !panel.hidden;

        renderQueue();
        return;
      }

      if (event.target.closest("#p-queue-close")) {
        const panel = $("#queue-panel");

        if (panel) panel.hidden = true;
      }
    });

    document.addEventListener("input", (event) => {
      if (
        event.target.id === "seek" &&
        Number.isFinite(audio.duration)
      ) {
        audio.currentTime = Number(event.target.value);
      }

      if (event.target.id === "vol") {
        audio.volume = Number(event.target.value);
        paint(event.target);
      }
    });

    audio.addEventListener("play", markPlaying);
    audio.addEventListener("pause", markPlaying);

    audio.addEventListener("ended", () => {
      if (currentIndex < queue.length - 1) {
        playIndex(currentIndex + 1);
      } else {
        markPlaying();
      }
    });

    audio.addEventListener("timeupdate", () => {
      const seek = $("#seek");
      if (!seek) return;

      seek.max = audio.duration || 100;
      seek.value = audio.currentTime || 0;
      paint(seek);

      const cur = $("#t-cur");
      const dur = $("#t-dur");

      if (cur) cur.textContent = fmt(audio.currentTime);
      if (dur) dur.textContent = fmt(audio.duration);
    });

    audio.addEventListener("loadedmetadata", () => {
      const seek = $("#seek");

      if (seek) seek.max = audio.duration || 100;

      const dur = $("#t-dur");
      if (dur) dur.textContent = fmt(audio.duration);
    });
  }

  const volume = $("#vol");

  if (volume) {
    volume.value = String(audio.volume);
    paint(volume);
  }

  renderQueue();
}