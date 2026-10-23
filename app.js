/* CleanFrame for VIDAA — written in plain ES5 so the TV's older browser runs it. */
(function () {
  "use strict";

  var CFG = window.CLEANFRAME_CONFIG || {};
  var STORE_KEY = "cleanframe.settings.v2";

  // Remote control key codes (VIDAA uses the standard DOM/HbbTV codes).
  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13,
    BACK: [8, 27, 461, 10009],
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406
  };

  // ---------- the four apps ----------
  // appId/name/url are what VIDAA itself uses for these apps (same values the
  // open-source Hisense remotes send). Disney+ on VIDAA is a web app, so we can
  // open it directly; the others need the TV to start them.

  var LOGOS = {
    netflix: '<svg viewBox="0 0 56 100"><path d="M0 0h16l24 62V0h16v100H40L16 38v62H0z"/></svg>',
    disney: '<svg viewBox="0 0 120 100"><path d="M10 34C34 6 92 4 114 30" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>' +
            '<text x="16" y="92" font-family="Georgia, \'Times New Roman\', serif" font-style="italic" font-weight="700" font-size="70">D</text>' +
            '<path d="M84 50h26M97 37v26" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>',
    youtube: '<svg viewBox="0 0 140 100"><rect x="0" y="12" width="140" height="76" rx="22"/><path d="M57 32v36l31-18z" fill="#24282f"/></svg>',
    prime: '<svg viewBox="0 0 160 100"><text x="80" y="56" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-weight="700" font-size="50" letter-spacing="-1">prime</text>' +
           '<path d="M24 70c34 20 82 22 112 2" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M124 64l14 6-8 12" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var APPS = {
    netflix: { label: "Netflix", appId: "1", name: "Netflix", url: "netflix", pkg: "com.netflix.ninja" },
    disney:  { label: "Disney+", appId: "295", name: "Disney+", url: "https://cd-dmgz.bamgrid.com/bbd/hisense_tv/index.html", web: true },
    youtube: { label: "YouTube", appId: "3", name: "YouTube", url: "youtube", webFallback: "https://www.youtube.com/tv" },
    prime:   { label: "Prime Video", appId: "2", name: "Prime Video", url: "amazon" }
  };

  // ---------- wallpapers ----------

  var WALLS = (CFG.photos && CFG.photos.length)
    ? CFG.photos.map(function (p, i) { return { id: "p" + i, src: p, blur: p, title: "Your photo " + (i + 1) }; })
    : (window.CLEANFRAME_WALLPAPERS || []).map(function (w) {
        return { id: w.id, src: "wallpapers/" + w.id + ".jpg", blur: "wallpapers/" + w.id + "-blur.jpg",
                 title: w.title, credit: "Photo: " + w.title + " — " + w.artist + " · " + w.license + " · Wikimedia Commons" };
      });

  // ---------- settings ----------

  var OPTIONS = {
    wallpaper: [{ id: "rotate", label: "Rotate all" }].concat(WALLS.map(function (w, i) {
      return { id: w.id, label: (i + 1) + ". " + shorten(w.title, 22) };
    })),
    clock: [{ id: "12", label: "12-hour" }, { id: "24", label: "24-hour" }],
    every: [{ id: "5", label: "5 min" }, { id: "15", label: "15 min" }, { id: "30", label: "30 min" }, { id: "60", label: "1 hour" }],
    frame: [{ id: "0", label: "Off" }, { id: "1", label: "1 min" }, { id: "2", label: "2 min" },
            { id: "5", label: "5 min" }, { id: "10", label: "10 min" }]
  };

  function shorten(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  function defaults() {
    return {
      wallpaper: "rotate",
      clock: "12",
      every: String(CFG.wallpaperEveryMinutes || 15),
      frame: String(CFG.frameModeAfterMinutes == null ? 2 : CFG.frameModeAfterMinutes)
    };
  }

  function findIndex(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  function load() {
    var s = defaults(), k;
    try {
      var saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
      for (k in s) { if (saved[k] != null) s[k] = saved[k]; }
    } catch (e) {}
    for (k in s) { if (findIndex(OPTIONS[k], s[k]) < 0) s[k] = OPTIONS[k][0].id; }
    return s;
  }

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
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
  function hasClass(n, c) { return (" " + n.className + " ").indexOf(" " + c + " ") >= 0; }
  function addClass(n, c) { if (!hasClass(n, c)) n.className = (n.className + " " + c).replace(/^\s+/, ""); }
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

  function tickClock() {
    var d = new Date(), h = d.getHours(), m = pad(d.getMinutes()), clock = $("clock");
    clock.innerHTML = "";
    if (settings.clock === "24") {
      clock.appendChild(document.createTextNode(pad(h) + ":" + m));
    } else {
      clock.appendChild(document.createTextNode(((h % 12) || 12) + ":" + m));
    }
  }

  // ---------- wallpaper crossfade ----------

  var layers = [{ bg: $("bg-a"), glass: $("glass-a") }, { bg: $("bg-b"), glass: $("glass-b") }];
  var front = 0, wallIndex = 0, wallTimer = null;

  function showWall(i) {
    if (!WALLS.length) return;
    wallIndex = (i + WALLS.length) % WALLS.length;
    var w = WALLS[wallIndex], next = layers[1 - front], cur = layers[front];
    var img = new Image();
    img.onload = img.onerror = function () {
      next.bg.style.backgroundImage = "url('" + w.src + "')";
      next.glass.style.backgroundImage = "url('" + w.blur + "')";
      void next.bg.offsetWidth; // let the new image land before fading
      addClass(next.bg, "on"); addClass(next.glass, "on");
      removeClass(cur.bg, "on"); removeClass(cur.glass, "on");
      front = 1 - front;
      $("credit").textContent = w.credit || "";
    };
    img.src = w.src;
  }

  function startWallpaper() {
    clearInterval(wallTimer);
    if (settings.wallpaper === "rotate") {
      showWall(Math.floor(Math.random() * WALLS.length));
      wallTimer = setInterval(function () { showWall(wallIndex + 1); }, parseInt(settings.every, 10) * 60000);
    } else {
      showWall(findIndex(WALLS, settings.wallpaper));
    }
  }

  function nextWallpaper() {
    if (settings.wallpaper !== "rotate") {
      var i = findIndex(OPTIONS.wallpaper, settings.wallpaper) + 1;
      if (i >= OPTIONS.wallpaper.length) i = 1;
      settings.wallpaper = OPTIONS.wallpaper[i].id;
      save();
    }
    showWall(settings.wallpaper === "rotate" ? wallIndex + 1 : findIndex(WALLS, settings.wallpaper));
  }

  // ---------- dock tiles + top icons ----------

  var tiles = [], icons = [], zone = "dock", tileIndex = 0, iconIndex = 0;

  function buildDock() {
    var row = $("dock-row"), keys = CFG.apps || ["netflix", "disney", "youtube", "prime"];
    row.innerHTML = "";
    tiles = [];
    for (var i = 0; i < keys.length; i++) {
      var app = APPS[keys[i]];
      if (!app) continue;
      var t = el("div", "tile"), logo = el("div", "logo");
      logo.innerHTML = LOGOS[keys[i]];
      t.appendChild(logo);
      t.appendChild(el("div", "label", app.label));
      row.appendChild(t);
      tiles.push({ node: t, app: app });
    }
    var w = Math.floor(1688 / Math.max(1, tiles.length));
    for (var k = 0; k < tiles.length; k++) tiles[k].node.style.width = w + "px";

    var nodes = $("topbar").getElementsByTagName("div");
    for (var j = 0; j < nodes.length; j++) icons.push({ node: nodes[j], act: nodes[j].getAttribute("data-act") });
  }

  function paintFocus() {
    for (var i = 0; i < tiles.length; i++) {
      if (zone === "dock" && i === tileIndex) addClass(tiles[i].node, "focus"); else removeClass(tiles[i].node, "focus");
    }
    for (var j = 0; j < icons.length; j++) {
      if (zone === "top" && j === iconIndex) addClass(icons[j].node, "focus"); else removeClass(icons[j].node, "focus");
    }
  }

  function runIcon(act) {
    if (act === "wallpaper") nextWallpaper();
    else if (act === "tvhome") exitApp();
    else if (act === "settings") openSheet("settings");
  }

  // ---------- opening apps ----------

  var toastTimer = null;
  function toast(msg, ms) {
    var t = $("toast");
    t.textContent = msg;
    addClass(t, "on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { removeClass(t, "on"); }, ms || 6000);
  }

  // The TV's own list of installed apps, when this firmware lets a web page read it.
  function readTvAppList() {
    try {
      if (typeof window.HiUtils_createRequest !== "function") return null;
      var r = window.HiUtils_createRequest("fileRead", { path: "websdk/Appinfo.json", mode: 6 });
      if (!r || !r.ret) return null;
      var data = JSON.parse(r.msg);
      return data && data.AppInfo ? data.AppInfo : null;
    } catch (e) { return null; }
  }

  // Ways to ask the TV to start a built-in app. VIDAA doesn't document this, so the
  // first time you press a tile CleanFrame tries each way in turn and remembers the
  // one that worked (if any). Messages come first because they are harmless when
  // ignored; the "netflix://" style link goes last because it leaves the page.
  function bridges() {
    var out = [];
    if (window.omi_platform && typeof window.omi_platform.sendPlatformMessage === "function") out.push(window.omi_platform);
    if (window.opera_omi && typeof window.opera_omi.sendPlatformMessage === "function" &&
        window.opera_omi !== window.omi_platform) out.push(window.opera_omi);
    return out;
  }
  function send(msg) {
    var b = bridges();
    for (var i = 0; i < b.length; i++) { try { b[i].sendPlatformMessage(JSON.stringify(msg)); } catch (e) {} }
    return b.length > 0;
  }
  function info(app, url) {
    return { appId: app.appId, name: app.name, url: url || app.url, Id: app.appId, AppName: app.name, StartCommand: url || app.url };
  }

  var WAYS = [
    function (app) { return send({ type: "APPMessage", MsgType: "appControl", action: "startApp", source: "browser", startAppType: 2, param: info(app) }); },
    function (app) { return send({ type: "APPMessage", MsgType: "appControl", action: "launchApp", source: "browser", startAppType: 2, param: info(app) }); },
    function (app) { var m = info(app); m.type = "APPMessage"; m.MsgType = "appControl"; m.action = "startApp"; m.source = "launcher"; return send(m); },
    function (app) { var m = info(app); m.action = "launchapp"; return send(m); },
    function (app) { var m = info(app); m.type = "launchApp"; return send(m); },
    function (app) { return app.pkg ? send({ type: "APPMessage", MsgType: "appControl", action: "startApp", source: "browser", startAppType: 2, param: info(app, app.pkg) }) : false; },
    function (app) { window.location.href = app.url + "://"; return true; }
  ];

  var WAY_KEY = "cleanframe.launchways.v1";
  function savedWays() { try { return JSON.parse(window.localStorage.getItem(WAY_KEY) || "{}"); } catch (e) { return {}; } }
  function saveWay(name, i) {
    var w = savedWays();
    if (i == null) delete w[name]; else w[name] = i;
    try { window.localStorage.setItem(WAY_KEY, JSON.stringify(w)); } catch (e) {}
  }

  // Calls done(true) if the page goes to the background (another app opened).
  function waitForHandoff(ms, done) {
    var finished = false;
    function finish(ok) {
      if (finished) return;
      finished = true;
      document.removeEventListener("visibilitychange", onVis, false);
      window.removeEventListener("blur", onBlur, false);
      window.removeEventListener("pagehide", onBlur, false);
      clearTimeout(timer);
      done(ok);
    }
    function onVis() { if (document.hidden) finish(true); }
    function onBlur() { finish(true); }
    document.addEventListener("visibilitychange", onVis, false);
    window.addEventListener("blur", onBlur, false);
    window.addEventListener("pagehide", onBlur, false);
    var timer = setTimeout(function () { finish(false); }, ms);
  }

  var launching = false;

  function openApp(app) {
    if (app.web) { window.location.href = app.url; return; }
    if (launching) return;
    launching = true;

    var known = savedWays()[app.name];
    if (known != null && WAYS[known]) {
      toast("Opening " + app.label + "…", 2500);
      WAYS[known](app);
      waitForHandoff(3000, function (ok) {
        launching = false;
        if (!ok) { saveWay(app.name, null); toast(app.label + " didn't open. Press OK again to retry.", 5000); }
      });
      return;
    }

    var i = 0;
    (function tryNext() {
      while (i < WAYS.length) {
        var n = i++;
        toast("Finding how to open " + app.label + " on this TV… (" + (n + 1) + "/" + WAYS.length + ")", 2500);
        saveWay(app.name, n); // saved first, in case the app takes over before we hear back
        if (WAYS[n](app)) {
          waitForHandoff(2200, function (ok) {
            if (ok) { launching = false; return; }
            saveWay(app.name, null);
            tryNext();
          });
          return;
        }
        saveWay(app.name, null);
      }
      launching = false;
      if (app.webFallback) { window.location.href = app.webFallback; return; }
      toast("This TV won't let a web page open " + app.label + ". Use the " + app.label +
            " button on your remote, or press RED and send Claude a photo.", 9000);
    })();
  }

  // ---------- sheets: settings + TV check ----------

  var ROWS = [
    { key: "wallpaper", label: "Wallpaper" },
    { key: "every", label: "Change every" },
    { key: "clock", label: "Clock" },
    { key: "frame", label: "Hide dock after" },
    { key: "check", label: "TV check" },
    { key: "reset", label: "Reset to defaults" }
  ];
  var rowIndex = 0, sheet = null;

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
    if (r.key === "wallpaper" || r.key === "every") startWallpaper();
    if (r.key === "clock") tickClock();
    if (r.key === "frame") resetIdle();
    renderSettings();
  }

  function openSheet(name) {
    closeSheet();
    removeClass($("toast"), "on");
    sheet = name;
    if (name === "settings") { rowIndex = 0; renderSettings(); }
    if (name === "diag") $("diag-text").textContent = tvReport();
    addClass(stage, name === "settings" ? "settings-open" : "diag-open");
  }

  function closeSheet() {
    removeClass(stage, "settings-open");
    removeClass(stage, "diag-open");
    sheet = null;
  }

  function tvReport() {
    var out = [], names = [], k;
    function tryCall(fn) { try { return typeof window[fn] === "function" ? String(window[fn]()) : "-"; } catch (e) { return "error"; } }
    out.push("Screen " + window.innerWidth + "x" + window.innerHeight + " · " +
             ((navigator.userAgent.match(/Chrome\/[\d.]+/) || ["?"])[0]) + " · " + tryCall("Hisense_GetModelName") +
             " · " + tryCall("Hisense_GetFirmWareVersion"));
    try { for (k in window) { if (/hisense|omi|vidaa|hiutils/i.test(k)) names.push(k.replace(/^Hisense_/, "")); } } catch (e) {}
    out.push("Bridges: omi_platform " + (window.omi_platform ? "yes" : "no") + ", opera_omi " + (window.opera_omi ? "yes" : "no"));
    var bridgeKeys = [];
    try { for (k in (window.omi_platform || {})) bridgeKeys.push(k); } catch (e) {}
    out.push("omi_platform has: " + (bridgeKeys.join(", ") || "-"));
    var ways = savedWays(), wl = [];
    for (k in ways) wl.push(k + " → way " + (ways[k] + 1));
    out.push("Launch ways that worked: " + (wl.join(", ") || "none yet"));
    var list = readTvAppList();
    if (list) {
      var apps = [];
      for (var i = 0; i < list.length; i++) apps.push((list[i].AppName || list[i].Title) + " (" + list[i].Id + ")");
      out.push("Web tiles on this TV: " + apps.join(", "));
    }
    out.push("");
    out.push("TV functions (" + names.length + "): " + names.sort().join(", "));
    return out.join("\n");
  }

  // ---------- frame mode (idle) ----------

  var idleTimer = null, framed = false;

  function enterFrame() { closeSheet(); framed = true; addClass(stage, "frame"); }
  function leaveFrame() { framed = false; removeClass(stage, "frame"); }
  function resetIdle() {
    clearTimeout(idleTimer);
    var mins = parseInt(settings.frame, 10);
    if (mins > 0) idleTimer = setTimeout(enterFrame, mins * 60000);
  }

  // ---------- back to the Hisense home screen ----------

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

    if (framed) { leaveFrame(); ev.preventDefault(); return; } // first press only wakes

    if (isBack(code)) {
      ev.preventDefault();
      if (sheet) closeSheet(); else exitApp();
      return;
    }
    if (code === KEY.BLUE) { ev.preventDefault(); sheet === "settings" ? closeSheet() : openSheet("settings"); return; }
    if (code === KEY.RED) { ev.preventDefault(); sheet === "diag" ? closeSheet() : openSheet("diag"); return; }
    if (code === KEY.YELLOW) { ev.preventDefault(); enterFrame(); return; }

    if (sheet === "diag") return;
    if (sheet === "settings") {
      if (code === KEY.UP) rowIndex = (rowIndex - 1 + ROWS.length) % ROWS.length;
      else if (code === KEY.DOWN) rowIndex = (rowIndex + 1) % ROWS.length;
      else if (code === KEY.LEFT) changeSetting(-1);
      else if (code === KEY.RIGHT) changeSetting(1);
      else if (code === KEY.OK) {
        var key = ROWS[rowIndex].key;
        if (key === "check") { openSheet("diag"); ev.preventDefault(); return; }
        if (key === "reset") { settings = defaults(); save(); startWallpaper(); tickClock(); resetIdle(); }
        else changeSetting(1);
      } else return;
      ev.preventDefault();
      renderSettings();
      return;
    }

    if (zone === "dock") {
      if (code === KEY.LEFT) tileIndex = Math.max(0, tileIndex - 1);
      else if (code === KEY.RIGHT) tileIndex = Math.min(tiles.length - 1, tileIndex + 1);
      else if (code === KEY.UP) { zone = "top"; iconIndex = icons.length - 1; }
      else if (code === KEY.OK && tiles[tileIndex]) openApp(tiles[tileIndex].app);
      else return;
    } else {
      if (code === KEY.LEFT) iconIndex = Math.max(0, iconIndex - 1);
      else if (code === KEY.RIGHT) iconIndex = Math.min(icons.length - 1, iconIndex + 1);
      else if (code === KEY.DOWN) zone = "dock";
      else if (code === KEY.OK) runIcon(icons[iconIndex].act);
      else return;
    }
    ev.preventDefault();
    paintFocus();
  }, false);

  // Coming back from an app: wake up and show the dock again.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { leaveFrame(); resetIdle(); tickClock(); }
  }, false);

  // ---------- start ----------

  window.addEventListener("resize", fit, false);
  fit();
  buildDock();
  paintFocus();
  tickClock();
  startWallpaper();
  resetIdle();
  setInterval(tickClock, 5000);
})();
