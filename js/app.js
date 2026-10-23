/* CleanFrame for VIDAA — written in plain ES5 so older TV browsers run it. */
(function () {
  "use strict";

  var CFG = window.CLEANFRAME_CONFIG || {};
  var STORE_KEY = "cleanframe.settings.v1";

  // Remote control key codes (VIDAA uses the standard HbbTV/DOM codes).
  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13,
    BACK: [8, 27, 461, 10009],
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406
  };

  var SCENES = ["dusk", "lake", "forest", "ember", "night", "paper"];
  var hasPhotos = CFG.photos && CFG.photos.length > 0;

  var PICTURES = (hasPhotos ? [{ id: "photos", label: "Your photos" }] : [])
    .concat([{ id: "rotate", label: "All scenes" }])
    .concat(SCENES.map(function (s) { return { id: s, label: s.charAt(0).toUpperCase() + s.slice(1) }; }));

  var OPTIONS = {
    picture: PICTURES,
    layout: [{ id: "classic", label: "Classic" }, { id: "centered", label: "Centered" }, { id: "minimal", label: "Minimal" }],
    clock: [{ id: "12", label: "12-hour" }, { id: "24", label: "24-hour" }],
    weather: [{ id: "on", label: "On" }, { id: "off", label: "Off" }],
    frame: [{ id: "0", label: "Off" }, { id: "2", label: "2 min" }, { id: "5", label: "5 min" },
            { id: "10", label: "10 min" }, { id: "30", label: "30 min" }]
  };

  function defaults() {
    return {
      picture: hasPhotos ? "photos" : "rotate",
      layout: "classic",
      clock: "12",
      weather: CFG.weather && CFG.weather.enabled === false ? "off" : "on",
      frame: String(CFG.frameModeAfterMinutes == null ? 5 : CFG.frameModeAfterMinutes)
    };
  }

  // ---------- storage (always guarded: it can be missing or throw) ----------

  function load() {
    var s = defaults();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var k in s) { if (saved[k] != null && findIndex(OPTIONS[k], saved[k]) >= 0) s[k] = saved[k]; }
      }
    } catch (e) {}
    if (findIndex(OPTIONS.frame, s.frame) < 0) s.frame = "5";
    return s;
  }

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  function findIndex(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  var settings = load();

  // ---------- helpers ----------

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.appendChild(document.createTextNode(text));
    return n;
  }
  function addClass(n, c) { if ((" " + n.className + " ").indexOf(" " + c + " ") < 0) n.className = (n.className + " " + c).replace(/^\s+/, ""); }
  function removeClass(n, c) { n.className = (" " + n.className + " ").replace(" " + c + " ", " ").replace(/^\s+|\s+$/g, ""); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  var stage = $("stage");

  // ---------- fit the 1920x1080 stage to whatever viewport the TV reports ----------

  function fit() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    var scale = Math.min(w / 1920, h / 1080);
    var x = Math.round((w - 1920 * scale) / 2), y = Math.round((h - 1080 * scale) / 2);
    var t = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
    stage.style.webkitTransform = t;
    stage.style.transform = t;
  }

  // ---------- clock ----------

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];

  function timeParts(d) {
    var h = d.getHours(), m = pad(d.getMinutes());
    if (settings.clock === "24") return { main: pad(h) + ":" + m, ampm: "" };
    return { main: ((h % 12) || 12) + ":" + m, ampm: h < 12 ? "AM" : "PM" };
  }

  function tickClock() {
    var d = new Date(), t = timeParts(d), h = d.getHours();
    var clock = $("clock");
    clock.innerHTML = "";
    clock.appendChild(document.createTextNode(t.main));
    if (t.ampm) clock.appendChild(el("span", "ampm", t.ampm));
    $("frame-clock").textContent = t.main + (t.ampm ? " " + t.ampm : "");
    $("date").textContent = DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate();
    var part = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    $("greeting").textContent = part + (CFG.name ? ", " + CFG.name : "");
  }

  // ---------- weather (Open-Meteo: free, no key) ----------

  var WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Freezing fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
  };

  function loadWeather() {
    var w = CFG.weather || {};
    if (settings.weather === "off" || w.latitude == null) return;
    var unit = w.units === "fahrenheit" ? "fahrenheit" : "celsius";
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + w.latitude + "&longitude=" + w.longitude +
      "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=1&temperature_unit=" + unit;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 15000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || xhr.status !== 200) return;
      try {
        var data = JSON.parse(xhr.responseText);
        $("w-temp").textContent = Math.round(data.current.temperature_2m) + "°";
        $("w-text").textContent = (WMO[data.current.weather_code] || "") + (w.place ? " · " + w.place : "");
        $("w-range").textContent = "H " + Math.round(data.daily.temperature_2m_max[0]) + "°   L " +
          Math.round(data.daily.temperature_2m_min[0]) + "°";
      } catch (e) {}
    };
    xhr.send();
  }

  // ---------- background ----------

  var bgLayers = [$("bg-a"), $("bg-b")], bgFront = 0, bgStep = 0, bgTimer = null;

  function pictureList() {
    if (settings.picture === "photos") return CFG.photos.map(function (p) { return { photo: p }; });
    if (settings.picture === "rotate") return SCENES.map(function (s) { return { scene: s }; });
    return [{ scene: settings.picture }];
  }

  function showPicture(item) {
    var next = bgLayers[1 - bgFront], cur = bgLayers[bgFront];
    next.className = "bg" + (item.scene ? " scene-" + item.scene : "");
    next.style.backgroundImage = item.photo ? "url('" + item.photo + "')" : "";
    // Force a style pass so the crossfade runs.
    void next.offsetWidth;
    addClass(next, "on");
    removeClass(cur, "on");
    bgFront = 1 - bgFront;
  }

  function startBackground() {
    var list = pictureList();
    clearInterval(bgTimer);
    bgStep = 0;
    showPicture(list[0]);
    if (list.length > 1) {
      var every = Math.max(1, CFG.photoEveryMinutes || 10) * 60000;
      bgTimer = setInterval(function () {
        bgStep = (bgStep + 1) % list.length;
        showPicture(list[bgStep]);
      }, every);
    }
  }

  // ---------- tiles ----------

  var tiles = [], tileIndex = 0;

  function buildTiles() {
    var nav = $("tiles");
    nav.innerHTML = "";
    tiles = [];
    var list = (CFG.shortcuts || []).slice(0, 6);
    for (var i = 0; i < list.length; i++) {
      var s = list[i], t = el("div", "tile"), b = el("div", "badge", s.icon ? "" : (s.letter || s.name.charAt(0)));
      b.style.backgroundColor = s.color || "#555";
      if (s.icon) b.style.backgroundImage = "url('" + s.icon + "')";
      t.appendChild(b);
      t.appendChild(el("div", "label", s.name));
      t.setAttribute("data-url", s.url);
      nav.appendChild(t);
      tiles.push({ node: t, action: openUrl(s.url) });
    }
    tiles.push(smallTile(nav, "ico-frame", "Frame", enterFrame));
    tiles.push(smallTile(nav, "ico-settings", "Settings", openSettings));
    if (tileIndex >= tiles.length) tileIndex = 0;
  }

  function smallTile(nav, icon, name, fn) {
    var t = el("div", "tile small"), b = el("div", "badge");
    b.appendChild(el("i", icon));
    t.appendChild(b);
    t.appendChild(el("div", "label", name));
    nav.appendChild(t);
    return { node: t, action: fn };
  }

  function openUrl(url) { return function () { window.location.href = url; }; }

  function focusTile(i) {
    if (!tiles.length) return;
    tileIndex = (i + tiles.length) % tiles.length;
    for (var k = 0; k < tiles.length; k++) {
      if (k === tileIndex) addClass(tiles[k].node, "focus"); else removeClass(tiles[k].node, "focus");
    }
  }

  // ---------- settings sheet ----------

  var ROWS = [
    { key: "picture", label: "Picture" },
    { key: "layout", label: "Layout" },
    { key: "clock", label: "Clock" },
    { key: "weather", label: "Weather" },
    { key: "frame", label: "Frame mode after" },
    { key: "reset", label: "Reset to defaults" }
  ];
  var rowIndex = 0, settingsOpen = false;

  function renderSettings() {
    var ul = $("settings-list");
    ul.innerHTML = "";
    for (var i = 0; i < ROWS.length; i++) {
      var r = ROWS[i], li = el("li", i === rowIndex ? "focus" : "", r.label);
      if (OPTIONS[r.key]) {
        var opt = OPTIONS[r.key][findIndex(OPTIONS[r.key], settings[r.key])];
        li.appendChild(el("span", "val", opt ? opt.label : ""));
      }
      ul.appendChild(li);
    }
  }

  function changeSetting(dir) {
    var r = ROWS[rowIndex], list = OPTIONS[r.key];
    if (!list) return;
    var i = findIndex(list, settings[r.key]);
    settings[r.key] = list[(i + dir + list.length) % list.length].id;
    save();
    apply(r.key);
    renderSettings();
  }

  function apply(key) {
    if (!key || key === "layout") stage.className = "layout-" + settings.layout + (settings.weather === "off" ? " no-weather" : "") +
      (settingsOpen ? " settings-open" : "");
    if (!key || key === "weather") {
      if (settings.weather === "off") addClass(stage, "no-weather"); else { removeClass(stage, "no-weather"); loadWeather(); }
    }
    if (!key || key === "picture") startBackground();
    if (!key || key === "clock") tickClock();
    if (!key || key === "frame") resetIdle();
  }

  function openSettings() {
    settingsOpen = true;
    rowIndex = 0;
    renderSettings();
    addClass(stage, "settings-open");
  }
  function closeSettings() {
    settingsOpen = false;
    removeClass(stage, "settings-open");
  }

  // ---------- frame mode (idle) ----------

  var idleTimer = null, framed = false;

  function enterFrame() {
    if (settingsOpen) closeSettings();
    framed = true;
    addClass(stage, "frame");
  }
  function leaveFrame() {
    framed = false;
    removeClass(stage, "frame");
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    var mins = parseInt(settings.frame, 10);
    if (mins > 0) idleTimer = setTimeout(enterFrame, mins * 60000);
  }

  // ---------- exit back to the VIDAA launcher ----------

  function exitApp() {
    try { if (typeof window.Hisense_Exit === "function") { window.Hisense_Exit(); return; } } catch (e) {}
    try { if (typeof window.Hisense_CloseApp === "function") { window.Hisense_CloseApp(); return; } } catch (e) {}
    try { window.close(); } catch (e) {}
  }

  // ---------- remote control ----------

  function isBack(code) { for (var i = 0; i < KEY.BACK.length; i++) if (KEY.BACK[i] === code) return true; return false; }

  document.addEventListener("keydown", function (ev) {
    var code = ev.keyCode || ev.which;
    resetIdle();

    if (framed) {           // any key just wakes the screen
      leaveFrame();
      ev.preventDefault();
      return;
    }

    if (isBack(code)) {
      ev.preventDefault();
      if (settingsOpen) closeSettings(); else exitApp();
      return;
    }
    if (code === KEY.BLUE) { ev.preventDefault(); settingsOpen ? closeSettings() : openSettings(); return; }
    if (code === KEY.YELLOW) { ev.preventDefault(); enterFrame(); return; }

    if (settingsOpen) {
      if (code === KEY.UP) rowIndex = (rowIndex - 1 + ROWS.length) % ROWS.length;
      else if (code === KEY.DOWN) rowIndex = (rowIndex + 1) % ROWS.length;
      else if (code === KEY.LEFT) changeSetting(-1);
      else if (code === KEY.RIGHT) changeSetting(1);
      else if (code === KEY.OK) {
        if (ROWS[rowIndex].key === "reset") { settings = defaults(); save(); apply(); }
        else changeSetting(1);
      } else return;
      ev.preventDefault();
      renderSettings();
      return;
    }

    if (code === KEY.LEFT) focusTile(tileIndex - 1);
    else if (code === KEY.RIGHT) focusTile(tileIndex + 1);
    else if (code === KEY.OK) tiles[tileIndex].action();
    else return;
    ev.preventDefault();
  }, false);

  // ---------- start ----------

  window.addEventListener("resize", fit, false);
  fit();
  buildTiles();
  focusTile(0);
  apply();
  setInterval(tickClock, 1000 * 5);
  setInterval(loadWeather, 1000 * 60 * 30);
})();
