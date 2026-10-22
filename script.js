(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const elements = {
    analogClock: $("#analogClock"),
    clockMarkers: $("#clockMarkers"),
    hourHand: $("#hourHand"),
    minuteHand: $("#minuteHand"),
    secondHand: $("#secondHand"),
    digitalHour: $("#digitalHour"),
    digitalMinute: $("#digitalMinute"),
    digitalSecond: $("#digitalSecond"),
    secondsPart: $(".seconds-part"),
    ampm: $("#ampm"),
    dateLine: $("#dateLine"),
    localTimezone: $("#localTimezone"),
    secondsToggle: $("#secondsToggle"),
    overviewDate: $("#overviewDate"),
    dayOfYear: $("#dayOfYear"),
    weekNumber: $("#weekNumber"),
    dayProgress: $("#dayProgress"),
    dayProgressText: $("#dayProgressText"),
    footerYear: $("#footerYear"),
    themeToggle: $("#themeToggle"),
    toast: $("#toast")
  };

  let timeFormat = 12;
  let showSeconds = true;
  let toastTimeout;

  function pad(value, length = 2) {
    return String(value).padStart(length, "0");
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  // ISO-8601 week number, where Monday is the first day of the week.
  function getISOWeek(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => elements.toast.classList.remove("show"), 2600);
  }

  function buildClockMarkers() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 60; i++) {
      const marker = document.createElement("span");
      marker.className = `clock-marker${i % 5 === 0 ? " major" : ""}`;
      marker.style.transform = `rotate(${i * 6}deg)`;
      fragment.appendChild(marker);
    }

    // Twelve numerals, positioned along a circle inside the clock.
    const clockSize = () => elements.analogClock.getBoundingClientRect().width;
    const placeNumbers = () => {
      $$(".clock-number", elements.clockMarkers).forEach(node => node.remove());
      const size = clockSize();
      const radius = size * 0.365;
      for (let n = 1; n <= 12; n++) {
        const angle = (n * 30 - 90) * Math.PI / 180;
        const number = document.createElement("span");
        number.className = "clock-number";
        number.textContent = String(n);
        number.style.left = `${size / 2 + Math.cos(angle) * radius}px`;
        number.style.top = `${size / 2 + Math.sin(angle) * radius}px`;
        elements.clockMarkers.appendChild(number);
      }
    };

    elements.clockMarkers.appendChild(fragment);
    placeNumbers();
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(placeNumbers);
      observer.observe(elements.analogClock);
    } else {
      window.addEventListener("resize", placeNumbers, { passive: true });
    }
  }

  function updateMainClock() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();
    const displayHour = timeFormat === 12 ? (h % 12 || 12) : h;

    // Smooth hand movement, while the digital readout remains second-accurate.
    const secondAngle = (s + ms / 1000) * 6;
    const minuteAngle = (m + s / 60) * 6;
    const hourAngle = ((h % 12) + m / 60) * 30;

    elements.hourHand.style.transform = `rotate(${hourAngle}deg)`;
    elements.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
    elements.secondHand.style.transform = `rotate(${secondAngle}deg)`;

    elements.digitalHour.textContent = pad(displayHour);
    elements.digitalMinute.textContent = pad(m);
    elements.digitalSecond.textContent = pad(s);
    elements.ampm.textContent = h >= 12 ? "PM" : "AM";
    elements.ampm.hidden = timeFormat === 24;
    elements.analogClock.classList.toggle("hide-seconds", !showSeconds);
    elements.secondsPart.hidden = !showSeconds;
    elements.secondsToggle.setAttribute("aria-pressed", String(showSeconds));

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
    elements.localTimezone.textContent = timezone.split("/").pop().replaceAll("_", " ").toUpperCase();
    elements.localTimezone.title = timezone;

    elements.dateLine.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    }).format(now);

    elements.overviewDate.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long", month: "long", day: "numeric"
    }).format(now);
    elements.dayOfYear.textContent = pad(getDayOfYear(now), 3);
    elements.weekNumber.textContent = pad(getISOWeek(now));
    const progress = ((h * 3600 + m * 60 + s) / 86400) * 100;
    elements.dayProgress.style.width = `${progress}%`;
    elements.dayProgressText.textContent = `${progress.toFixed(1)}%`;
  }

  const worldClocks = [
    { zone: "Africa/Nairobi", offsetId: "nairobiOffset" },
    { zone: "Europe/London", offsetId: "londonOffset" },
    { zone: "America/New_York", offsetId: "newYorkOffset" }
  ];

  function timezoneShortName(date, zone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, timeZoneName: "short"
    }).formatToParts(date);
    return parts.find(part => part.type === "timeZoneName")?.value || zone;
  }

  function updateWorldClocks() {
    const now = new Date();
    worldClocks.forEach(({ zone, offsetId }) => {
      const timeElement = $(`[data-zone="${zone}"]`);
      const dateElement = $(`[data-date-zone="${zone}"]`);
      if (timeElement) {
        timeElement.textContent = new Intl.DateTimeFormat(undefined, {
          timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: timeFormat === 12
        }).format(now);
      }
      if (dateElement) {
        dateElement.textContent = new Intl.DateTimeFormat(undefined, {
          timeZone: zone, weekday: "short", month: "short", day: "numeric"
        }).format(now);
      }
      const offsetElement = $(`#${offsetId}`);
      if (offsetElement) offsetElement.textContent = timezoneShortName(now, zone);
    });
  }

  // Theme toggle with persistent preference when localStorage is available.
  function loadTheme() {
    let saved = null;
    try { saved = localStorage.getItem("chrono-theme"); } catch (_) {}
    if (saved === "light") document.body.classList.add("light-theme");
    updateThemeButton();
  }

  function updateThemeButton() {
    const light = document.body.classList.contains("light-theme");
    elements.themeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    elements.themeToggle.title = light ? "Switch to dark theme" : "Switch to light theme";
    const metaTheme = $('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = light ? "#f2f5f9" : "#080b12";
  }

  elements.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    const light = document.body.classList.contains("light-theme");
    try { localStorage.setItem("chrono-theme", light ? "light" : "dark"); } catch (_) {}
    updateThemeButton();
  });

  $$("[data-format]").forEach(button => {
    button.addEventListener("click", () => {
      timeFormat = Number(button.dataset.format) === 24 ? 24 : 12;
      $$("[data-format]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      updateMainClock();
      updateWorldClocks();
    });
  });

  elements.secondsToggle.addEventListener("click", () => {
    showSeconds = !showSeconds;
    updateMainClock();
  });

  $$("[data-scroll]").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Stopwatch uses performance.now() to avoid interval drift.
  const stopwatchDisplay = $("#stopwatchDisplay");
  const stopwatchStart = $("#stopwatchStart");
  const stopwatchReset = $("#stopwatchReset");
  let stopwatchRunning = false;
  let stopwatchStartedAt = 0;
  let stopwatchElapsed = 0;
  let stopwatchFrame = 0;

  function formatStopwatch(milliseconds) {
    const centiseconds = Math.floor(milliseconds / 10);
    const minutes = Math.floor(centiseconds / 6000);
    const seconds = Math.floor((centiseconds % 6000) / 100);
    const hundredths = centiseconds % 100;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;
    return hours > 0
      ? `${pad(hours)}:${pad(displayMinutes)}:${pad(seconds)}.${pad(hundredths)}`
      : `${pad(displayMinutes)}:${pad(seconds)}.${pad(hundredths)}`;
  }

  function renderStopwatch() {
    const elapsed = stopwatchElapsed + (stopwatchRunning ? performance.now() - stopwatchStartedAt : 0);
    stopwatchDisplay.textContent = formatStopwatch(elapsed);
    if (stopwatchRunning) stopwatchFrame = requestAnimationFrame(renderStopwatch);
  }

  stopwatchStart.addEventListener("click", () => {
    if (stopwatchRunning) {
      stopwatchElapsed += performance.now() - stopwatchStartedAt;
      stopwatchRunning = false;
      cancelAnimationFrame(stopwatchFrame);
      stopwatchStart.textContent = "Resume stopwatch";
    } else {
      stopwatchStartedAt = performance.now();
      stopwatchRunning = true;
      stopwatchStart.textContent = "Pause stopwatch";
      renderStopwatch();
    }
  });

  stopwatchReset.addEventListener("click", () => {
    stopwatchRunning = false;
    cancelAnimationFrame(stopwatchFrame);
    stopwatchElapsed = 0;
    stopwatchStartedAt = 0;
    stopwatchDisplay.textContent = "00:00.00";
    stopwatchStart.textContent = "Start stopwatch";
  });

  // Countdown timer is based on an end timestamp, so background tabs don't lose time.
  const timerHours = $("#timerHours");
  const timerMinutes = $("#timerMinutes");
  const timerSeconds = $("#timerSeconds");
  const timerStart = $("#timerStart");
  const timerReset = $("#timerReset");
  const timerStatus = $("#timerStatus");
  const timerProgress = $("#timerProgress");
  const timerInputs = [timerHours, timerMinutes, timerSeconds];
  let timerRunning = false;
  let timerEnd = 0;
  let timerRemaining = 300;
  let timerInitial = 300;
  let timerInterval = null;
  let timerFinished = false;

  function readTimerInputs() {
    const h = Math.min(99, Math.max(0, Math.floor(Number(timerHours.value) || 0)));
    const m = Math.min(59, Math.max(0, Math.floor(Number(timerMinutes.value) || 0)));
    const s = Math.min(59, Math.max(0, Math.floor(Number(timerSeconds.value) || 0)));
    timerHours.value = h;
    timerMinutes.value = m;
    timerSeconds.value = s;
    return h * 3600 + m * 60 + s;
  }

  function formatCountdown(totalSeconds) {
    const safe = Math.max(0, Math.ceil(totalSeconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function renderTimer() {
    const remaining = timerRunning ? Math.max(0, (timerEnd - Date.now()) / 1000) : timerRemaining;
    timerRemaining = remaining;
    stopwatchSafeTimerDisplay(remaining);
    const progress = timerInitial > 0 ? ((timerInitial - remaining) / timerInitial) * 100 : 0;
    timerProgress.style.width = `${Math.max(0, Math.min(100, progress))}%`;

    if (timerRunning && remaining <= 0) {
      timerRunning = false;
      timerFinished = true;
      clearInterval(timerInterval);
      timerInterval = null;
      timerRemaining = 0;
      timerStart.textContent = "Start again";
      timerStatus.textContent = "Time is up!";
      showToast("Countdown complete!");
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Chrono timer", { body: "Your countdown is complete." });
        }
      } catch (_) {}
      return;
    }
    if (timerRunning) timerStatus.textContent = "Countdown in progress…";
    else if (timerFinished) timerStatus.textContent = "Time is up!";
  }

  function stopwatchSafeTimerDisplay(remaining) {
    const display = $("#timerDisplay");
    if (display) display.textContent = formatCountdown(remaining);
    else {
      // The original layout uses the inputs area as its timer display; add a display
      // dynamically so the remaining time is always visible.
      const inputs = $(".timer-inputs");
      if (inputs && !$("#timerDisplay")) {
        const output = document.createElement("div");
        output.id = "timerDisplay";
        output.className = "timer-display";
        output.setAttribute("role", "timer");
        output.setAttribute("aria-label", "Time remaining");
        inputs.insertAdjacentElement("afterend", output);
      }
      const created = $("#timerDisplay");
      if (created) created.textContent = formatCountdown(remaining);
    }
  }

  timerStart.addEventListener("click", () => {
    if (timerRunning) {
      timerRemaining = Math.max(0, (timerEnd - Date.now()) / 1000);
      timerRunning = false;
      clearInterval(timerInterval);
      timerInterval = null;
      timerStart.textContent = "Resume countdown";
      timerStatus.textContent = "Countdown paused.";
      renderTimer();
      return;
    }

    if (timerFinished || timerRemaining <= 0) {
      const requested = readTimerInputs();
      if (requested <= 0) {
        showToast("Enter a duration greater than zero.");
        timerStatus.textContent = "Enter a duration greater than zero.";
        return;
      }
      timerRemaining = requested;
      timerInitial = requested;
      timerFinished = false;
    } else if (!timerInitial || timerRemaining === timerInitial) {
      const requested = readTimerInputs();
      if (requested <= 0) {
        showToast("Enter a duration greater than zero.");
        return;
      }
      timerRemaining = requested;
      timerInitial = requested;
    }

    timerEnd = Date.now() + timerRemaining * 1000;
    timerRunning = true;
    timerStart.textContent = "Pause countdown";
    timerStatus.textContent = "Countdown in progress…";
    clearInterval(timerInterval);
    renderTimer();
    timerInterval = setInterval(renderTimer, 200);
  });

  timerReset.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerFinished = false;
    timerRemaining = readTimerInputs();
    timerInitial = timerRemaining;
    timerProgress.style.width = "0%";
    timerStart.textContent = "Start countdown";
    timerStatus.textContent = timerRemaining > 0 ? "Ready when you are." : "Choose a duration to get started.";
    stopwatchSafeTimerDisplay(timerRemaining);
  });

  timerInputs.forEach(input => {
    input.addEventListener("change", () => {
      if (timerRunning) return;
      timerFinished = false;
      timerRemaining = readTimerInputs();
      timerInitial = timerRemaining;
      timerProgress.style.width = "0%";
      timerStatus.textContent = timerRemaining > 0 ? "Ready when you are." : "Choose a duration to get started.";
      timerStart.textContent = "Start countdown";
      stopwatchSafeTimerDisplay(timerRemaining);
    });
  });

  // Initial setup.
  buildClockMarkers();
  loadTheme();
  elements.footerYear.textContent = `© ${new Date().getFullYear()}`;
  updateMainClock();
  updateWorldClocks();
  timerRemaining = readTimerInputs();
  timerInitial = timerRemaining;
  stopwatchSafeTimerDisplay(timerRemaining);
  timerStatus.textContent = "Ready when you are.";
  setInterval(() => {
    updateMainClock();
    updateWorldClocks();
  }, 250);
})();
