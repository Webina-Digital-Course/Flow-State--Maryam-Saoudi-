const $ = (selector) => document.querySelector(selector);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;


const timerDisplay = $("#timerDisplay");
const timerRing = $("#timerRing");
const timerMode = $("#timerMode");
const timerCaption = $("#timerCaption");
const timerNote = $("#timerNote");
const timerStateLabel = $("#timerStateLabel");
const focusPanel = $("#focus");
const startPauseBtn = $("#startPauseBtn");
const resetBtn = $("#resetBtn");
const focusModeBtn = $("#focusModeBtn");
const breakModeBtn = $("#breakModeBtn");
const focusDuration = $("#focusDuration");
const durationControl = $("#durationControl");


const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const taskList = $("#taskList");
const emptyTasks = $("#emptyTasks");
const taskCounter = $("#taskCounter");
const remainingTasks = $("#remainingTasks");
const clearCompletedBtn = $("#clearCompletedBtn");


const sessionsCount = $("#sessionsCount");
const completedCount = $("#completedCount");
const completionPercent = $("#completionPercent");
const completionLabel = $("#completionLabel");
const completionNote = $("#completionNote");
const progressFill = $("#progressFill");
const progressTrack = $("#progressTrack");
const progressNote = $("#progressNote");


const musicForm = $("#musicForm");
const youtubeInput = $("#youtubeInput");
const musicStatus = $("#musicStatus");
const videoContainer = $("#videoContainer");
const youtubePlayer = $("#youtubePlayer");
const clearVideoBtn = $("#clearVideoBtn");
const musicPlaceholder = $("#musicPlaceholder");


const themeBtn = $("#themeBtn");
const themeColorMeta = $("#themeColorMeta");
const toast = $("#toast");
const menuToggle = $("#menuToggle");
const siteNav = $("#siteNav");
const scrollProgress = $("#scrollProgress");
const localTime = $("#localTime");


const STORAGE_KEY = "flow-state-data";
const THEME_KEY = "flow-state-theme";

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved || typeof saved !== "object") {
      return { tasks: [], sessions: 0 };
    }

    const tasks = Array.isArray(saved.tasks)
      ? saved.tasks
          .filter((task) =>
            task &&
            typeof task.text === "string" &&
            typeof task.done === "boolean" &&
            typeof task.id === "string"
          )
          .map((task) => ({
            id: task.id,
            text: task.text.slice(0, 120),
            done: task.done
          }))
      : [];

    const sessions =
      Number.isSafeInteger(saved.sessions) && saved.sessions >= 0
        ? saved.sessions
        : 0;

    return { tasks, sessions };
  } catch {
    return { tasks: [], sessions: 0 };
  }
}

const data = loadData();

let tasks = data.tasks;
let sessions = data.sessions;

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tasks, sessions })
    );
    return true;
  } catch {
    showToast("Could not save data in this browser.");
    return false;
  }
}

let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("theme-dark", isDark);
  document.documentElement.classList.remove("preload-dark");
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";

  themeBtn.setAttribute("aria-pressed", String(isDark));
  themeBtn.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme"
  );

  themeColorMeta.setAttribute("content", isDark ? "#111111" : "#F7F5EF");
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem(THEME_KEY) || "light";
} catch {
 
}

applyTheme(savedTheme);

themeBtn.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("theme-dark")
    ? "light"
    : "dark";

  applyTheme(nextTheme);

  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    showToast("Theme changed for this visit.");
  }
});


const BREAK_MINUTES = 5;

let mode = "focus";
let totalSeconds = Number(focusDuration.value) * 60;
let remainingSeconds = totalSeconds;
let intervalId = null;
let deadline = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secondsLeft).padStart(2, "0")
  );
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);

  const progress = totalSeconds > 0
    ? (remainingSeconds / totalSeconds) * 100
    : 0;

  timerRing.style.setProperty(
    "--timer-progress",
    `${progress}%`
  );

  timerRing.setAttribute(
    "aria-label",
    `${formatTime(remainingSeconds)} remaining`
  );
}

function renderTimerMode() {
  const isFocus = mode === "focus";

  focusModeBtn.classList.toggle("active", isFocus);
  breakModeBtn.classList.toggle("active", !isFocus);

  focusModeBtn.setAttribute("aria-pressed", String(isFocus));
  breakModeBtn.setAttribute("aria-pressed", String(!isFocus));

  focusPanel.classList.toggle("is-break", !isFocus);
  timerRing.classList.toggle("is-break", !isFocus);
  timerRing.classList.toggle("is-running", intervalId !== null);

  timerMode.textContent = isFocus ? "FOCUS SESSION" : "BREAK TIME";
  durationControl.hidden = !isFocus;

  timerCaption.textContent = isFocus
    ? "One thing at a time"
    : "Take a little breath";

  startPauseBtn.textContent = intervalId
    ? "Pause"
    : remainingSeconds === 0
      ? "Start again"
      : "Start " + (isFocus ? "focus" : "break");

  if (intervalId !== null) {
    timerStateLabel.textContent = isFocus ? "In flow" : "On break";
  } else if (remainingSeconds === 0) {
    timerStateLabel.textContent = "Complete";
  } else if (remainingSeconds < totalSeconds) {
    timerStateLabel.textContent = "Paused";
  } else {
    timerStateLabel.textContent = "Ready";
  }

  updateTimerDisplay();
}

function stopTimer() {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }

  intervalId = null;
  deadline = null;
}

function resetTimer() {
  stopTimer();

  totalSeconds = mode === "focus"
    ? Number(focusDuration.value) * 60
    : BREAK_MINUTES * 60;

  remainingSeconds = totalSeconds;

  renderTimerMode();

  timerNote.textContent = "Choose a task and get comfortable.";
}

function switchMode(nextMode) {
  stopTimer();

  mode = nextMode;
  totalSeconds = mode === "focus"
    ? Number(focusDuration.value) * 60
    : BREAK_MINUTES * 60;

  remainingSeconds = totalSeconds;

  renderTimerMode();

  timerNote.textContent = mode === "focus"
    ? "Ready to focus? Start when you are."
    : "A short break can help you reset.";
}

function completeTimer() {
  stopTimer();
  remainingSeconds = 0;
  updateTimerDisplay();

  if (mode === "focus") {
    sessions += 1;
    saveData();
    renderProgress();

    timerNote.textContent = "Focus session complete. Time for a break!";
    showToast("Focus session completed!");
  } else {
    timerNote.textContent = "Break complete. Ready to focus again?";
    showToast("Break finished. Welcome back!");
  }

  renderTimerMode();
  startPauseBtn.textContent = "Start again";
}

function tick() {
  if (deadline === null) return;

  // Using a deadline avoids accumulating small interval delays.
  const millisecondsLeft = Math.max(0, deadline - Date.now());

  remainingSeconds = Math.ceil(millisecondsLeft / 1000);

  updateTimerDisplay();

  if (millisecondsLeft <= 0) {
    completeTimer();
  }
}

function startTimer() {
  if (intervalId !== null) {
    stopTimer();
    renderTimerMode();
    timerNote.textContent = "Timer paused. Resume whenever you're ready.";
    return;
  }

  if (remainingSeconds <= 0) {
    totalSeconds = mode === "focus"
      ? Number(focusDuration.value) * 60
      : BREAK_MINUTES * 60;

    remainingSeconds = totalSeconds;
  }

  deadline = Date.now() + remainingSeconds * 1000;
  timerNote.textContent = mode === "focus"
    ? "You're in your focus session. Keep going."
    : "Enjoy your break.";

  intervalId = setInterval(tick, 250);
  renderTimerMode();
}

startPauseBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimer);

focusModeBtn.addEventListener("click", () => {
  if (mode !== "focus") {
    switchMode("focus");
  }
});

breakModeBtn.addEventListener("click", () => {
  if (mode !== "break") {
    switchMode("break");
  }
});

focusDuration.addEventListener("change", () => {
  if (mode === "focus") {
    resetTimer();
  }
});

renderTimerMode();

// -------------------------
// TASKS
// -------------------------

function makeTaskId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateTaskMeta() {
  const completed = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - completed;

  taskCounter.textContent =
    `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  remainingTasks.textContent =
    `${remaining} remaining`;

  emptyTasks.hidden = tasks.length > 0;
  taskList.hidden = tasks.length === 0;
  clearCompletedBtn.disabled = completed === 0;
}

function renderTasks() {
  taskList.replaceChildren();

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    if (task.done) {
      item.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Complete ${task.text}`);

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      item.classList.toggle("completed", task.done);
      saveData();
      updateTaskMeta();
      renderProgress();
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-task";
    deleteBtn.type = "button";
    deleteBtn.textContent = "×";
    deleteBtn.setAttribute("aria-label", `Delete ${task.text}`);

    deleteBtn.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveData();
      renderTasks();
      renderProgress();
      showToast("Task removed.");
    });

    item.append(checkbox, text, deleteBtn);
    taskList.append(item);
  });

  updateTaskMeta();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) return;

  tasks.push({
    id: makeTaskId(),
    text: text.slice(0, 120),
    done: false
  });

  saveData();
  renderTasks();
  renderProgress();

  taskInput.value = "";
  taskInput.focus();

  showToast("Task added. One step at a time.");
});

clearCompletedBtn.addEventListener("click", () => {
  const oldLength = tasks.length;
  tasks = tasks.filter((task) => !task.done);

  if (tasks.length !== oldLength) {
    saveData();
    renderTasks();
    renderProgress();
    showToast("Completed tasks cleared.");
  }
});


function renderProgress() {
  const completed = tasks.filter((task) => task.done).length;

  const percentage = tasks.length > 0
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  sessionsCount.textContent = sessions;
  completedCount.textContent = completed;
  completionPercent.textContent = `${percentage}%`;
  completionLabel.textContent = `${percentage}%`;
  completionNote.textContent = tasks.length > 0
    ? `${completed} of ${tasks.length} complete`
    : "No tasks yet";
  progressFill.style.width = `${percentage}%`;

  progressTrack.setAttribute("aria-valuenow", percentage);

  if (tasks.length === 0) {
    progressNote.textContent = "Add a task to start tracking your progress.";
  } else if (percentage === 100) {
    progressNote.textContent = "Everything on your list is complete. Well done!";
  } else {
    progressNote.textContent =
      `${completed} of ${tasks.length} tasks completed. Keep going.`;
  }
}

renderTasks();
renderProgress();


function getYouTubeVideoId(input) {
  let value = input.trim();

  if (!value) {
    return null;
  }

  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    value = value.startsWith("//") ? `https:${value}` : `https://${value}`;
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  const validHosts = [
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "youtube-nocookie.com"
  ];

  if (!validHosts.includes(host)) {
    return null;
  }

  let videoId = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0];
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else {
    const parts = url.pathname.split("/").filter(Boolean);

    if (
      parts.length >= 2 &&
      ["embed", "shorts", "live", "v"].includes(parts[0])
    ) {
      videoId = parts[1];
    }
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return null;
  }

  return videoId;
}

musicForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const input = youtubeInput.value.trim();
  const videoId = getYouTubeVideoId(input);

  if (!videoId) {
    musicStatus.textContent =
      "Please enter a valid YouTube video link.";
    musicStatus.classList.add("error");
    showToast("That link doesn't look like a supported YouTube URL.");
    return;
  }

  musicStatus.classList.remove("error");
  musicStatus.textContent =
    "Video loaded. Press play in the player to start listening.";

  youtubePlayer.src =
    `https://www.youtube-nocookie.com/embed/${videoId}`;

  videoContainer.hidden = false;
  musicPlaceholder.hidden = true;
  clearVideoBtn.hidden = false;

  showToast("Your video is ready.");
});

function clearVideo() {
  youtubePlayer.src = "about:blank";
  videoContainer.hidden = true;
  musicPlaceholder.hidden = false;
  clearVideoBtn.hidden = true;

  musicStatus.classList.remove("error");
  musicStatus.textContent =
    "Your next focus soundtrack starts here.";

  youtubeInput.value = "";
  youtubeInput.focus();
}

clearVideoBtn.addEventListener("click", clearVideo);


function setMenu(open) {
  document.body.classList.toggle("nav-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

menuToggle.addEventListener("click", () => {
  setMenu(!document.body.classList.contains("nav-open"));
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
    setMenu(false);
    menuToggle.focus();
  }
});

const mobileQuery = window.matchMedia("(max-width: 900px)");

if (typeof mobileQuery.addEventListener === "function") {
  mobileQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      setMenu(false);
    }
  });
}

// -------------------------
// SCROLL PROGRESS & ACTIVE NAVIGATION
// -------------------------

const navLinks = Array.from(
  document.querySelectorAll(".site-nav a[href^='#']")
).filter((link) => link.getAttribute("href") !== "#top");

let scrollTicking = false;

function updateScrollUI() {
  const documentElement = document.documentElement;
  const scrollable = documentElement.scrollHeight - documentElement.clientHeight;
  const ratio = scrollable > 0
    ? documentElement.scrollTop / scrollable
    : 0;

  scrollProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;

  const probe = window.scrollY + window.innerHeight * 0.35;
  const viewportCenter = window.innerWidth / 2;
  let currentLink = null;
  let closestHorizontalDistance = Infinity;

  navLinks.forEach((link) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) return;

    const rect = target.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const bottom = top + target.offsetHeight;

    if (probe >= top && probe < bottom) {
      const targetCenter = (rect.left + rect.right) / 2;
      const distance = Math.abs(targetCenter - viewportCenter);

      if (distance < closestHorizontalDistance) {
        closestHorizontalDistance = distance;
        currentLink = link;
      }
    }
  });

  navLinks.forEach((link) => {
    const isActive = link === currentLink;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  scrollTicking = false;
}

function requestScrollUpdate() {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(updateScrollUI);
  }
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);
updateScrollUI();


const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit"
});

function updateLocalTime() {
  if (!localTime) return;

  const now = new Date();
  localTime.textContent = timeFormatter.format(now);
  localTime.setAttribute("datetime", now.toTimeString().slice(0, 5));
}

updateLocalTime();
setInterval(updateLocalTime, 30000);


const rotatorWords = Array.from(document.querySelectorAll(".rotator-word"));
let rotatorIndex = 0;
let rotatorTimer = null;

function advanceRotator() {
  if (rotatorWords.length < 2) return;

  rotatorWords[rotatorIndex].classList.remove("is-active");
  rotatorIndex = (rotatorIndex + 1) % rotatorWords.length;
  rotatorWords[rotatorIndex].classList.add("is-active");
}

function startRotator() {
  if (reduceMotion || rotatorTimer !== null || rotatorWords.length < 2) {
    return;
  }

  rotatorTimer = setInterval(advanceRotator, 3200);
}

function stopRotator() {
  if (rotatorTimer !== null) {
    clearInterval(rotatorTimer);
    rotatorTimer = null;
  }
}

startRotator();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopRotator();
  } else {
    startRotator();
  }
});


const revealElements = Array.from(document.querySelectorAll(".reveal"));

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  revealElements.forEach((element) => {
    element.classList.add("reveal-init");
    revealObserver.observe(element);
  });
}


const hero = $(".hero");
const heroGraphic = $(".hero-graphic");

if (hero && heroGraphic && finePointer && !reduceMotion) {
  let parallaxFrame = null;
  let pointerX = 0;
  let pointerY = 0;

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;

    const rect = hero.getBoundingClientRect();

    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    if (parallaxFrame === null) {
      parallaxFrame = requestAnimationFrame(() => {
        heroGraphic.style.setProperty("--mx", pointerX.toFixed(3));
        heroGraphic.style.setProperty("--my", pointerY.toFixed(3));
        parallaxFrame = null;
      });
    }
  });

  hero.addEventListener("pointerleave", () => {
    heroGraphic.style.setProperty("--mx", "0");
    heroGraphic.style.setProperty("--my", "0");
  });
}


const cursorDot = $("#cursorDot");
const cursorRing = $("#cursorRing");

if (finePointer && !reduceMotion && cursorDot && cursorRing) {
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let dotX = targetX;
  let dotY = targetY;
  let ringX = targetX;
  let ringY = targetY;
  let cursorActive = false;

  const renderCursor = () => {
    dotX += (targetX - dotX) * 0.38;
    dotY += (targetY - dotY) * 0.38;
    ringX += (targetX - ringX) * 0.16;
    ringY += (targetY - ringY) * 0.16;

    cursorDot.style.transform =
      `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
    cursorRing.style.transform =
      `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

    requestAnimationFrame(renderCursor);
  };

  const showCursor = () => {
    cursorDot.classList.add("is-visible");
    cursorRing.classList.add("is-visible");
  };

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;

    targetX = event.clientX;
    targetY = event.clientY;

    if (!cursorActive) {
      cursorActive = true;
      document.documentElement.classList.add("has-custom-cursor");
      showCursor();
    }
  }, { passive: true });

  const interactiveSelector = "a, button, input, select, textarea";

  document.addEventListener("pointerover", (event) => {
    if (event.target.closest(interactiveSelector)) {
      cursorRing.classList.add("is-hover");
    }
  });

  document.addEventListener("pointerout", (event) => {
    const fromInteractive = event.target.closest(interactiveSelector);
    const toInteractive = event.relatedTarget instanceof Element
      ? event.relatedTarget.closest(interactiveSelector)
      : null;

    if (fromInteractive && fromInteractive !== toInteractive) {
      cursorRing.classList.remove("is-hover");
    }
  });

  document.addEventListener("pointerdown", () => {
    cursorRing.classList.add("is-down");
  });

  document.addEventListener("pointerup", () => {
    cursorRing.classList.remove("is-down");
  });

  document.addEventListener("mouseleave", () => {
    cursorActive = false;
    cursorDot.classList.remove("is-visible");
    cursorRing.classList.remove("is-visible");
  });

  renderCursor();
}
