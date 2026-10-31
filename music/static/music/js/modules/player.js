
import { $, $$, icon, hueFrom } from "./utils.js";

let audio = null;
let queue = [];
let currentIndex = -1;
let currentKey = "";
let wired = false;
let shuffleEnabled = false;

const trackFromButton = (button) => ({
  src: button.dataset.src || "",
  title: button.dataset.title || "Unknown track",
  artist: button.dataset.artist || "",
  cover: button.dataset.cover || "",
  key: `${button.dataset.src || ""}|${button.dataset.title || ""}`,
  artistUrl: button.dataset.artistUrl || "",
  albumUrl: button.dataset.albumUrl || "",
  albumTitle: button.dataset.albumTitle || "",
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
    if (!element) return;

    const max = Number(element.max) || 1;
    const value = Number(element.value) || 0;

    element.style.setProperty(
      "--p",
      `${(value / max) * 100}%`
    );
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
        img.alt = `${track.title} cover`;
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
    const list = $("#p-queue-list");
    const empty = $("#p-queue-empty");

    if (!list) return;

    list.replaceChildren();

    if (!queue.length) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    queue.forEach((track, index) => {
      const item = document.createElement("li");
      item.className = "queue-item";

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
      copy.className = "queue-copy";

      const title = document.createElement("span");
      title.className = "q-title";
      title.textContent = track.title;

      const artist = document.createElement("span");
      artist.className = "q-artist";
      artist.textContent = track.artist;

      copy.append(title, artist);

      const actions = document.createElement("span");
      actions.className = "queue-item-actions";

      if (track.artistUrl) {
        const artistLink = document.createElement("a");
        artistLink.href = track.artistUrl;
        artistLink.title = "Go to artist";
        artistLink.textContent = "Artist";

        artistLink.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        actions.append(artistLink);
      }

      if (track.albumUrl) {
        const albumLink = document.createElement("a");
        albumLink.href = track.albumUrl;
        albumLink.title = "Go to album";
        albumLink.textContent = "Album";

        albumLink.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        actions.append(albumLink);
      }

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "queue-remove";
      remove.title = "Remove from queue";
      remove.setAttribute(
        "aria-label",
        `Remove ${track.title} from queue`
      );
      remove.textContent = "×";

      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        removeFromQueue(index);
      });

      actions.append(remove);
      item.append(number, copy, actions);

      item.addEventListener("click", () => {
        playIndex(index);
      });

      list.append(item);
    });
  }

  function removeFromQueue(index) {
    if (index < 0 || index >= queue.length) return;

    const removingCurrent = index === currentIndex;

    queue.splice(index, 1);

    if (!queue.length) {
      currentIndex = -1;
      currentKey = "";

      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      const title = $("#np-title");
      const artist = $("#np-artist");

      if (title) title.textContent = "—";
      if (artist) artist.textContent = "";

      renderQueue();
      markPlaying();
      return;
    }

    if (index < currentIndex) {
      currentIndex -= 1;
    } else if (removingCurrent) {
      currentIndex = Math.min(index, queue.length - 1);
      playIndex(currentIndex);
      return;
    }

    renderQueue();
    markPlaying();
  }

  function addToQueue(button) {
    const track = trackFromButton(button);

    if (!track.src) return;

    const existingIndex = queue.findIndex(
      (item) => item.key === track.key
    );

    if (existingIndex !== -1) {
      const panel = $("#p-queue-panel");

      if (panel) panel.hidden = false;

      renderQueue();
      return;
    }

    queue.push(track);

    const panel = $("#p-queue-panel");

    if (panel) panel.hidden = false;

    renderQueue();
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
        .find(
          (button) =>
            trackFromButton(button).key === track.key
        )
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
        (track) =>
          track.key === trackFromButton(startButton).key
      )
    );

    return true;
  }

  async function playIndex(index) {
    if (
      !queue.length ||
      index < 0 ||
      index >= queue.length
    ) {
      return;
    }

    currentIndex = index;

    const track = queue[index];
    currentKey = track.key;

    const url = new URL(
      track.src,
      document.baseURI
    ).href;

    if (audio.src !== url) {
      audio.src = url;
      audio.currentTime = 0;
    }

    showTrack(track);

    try {
      await audio.play();
    } catch (error) {
      console.warn(
        "Playback could not start. Check the audio file and try again.",
        error
      );
    }

    markPlaying();
  }

  function startQueueFrom(button) {
    const container =
      button.closest(".table-wrap") ||
      button.closest("table")?.parentElement ||
      document;

    const buttons = $$(".play-btn[data-src]:not(:disabled)", container);

    if (!buildQueue(buttons, button)) return;

    playIndex(currentIndex);
  }

  if (!wired) {
    wired = true;

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      const addQueue = target.closest(".queue-add-btn");

      if (addQueue && !addQueue.disabled) {
        event.preventDefault();
        addToQueue(addQueue);
        return;
      }

      if (target.closest("#p-shuffle")) {
        shuffleEnabled = !shuffleEnabled;

        const shuffle = $("#p-shuffle");

        shuffle?.classList.toggle("active", shuffleEnabled);
        shuffle?.setAttribute(
          "aria-pressed",
          String(shuffleEnabled)
        );

        renderQueue();
        return;
      }

      const playAll = target.closest("[data-play-all]");

      if (playAll) {
        const container =
          playAll.closest(".table-wrap") ||
          playAll.closest("table")?.parentElement ||
          document;

        const buttons = $$(".play-btn[data-src]:not(:disabled)", container);

        if (buttons.length && buildQueue(buttons, buttons[0])) {
          playIndex(0);
        }

        return;
      }

      const button = target.closest(".play-btn[data-src]");

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

      if (target.closest("#p-toggle")) {
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

      if (target.closest("#p-next")) {
        if (queue.length) {
          if (shuffleEnabled && queue.length > 1) {
            let nextIndex = currentIndex;

            while (nextIndex === currentIndex) {
              nextIndex = Math.floor(
                Math.random() * queue.length
              );
            }

            playIndex(nextIndex);
          } else if (currentIndex < queue.length - 1) {
            playIndex(currentIndex + 1);
          } else {
            audio.pause();
            audio.currentTime = 0;
            markPlaying();
          }
        }

        return;
      }

      if (target.closest("#p-prev")) {
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
        } else if (queue.length) {
          if (currentIndex > 0) {
            playIndex(currentIndex - 1);
          } else {
            playIndex(0);
          }
        }

        return;
      }

      if (target.closest("#p-queue-toggle")) {
        const panel = $("#p-queue-panel");
        const toggle = $("#p-queue-toggle");

        if (panel) {
          panel.hidden = !panel.hidden;

          toggle?.setAttribute(
            "aria-expanded",
            String(!panel.hidden)
          );
        }

        renderQueue();
        return;
      }

      if (target.closest("#p-queue-close")) {
        const panel = $("#p-queue-panel");

        if (panel) panel.hidden = true;

        $("#p-queue-toggle")?.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    });

    document.addEventListener("input", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLInputElement)) return;

      if (
        target.id === "seek" &&
        Number.isFinite(audio.duration)
      ) {
        audio.currentTime = Number(target.value);
      }

      if (target.id === "vol") {
        audio.volume = Number(target.value);
        paint(target);
      }
    });

    audio.addEventListener("play", markPlaying);
    audio.addEventListener("pause", markPlaying);

    audio.addEventListener("ended", () => {
      if (shuffleEnabled && queue.length > 1) {
        let nextIndex = currentIndex;

        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(
            Math.random() * queue.length
          );
        }

        playIndex(nextIndex);
      } else if (currentIndex < queue.length - 1) {
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

      const current = $("#t-cur");
      const duration = $("#t-dur");

      if (current) {
        current.textContent = fmt(audio.currentTime);
      }

      if (duration) {
        duration.textContent = fmt(audio.duration);
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      const seek = $("#seek");

      if (seek) {
        seek.max = audio.duration || 100;
        paint(seek);
      }

      const duration = $("#t-dur");

      if (duration) {
        duration.textContent = fmt(audio.duration);
      }
    });
  }

  const volume = $("#vol");

  if (volume) {
    volume.value = String(audio.volume);
    paint(volume);
  }

  renderQueue();
  markPlaying();
}
