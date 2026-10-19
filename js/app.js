/* Velto page logic: state, scroll animations, booking pop-up, footer. */
var OHM_IMAGES = [
  "assets/hero/us-1.jpg",
  "assets/hero/us-2.jpg",
  "assets/hero/us-3.jpg",
  "assets/hero/us-4.jpg",
  "assets/hero/us-5.jpg",
  "assets/hero/us-6.jpg",
  "assets/hero/us-7.jpg"
];
var OHM_IMAGES_EU = [
  "assets/hero/eu-1.jpg",
  "assets/hero/eu-2.jpg",
  "assets/hero/eu-3.jpg",
  "assets/hero/eu-4.jpg",
  "assets/hero/eu-5.jpg",
  "assets/hero/eu-6.jpg",
  "assets/hero/eu-7.jpg"
];
// Block 05 · fleet cards. Specs and prices are placeholders: [range, acceleration, price per day].
var VL_FLEET = [
  { img: "assets/fleet/model-s-long-range.jpg", bg: "#9BDABB", name: "Tesla Model S", trim: "Long Range", meta: "Sedan · 5 seats", alt: "Red Tesla Model S on a mint background", away: ["0.4 mi", "0.6 km"], pos: 58.5, us: ["405 mi", "0–60 in 3.1 s", "$139"], eu: ["634 km", "0–100 in 3.2 s", "€129"] },
  { img: "assets/fleet/model-s-plaid.jpg", bg: "#C4A4D5", name: "Tesla Model S", trim: "Plaid", meta: "Sedan · 5 seats", alt: "White Tesla Model S on a lilac background", away: ["1.2 mi", "1.9 km"], pos: 71.8, us: ["359 mi", "0–60 in 1.99 s", "$169"], eu: ["600 km", "0–100 in 2.1 s", "€159"] },
  { img: "assets/fleet/model-3-long-range.jpg", bg: "#E29BA9", name: "Tesla Model 3", trim: "Long Range AWD", meta: "Sedan · 5 seats", alt: "Graphite Tesla Model 3 on a pink background", away: ["0.8 mi", "1.3 km"], pos: 66.9, us: ["341 mi", "0–60 in 4.2 s", "$85"], eu: ["629 km", "0–100 in 4.4 s", "€79"] },
  { img: "assets/fleet/model-y-long-range.jpg", bg: "#F2A788", name: "Tesla Model Y", trim: "Long Range AWD", meta: "SUV · 5 seats", alt: "Blue Tesla Model Y on a peach background", away: ["2.1 mi", "3.4 km"], pos: 86.3, us: ["327 mi", "0–60 in 4.6 s", "$89"], eu: ["568 km", "0–100 in 4.8 s", "€85"] },
  { img: "assets/fleet/model-3-performance.jpg", bg: "#88A787", name: "Tesla Model 3", trim: "Performance", meta: "Sedan · 5 seats", alt: "White Tesla Model 3 on a green background", away: ["3.5 mi", "5.6 km"], pos: 79.8, us: ["296 mi", "0–60 in 2.9 s", "$109"], eu: ["528 km", "0–100 in 3.1 s", "€99"] },
  { img: "assets/fleet/model-y-performance.jpg", bg: "#EEDF78", name: "Tesla Model Y", trim: "Performance", meta: "SUV · 5 seats", alt: "Black Tesla Model Y on a yellow background", away: ["1.6 mi", "2.6 km"], pos: 54.8, us: ["306 mi", "0–60 in 3.3 s", "$115"], eu: ["580 km", "0–100 in 3.5 s", "€105"] }
];
// Booking pop-up: default state, prices of extras, and a YYYY-MM-DD helper (local time).
var VL_BK0 = { open: false, i: 0, days: 3, date: "", del: false, seat: false, drv: false, sent: false };
var VL_FEES = { delivery: 25, seat: 8, driver: 10 };
function vlISO(offset) {
  var d = new Date(); d.setDate(d.getDate() + offset);
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
// Footer halftone: dots warm toward the card pastels as the pointer pushes them.
var VL_PASTELS = ["#AE9ECF", "#B1CDE3", "#B1DEC1", "#F3BF9D", "#F6E398", "#E6ACAB"];
function vlHex(h) {
  var m = /^#?([0-9a-f]{6})$/i.exec(h || "");
  if (!m) return [255, 255, 255];
  return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
}
// Cities for the header picker. All prices are in euro.
var VL_CITIES = [
  ["Berlin", "Germany"], ["Munich", "Germany"], ["Amsterdam", "Netherlands"], ["Paris", "France"],
  ["Warsaw", "Poland"], ["Vienna", "Austria"], ["Milan", "Italy"], ["Barcelona", "Spain"]
];
var OHM_SLICES = 16, OHM_CAMERA = 1.6, OHM_MAX_WIDTH = 55, OHM_ASPECT = 1.7917, OHM_GAP = 6, OHM_FADE = 12;

function ohmArc(bend) {
  return (OHM_CAMERA - 1 + Math.cos(bend)) / (2 * OHM_CAMERA * Math.sin(bend));
}
function ohmMeasure(width, height, tile, bend) {
  var h = Math.min((tile / 100) * height, ((OHM_MAX_WIDTH / 100) * width) / OHM_ASPECT);
  var radius = width * ohmArc(bend);
  if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0 };
  var deg = function (r) { return (r * 180) / Math.PI; };
  var unit = deg(h / radius);
  var pitch = (OHM_ASPECT + OHM_GAP / 100) * unit;
  var limit = deg(bend) + (OHM_ASPECT * unit) / 2;
  var columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
  return { columns: columns, sweep: +((columns * pitch) / 2).toFixed(4), unit: +unit.toFixed(4) };
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { w: 1440, h: 900, shown: {}, region: "eu", city: "Berlin", locOpen: false };
    var self = this;
    this.setHero = function (el) {
      if (self.ro) { self.ro.disconnect(); self.ro = null; }
      if (!el || typeof ResizeObserver === "undefined") return;
      self.ro = new ResizeObserver(function (entries) {
        var r = entries[0].contentRect;
        if (Math.abs(r.width - self.state.w) > 1 || Math.abs(r.height - self.state.h) > 1) {
          self.setState({ w: r.width, h: r.height, shown: {} });
        }
      });
      self.ro.observe(el);
    };
    this.pickUS = function () { self.setState({ region: "us" }); };
    this.pickEU = function () { self.setState({ region: "eu" }); };
    this.setDrive = function (el) { self.driveEl = el; };
    this.setTrack = function (el) { self.trackEl = el; };
    this.setCar = function (el) { self.carEl = el; };
    this.setWheelF = function (el) { self.wheelF = el; };
    this.setWheelR = function (el) { self.wheelR = el; };
    this.setPre = function (el) { self.preEl = el; };
    this.setPreNum = function (el) { self.preNum = el; };
    this.setPreFill = function (el) { self.preFill = el; };
    this.setPreLabel = function (el) { self.preLabel = el; };
    // Block 04: the video plays only while on screen; the timecode follows playback.
    this.setTimecode = function (el) { self.tcEl = el; if (el && self.tickOffer) self.tickOffer(); };
    // Block 05: fleet carousel, arrows scroll by one card.
    this.setFleet = function (el) { self.fleetEl = el; };
    this.fleetBy = function (dir) {
      var el = self.fleetEl;
      if (!el) return;
      var card = el.querySelector(".vl-car");
      var step = card ? card.offsetWidth + 12 : el.clientWidth * 0.8;
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    };
    this.fleetPrev = function () { self.fleetBy(-1); };
    // Booking pop-up: opened by a fleet card's Book now, closed by the X, the frosted backdrop or Esc.
    this.bkSet = function (patch) { self.setState({ bk: Object.assign({}, (self.state && self.state.bk) || VL_BK0, patch) }); };
    // Two steps: first fill the pop-up with the chosen car while it is still hidden,
    // then open it two frames later so the fade and lift run cleanly.
    this.openBooking = function (i) {
      self.bkSet({ open: false, i: i, sent: false });
      document.documentElement.style.overflow = "hidden";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          self.bkSet({ open: true });
          setTimeout(function () { var x = document.querySelector(".vl-bk-x"); if (x && x.focus) x.focus({ preventScroll: true }); }, 450);
        });
      });
    };
    // Scroll reveal. Marks blocks with data attributes (not classes, so re-renders leave them alone),
    // fades each in once it enters the screen, then removes the marks so hovers work as before.
    this.rvStill = function () { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); };
    this.rvDone = function (el, d) {
      setTimeout(function () { el.removeAttribute("data-rv"); el.removeAttribute("data-rv-in"); el.style.removeProperty("--rv-d"); }, (d + 1.3) * 1000);
    };
    this.rvMark = function (el, kind, d) {
      if (!el || el.hasAttribute("data-rv")) return false;
      el.setAttribute("data-rv", kind || "up");
      if (d) el.style.setProperty("--rv-d", d.toFixed(2) + "s");
      return true;
    };
    this.revealSetup = function () {
      if (self.rvIO || self.rvStill() || typeof IntersectionObserver === "undefined") return;
      var h1 = document.querySelector("h1");
      var hero = h1 && h1.closest ? h1.closest("section") : null;
      if (hero && !self.heroShown) {
        var hs = hero.querySelectorAll("p, h1, a");
        for (var k = 0; k < hs.length; k++) self.rvMark(hs[k], "up", k * 0.08);
        self.heroEls = hs;
      }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          io.unobserve(el);
          el.setAttribute("data-rv-in", "");
          self.rvDone(el, parseFloat(el.style.getPropertyValue("--rv-d")) || 0);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      self.rvIO = io;
      var groups = [
        { sel: "#what-we-do h2", step: 0 },
        { sel: "#what-we-do figure", step: 0.1 },
        { sel: ".ohm-drive-intro h2, .ohm-drive-intro p, .ohm-drive-intro a", step: 0.06 },
        { sel: "#video > div", kind: "scale" },
        { sel: "#video .vl-video-copy > *", step: 0.08 },
        { sel: "#fleet > div:first-child p, #fleet h2, #fleet > div:first-child > span", step: 0.08 },
        { sel: "#fleet .vl-car", grid: true },
        { sel: "#reviews > div:first-child > *", step: 0.08 },
        { sel: "#reviews .vl-rev", grid: true }
      ];
      groups.forEach(function (g) {
        var els = document.querySelectorAll(g.sel);
        for (var i = 0; i < els.length; i++) {
          var d = g.grid ? (i % 2) * 0.12 : i * (g.step || 0);
          if (self.rvMark(els[i], g.kind, d)) io.observe(els[i]);
        }
      });
    };
    this.revealHero = function () {
      self.heroShown = true;
      var hs = self.heroEls;
      if (!hs) return;
      requestAnimationFrame(function () {
        for (var k = 0; k < hs.length; k++) {
          hs[k].setAttribute("data-rv-in", "");
          self.rvDone(hs[k], parseFloat(hs[k].style.getPropertyValue("--rv-d")) || 0);
        }
      });
    };
    // Footer: the header logo is drawn into a mask, then printed as halftone dots that part
    // around the pointer on springs and ripple out from a click.
    this.setFoot = function (el) { self.footEl = el; };
    this.setFootCanvas = function (el) { self.footCv = el; };
    this.footTop = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
    this.footInit = function () {
      var root = self.footEl, canvas = self.footCv;
      if (!root || !canvas || self.foot) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      var reduced = self.rvStill();
      var BG = "#121212", INK = vlHex("#E7E8E6"), WARM = VL_PASTELS.map(vlHex);
      var GAP = 6, RADIUS = 270, CROP = 0.22, S = 8;
      var st = { w: 0, h: 0, dpr: 1, px: -1e5, py: -1e5, raf: 0, visible: true, awake: true, ring: { x: 0, y: 0, t: -1 }, dots: new Float32Array(0), count: 0, grain: null };
      self.foot = st;
      var layout = function () {
        var rect = root.getBoundingClientRect();
        st.w = Math.max(1, Math.round(rect.width));
        st.h = Math.max(1, Math.round(rect.height));
        st.dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(st.w * st.dpr);
        canvas.height = Math.round(st.h * st.dpr);
        var logo = document.querySelector(".vl-logo svg");
        var paths = logo ? logo.querySelectorAll("path") : [];
        var vb = logo && logo.viewBox && logo.viewBox.baseVal && logo.viewBox.baseVal.width ? logo.viewBox.baseVal : { x: 0, y: 0, width: 331, height: 55 };
        var mask = document.createElement("canvas");
        mask.width = st.w; mask.height = st.h;
        var m = mask.getContext("2d", { willReadFrequently: true });
        if (!m) return;
        var sc = (st.w * 0.96) / vb.width;
        var lh = vb.height * sc;
        m.setTransform(sc, 0, 0, sc, (st.w - vb.width * sc) / 2 - vb.x * sc, st.h - lh * (1 - CROP) - vb.y * sc);
        m.fillStyle = "#000";
        for (var p = 0; p < paths.length; p++) { var d = paths[p].getAttribute("d"); if (d) m.fill(new Path2D(d)); }
        var img = m.getImageData(0, 0, st.w, st.h).data;
        var cols = Math.ceil(st.w / GAP), rows = Math.ceil(st.h / GAP), tmp = [];
        for (var gy = 0; gy < rows; gy++) {
          for (var gx = 0; gx < cols; gx++) {
            var sum = 0;
            for (var sy = 0; sy < 3; sy++) {
              for (var sx = 0; sx < 3; sx++) {
                var X = Math.min(st.w - 1, Math.floor(gx * GAP + ((sx + 0.5) * GAP) / 3));
                var Y = Math.min(st.h - 1, Math.floor(gy * GAP + ((sy + 0.5) * GAP) / 3));
                sum += img[(Y * st.w + X) * 4 + 3];
              }
            }
            var cov = sum / (9 * 255);
            if (cov < 0.06) continue;
            var hx = gx * GAP + GAP / 2, hy = gy * GAP + GAP / 2;
            tmp.push(hx, hy, 0, 0, hx, hy, Math.sqrt(Math.min(1, cov)) * GAP * 0.56, Math.min(WARM.length - 1, Math.floor((hx / st.w) * WARM.length)));
          }
        }
        st.dots = new Float32Array(tmp);
        st.count = tmp.length / S;
        st.grain = document.createElement("canvas");
        st.grain.width = st.grain.height = 256;
        var g = st.grain.getContext("2d");
        if (g) {
          var id = g.createImageData(256, 256);
          for (var i = 0; i < id.data.length; i += 4) {
            var v = Math.random() * 255;
            id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
            id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
          }
          g.putImageData(id, 0, 0);
        }
        st.awake = true;
      };
      var draw = function (now) {
        ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, st.w, st.h);
        var r = reduced ? 0 : RADIUS;
        var age = st.ring.t < 0 ? 1e9 : now - st.ring.t, ringR = age * 0.9, moving = false, D = st.dots;
        for (var i = 0; i < st.count; i++) {
          var j = i * S, x = D[j], y = D[j + 1], vx = D[j + 2], vy = D[j + 3], hx = D[j + 4], hy = D[j + 5];
          if (!reduced) {
            if (age < 900) {
              var rx = hx - st.ring.x, ry = hy - st.ring.y, rd = Math.sqrt(rx * rx + ry * ry) + 0.001;
              var band = 1 - Math.min(1, Math.abs(rd - ringR) / 26);
              if (band > 0) { var f0 = band * 3.2 * (1 - age / 900); vx += (rx / rd) * f0; vy += (ry / rd) * f0; }
            }
            var dx = x - st.px, dy = y - st.py, d2 = dx * dx + dy * dy;
            if (r > 0 && d2 < r * r) { var dd = Math.sqrt(d2) + 0.001, f = (1 - dd / r) * 2.6; vx += (dx / dd) * f; vy += (dy / dd) * f; }
            vx = (vx + (hx - x) * 0.05) * 0.84;
            vy = (vy + (hy - y) * 0.05) * 0.84;
            x += vx; y += vy;
            if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moving = true;
            else { x = hx; y = hy; vx = 0; vy = 0; }
            D[j] = x; D[j + 1] = y; D[j + 2] = vx; D[j + 3] = vy;
          }
          var k = Math.min(1, Math.hypot(x - hx, y - hy) / 48);
          if (k > 0.02) {
            var W = WARM[D[j + 7]];
            ctx.fillStyle = "rgb(" + Math.round(INK[0] + (W[0] - INK[0]) * k) + "," + Math.round(INK[1] + (W[1] - INK[1]) * k) + "," + Math.round(INK[2] + (W[2] - INK[2]) * k) + ")";
          } else ctx.fillStyle = "#E7E8E6";
          ctx.beginPath();
          ctx.arc(x, y, D[j + 6], 0, 6.2832);
          ctx.fill();
        }
        if (st.grain) {
          ctx.globalAlpha = 0.05;
          ctx.globalCompositeOperation = "overlay";
          var pat = ctx.createPattern(st.grain, "repeat");
          if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, st.w, st.h); }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        st.awake = moving || age < 900 || st.px > -1e4;
      };
      var loop = function (now) { st.raf = 0; if (!st.visible) return; draw(now); if (st.awake) st.raf = requestAnimationFrame(loop); };
      var wake = function () { st.awake = true; if (!st.raf && st.visible) st.raf = requestAnimationFrame(loop); };
      var local = function (e) { var b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      st.onMove = function (e) { var p = local(e); st.px = p[0]; st.py = p[1]; wake(); };
      st.onLeave = function () { st.px = -1e5; st.py = -1e5; wake(); };
      st.onDown = function (e) {
        if (reduced || (e.target && e.target.closest && e.target.closest("a,button"))) return;
        var p = local(e); st.ring = { x: p[0], y: p[1], t: performance.now() }; wake();
      };
      layout();
      draw(performance.now());
      wake();
      root.addEventListener("pointermove", st.onMove);
      root.addEventListener("pointerleave", st.onLeave);
      root.addEventListener("pointerdown", st.onDown);
      if (typeof ResizeObserver !== "undefined") {
        var lastW = 0;
        st.ro = new ResizeObserver(function () { var cw = Math.round(root.getBoundingClientRect().width); if (cw === lastW) return; lastW = cw; layout(); wake(); });
        st.ro.observe(root);
      }
      if (typeof IntersectionObserver !== "undefined") {
        st.io = new IntersectionObserver(function (es) { st.visible = es[0] ? es[0].isIntersecting : true; if (st.visible) wake(); });
        st.io.observe(root);
      }
    };
    this.footStop = function () {
      var st = self.foot;
      if (!st) return;
      cancelAnimationFrame(st.raf);
      if (st.ro) st.ro.disconnect();
      if (st.io) st.io.disconnect();
      if (self.footEl) {
        self.footEl.removeEventListener("pointermove", st.onMove);
        self.footEl.removeEventListener("pointerleave", st.onLeave);
        self.footEl.removeEventListener("pointerdown", st.onDown);
      }
      self.foot = null;
    };
    this.bkClose = function () { self.bkSet({ open: false }); document.documentElement.style.overflow = ""; };
    this.bkLess = function () { var b = (self.state && self.state.bk) || VL_BK0; self.bkSet({ days: Math.max(1, b.days - 1) }); };
    this.bkMore = function () { var b = (self.state && self.state.bk) || VL_BK0; self.bkSet({ days: Math.min(30, b.days + 1) }); };
    this.bkDate = function (e) { self.bkSet({ date: e && e.target ? e.target.value : "" }); };
    this.bkSelf = function () { self.bkSet({ del: false }); };
    this.bkDeliver = function () { self.bkSet({ del: true }); };
    this.bkSeat = function () { var b = (self.state && self.state.bk) || VL_BK0; self.bkSet({ seat: !b.seat }); };
    this.bkDriver = function () { var b = (self.state && self.state.bk) || VL_BK0; self.bkSet({ drv: !b.drv }); };
    this.bkSubmit = function (e) { if (e && e.preventDefault) e.preventDefault(); self.bkSet({ sent: true }); };
    this.onKey = function (e) {
      if (e.key !== "Escape") return;
      if (self.state && self.state.locOpen) self.setState({ locOpen: false });
      if (self.state && self.state.menuOpen) self.menuClose();
      if (self.state && self.state.bk && self.state.bk.open) self.bkClose();
    };
    // City picker: opens a small list under the pin button, closes on pick, outside click or Esc.
    // Mobile menu: logo and burger stay on top; links, city and Select a car live in the panel.
    this.menuToggle = function () {
      var open = !(self.state && self.state.menuOpen);
      self.setState({ menuOpen: open });
      document.documentElement.style.overflow = open ? "hidden" : "";
    };
    this.menuClose = function () {
      if (!(self.state && self.state.menuOpen)) return;
      self.setState({ menuOpen: false });
      document.documentElement.style.overflow = "";
    };
    this.locToggle = function () { self.setState({ locOpen: !(self.state && self.state.locOpen) }); };
    this.pickCity = function (name) { self.setState({ city: name, locOpen: false }); };
    this.onDocDown = function (e) {
      if (!self.state || !self.state.locOpen) return;
      if (e.target && e.target.closest && e.target.closest(".vl-loc")) return;
      self.setState({ locOpen: false });
    };
    this.fleetNext = function () { self.fleetBy(1); };
    this.setVideo = function (el) {
      if (self.vidIO) { self.vidIO.disconnect(); self.vidIO = null; }
      if (self.vidEl && self.onVidTime) self.vidEl.removeEventListener("timeupdate", self.onVidTime);
      self.vidEl = el;
      if (!el) return;
      el.muted = true; el.defaultMuted = true; el.playsInline = true;
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      self.onVidTime = function () {
        var s = Math.floor(el.currentTime || 0);
      };
      el.addEventListener("timeupdate", self.onVidTime);
      var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still) { el.removeAttribute("autoplay"); el.pause(); return; }
      var play = function () { var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); };
      if (typeof IntersectionObserver === "undefined") { play(); return; }
      self.vidIO = new IntersectionObserver(function (es) { if (es[0].isIntersecting) play(); else el.pause(); }, { threshold: 0.1 });
      self.vidIO.observe(el);
    };
    // Preloader: a battery charging from 0 to 100 %. It waits for the page to load,
    // runs at least ~2.2 s so the charge reads, then fades away.
    this.runPreloader = function () {
      var pre = self.preEl;
      if (!pre) return;
      var root = document.documentElement;
      var prevOverflow = root.style.overflow;
      root.style.overflow = "hidden";
      var start = performance.now();
      var loaded = document.readyState === "complete";
      var onLoad = function () { loaded = true; };
      window.addEventListener("load", onLoad);
      self.preSafety = setTimeout(onLoad, 6000);
      var pct = 0;
      var paint = function () {
        var n = Math.floor(pct);
        if (self.preNum) self.preNum.textContent = String(n);
        if (self.preFill) self.preFill.style.height = pct.toFixed(2) + "%";
      };
      var step = function (now) {
        var k = Math.min(1, (now - start) / 2200);
        var target = (1 - Math.pow(1 - k, 3)) * 100;
        if (!loaded) target = Math.min(target, 90);
        pct += (target - pct) * 0.14;
        if (loaded && k >= 1 && pct > 99.4) pct = 100;
        paint();
        if (pct < 100) { self.preRaf = requestAnimationFrame(step); return; }
        if (self.preLabel) self.preLabel.textContent = "Ready";
        window.removeEventListener("load", onLoad);
        clearTimeout(self.preSafety);
        self.preHide = setTimeout(function () {
          pre.classList.add("is-done");
          self.revealHero();
          root.style.overflow = prevOverflow;
          self.preGone = setTimeout(function () { pre.style.display = "none"; self.updateDrive(); }, 850);
        }, 380);
      };
      self.preRaf = requestAnimationFrame(step);
    };
    // Block 03: the dark panel pins, vertical scroll slides its content sideways,
    // and the car drives along its top edge with wheels turning by distance travelled.
    this.updateDrive = function () {
      var d = self.driveEl, tr = self.trackEl, car = self.carEl;
      if (!d || !tr || !car || !tr.parentElement) return;
      // ?static: the dark panel sits in the flow without the pin, car in the middle of its strip.
      if (self.isStatic) {
        d.style.height = "auto";
        if (d.firstElementChild) { d.firstElementChild.style.position = "relative"; d.firstElementChild.style.top = "0"; }
      }
      // Phones: no pin and no sideways scroll; the car simply stands in the middle of its strip.
      if (window.innerWidth <= 860 || self.isStatic) {
        if (d.style.height && !self.isStatic) d.style.height = "";
        tr.style.transform = "none";
        car.style.transform = "translate3d(" + ((d.clientWidth - car.offsetWidth) / 2).toFixed(1) + "px,0,0)";
        if (self.wheelF) self.wheelF.style.transform = "none";
        if (self.wheelR) self.wheelR.style.transform = "none";
        return;
      }
      var vh = window.innerHeight;
      var view = tr.parentElement.clientWidth;
      var pin = d.firstElementChild;
      var pinH = pin ? pin.offsetHeight : vh;
      // The panel pins once its bottom edge meets the bottom of the screen.
      var stickTop = pin ? (parseFloat(getComputedStyle(pin).top) || 0) : 0;
      var dist = Math.max(0, tr.scrollWidth - view);
      var want = Math.round(pinH + dist) + "px";
      if (d.style.height !== want) d.style.height = want;
      var r = d.getBoundingClientRect();
      var p = dist > 0 ? Math.min(1, Math.max(0, (stickTop - r.top) / dist)) : 0;
      tr.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px,0,0)";
      var cw = car.offsetWidth;
      // Starts almost fully hidden behind the left edge: only the nose peeks in.
      // Ends mostly past the right edge: only the back half of the rear stays in view.
      var x0 = -cw * 0.82, x1 = Math.max(x0, view - cw * 0.22);
      // The drive starts when the dark panel's top edge appears at the bottom of the screen.
      var stripH = pin && pin.firstElementChild ? pin.firstElementChild.offsetHeight : 0;
      var startTop = vh - stripH;
      // Where the car stands when the sideways scroll ends: centred over the "Charging included" card.
      var mark = tr.querySelector(".vl-c5");
      var xMid = mark ? (mark.offsetLeft - dist + mark.offsetWidth / 2 - cw / 2) : (x0 + x1) / 2;
      xMid = Math.min(x1, Math.max(x0, xMid));
      var pinEnd = stickTop - dist;
      var x;
      if (r.top >= pinEnd) {
        // Phase 1: from the left edge to the card while the panel is pinned.
        var qa = Math.min(1, Math.max(0, (startTop - r.top) / Math.max(1, startTop - pinEnd)));
        x = x0 + qa * (xMid - x0);
      } else {
        // Phase 2: vertical scroll resumes and the car speeds up and drives off the right edge,
        // leaving the screen about when its strip scrolls off the top and the video block comes up.
        var xOut = view + cw * 0.04;
        var span = Math.max(220, stickTop + stripH * 0.6);
        var qb = Math.min(1, Math.max(0, (pinEnd - r.top) / span));
        x = xMid + (0.3 * qb + 0.7 * qb * qb) * (xOut - xMid);
      }
      car.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      var radius = Math.max(1, cw * 0.15632 / 2);
      var ang = ((x - x0) / radius) * 180 / Math.PI;
      if (self.wheelF) self.wheelF.style.transform = "rotate(" + ang.toFixed(1) + "deg)";
      if (self.wheelR) self.wheelR.style.transform = "rotate(" + ang.toFixed(1) + "deg)";
    };
    this.onScroll = function () {
      var y = window.scrollY || (document.scrollingElement && document.scrollingElement.scrollTop) || 0;
      var on = y > 8;
      if (on !== !!(self.state && self.state.scrolled)) self.setState({ scrolled: on });
      if (!self.raf) {
        self.raf = requestAnimationFrame(function () { self.raf = 0; self.updateDrive(); });
      }
    };
  }

  componentDidMount() {
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll);
    this.onScroll();
    var self = this;
    this.driveTimer = setTimeout(function () { self.updateDrive(); }, 400);
    // ?static: no preloader and no scroll reveals, so every block is visible at once
    // (for importing the page into Figma or taking full-page screenshots).
    var isStatic = /[?&]static\b/.test(window.location.search);
    if (isStatic) {
      this.isStatic = true;
      if (this.preEl) this.preEl.style.display = "none";
      var imgs = document.querySelectorAll("img[loading]");
      for (var q = 0; q < imgs.length; q++) imgs[q].loading = "eager";
      this.updateDrive();
    } else {
      this.revealSetup();
      this.runPreloader();
      if (!this.preEl) this.revealHero();
    }
    // Offer countdown: time left until midnight, visitor's local time, updated every second.
    var two = function (n) { return (n < 10 ? "0" : "") + n; };
    this.tickOffer = function () {
      if (!self.tcEl) return;
      var now = new Date(), end = new Date(now.getTime());
      end.setHours(24, 0, 0, 0);
      var s = Math.max(0, Math.floor((end - now) / 1000));
      self.tcEl.textContent = two(Math.floor(s / 3600)) + ":" + two(Math.floor(s / 60) % 60) + ":" + two(s % 60);
    };
    this.tickOffer();
    this.offerTimer = setInterval(this.tickOffer, 1000);
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("pointerdown", this.onDocDown);
    this.footInit();
  }

  componentWillUnmount() {
    if (this.ro) this.ro.disconnect();
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onScroll);
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.driveTimer);
    if (this.preRaf) cancelAnimationFrame(this.preRaf);
    clearTimeout(this.preSafety); clearTimeout(this.preHide); clearTimeout(this.preGone);
    if (this.vidIO) this.vidIO.disconnect();
    clearInterval(this.offerTimer);
    window.removeEventListener("keydown", this.onKey);
    if (this.rvIO) this.rvIO.disconnect();
    this.footStop();
    document.removeEventListener("pointerdown", this.onDocDown);
    if (this.vidEl && this.onVidTime) this.vidEl.removeEventListener("timeupdate", this.onVidTime);
    document.documentElement.style.overflow = "";
  }

  renderVals() {
    var self = this;
    var speed = this.props.speed ?? 5;
    var curve = this.props.curve ?? 68;
    var th = this.props.tileHeight ?? 23;
    var axis = this.props.axis ?? 56;
    var st = this.state || { w: 1440, h: 900, shown: {}, region: "eu", city: "Berlin", locOpen: false };
    var shown = st.shown || {};

    var bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;
    var L = ohmMeasure(st.w, st.h, th, bend);
    var r = 100 * ohmArc(bend);
    var radius = (+r.toFixed(3)) + "cqw";
    var u = function (n) {
      return "calc(" + (+n.toFixed(4)) + " * min(" + th + "cqh, " + (+(OHM_MAX_WIDTH / OHM_ASPECT).toFixed(4)) + "cqw))";
    };
    var turn = function (d) {
      return "translateZ(" + radius + ") rotateY(" + (+d.toFixed(4)) + "deg) translateZ(-" + radius + ")";
    };
    var share = OHM_ASPECT / OHM_SLICES;
    var duration = L.columns * speed;
    var mask = "linear-gradient(90deg,transparent,#000 " + OHM_FADE + "%,#000 " + (100 - OHM_FADE) + "%,transparent)";

    var tiles = [];
    for (var t = 0; t < L.columns; t++) {
      (function (t) {
        var first = L.columns - 1 - t;
        var set = OHM_IMAGES_EU;
        var idx = (shown[t] ?? first) % set.length;
        var src = set[idx];
        var slices = [];
        for (var k = 0; k < OHM_SLICES; k++) {
          var radiusCss = k === 0 ? "14px 0 0 14px" : (k === OHM_SLICES - 1 ? "0 14px 14px 0" : "0");
          slices.push({
            src: src,
            style: {
              position: "absolute", top: 0, overflow: "hidden", background: "#eef0ee",
              left: u((OHM_ASPECT - share) / 2),
              width: k === OHM_SLICES - 1 ? u(share) : "calc(" + u(share) + " + 1px)",
              height: u(1),
              borderRadius: radiusCss,
              transform: turn((OHM_ASPECT / 2 - (k + 0.5) * share) * L.unit)
            },
            imgStyle: {
              position: "absolute", top: 0, maxWidth: "none", objectFit: "cover", userSelect: "none",
              left: u(-k * share), width: u(OHM_ASPECT), height: u(1)
            }
          });
        }
        tiles.push({
          slices: slices,
          style: {
            position: "absolute", transformStyle: "preserve-3d",
            left: "calc(50% - " + u(OHM_ASPECT / 2) + ")",
            top: "calc(" + axis + "% - " + u(0.5) + ")",
            width: u(OHM_ASPECT), height: u(1),
            "--ohm-r": radius, "--ohm-sweep": L.sweep,
            animation: "ohm-orbit " + duration + "s linear " + (-t * speed) + "s infinite"
          },
          onIter: function (e) {
            var lap = Math.round(e.elapsedTime / duration);
            var next = lap * L.columns + first;
            if ((self.state.shown || {})[t] === next) return;
            var s = Object.assign({}, self.state.shown || {});
            s[t] = next;
            self.setState({ shown: s });
          }
        });
      })(t);
    }

    var pill = function (on) {
      return {
        border: 0, cursor: "pointer", borderRadius: "999px", padding: "5px 10px",
        fontFamily: "inherit", fontWeight: 500, fontSize: "12px", letterSpacing: "0.0625em",
        background: on ? "#121212" : "transparent", color: on ? "#ffffff" : "#5f6366"
      };
    };
    // Europe only: prices in euro, distances in km.
    var us = false;
    var city = st.city || "Berlin";

    // Booking pop-up values for the chosen car.
    var bs = st.bk || VL_BK0;
    var bc = VL_FLEET[bs.i] || VL_FLEET[0];
    var bv = us ? bc.us : bc.eu;
    var cur = bv[2].charAt(0);
    var perDay = parseInt(bv[2].replace(/[^0-9]/g, ""), 10) || 0;
    var money = function (n) { return cur + n.toLocaleString("en-US"); };
    var bDays = bs.days;
    var bBase = perDay * bDays;
    var bTotal = bBase + (bs.del ? VL_FEES.delivery : 0) + (bs.seat ? VL_FEES.seat * bDays : 0) + (bs.drv ? VL_FEES.driver * bDays : 0);
    var bDate = bs.date || vlISO(1);
    var bStart = new Date(bDate + "T12:00:00");
    if (isNaN(bStart.getTime())) bStart = new Date();
    var bEnd = new Date(bStart.getTime() + bDays * 86400000);
    var shortD = function (d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
    var carC = ((bc.pos / 100) * 0.5417 + 0.625) / 1.7917;
    var thumbPos = Math.max(0, Math.min(100, ((carC * 1.7917 - 0.4) / 0.9917) * 100));
    var rowOn = { display: "flex" }, rowOff = { display: "none" };
    var bkVals = {
      name: bc.name, trim: bc.trim + " · " + bc.meta, away: (us ? bc.away[0] : bc.away[1]) + " away",
      img: bc.img, imgStyle: { objectPosition: "50% " + thumbPos.toFixed(1) + "%" }, thumbStyle: { background: bc.bg },
      days: bDays, dayWord: bDays === 1 ? "day" : "days", range: shortD(bStart) + " – " + shortD(bEnd),
      date: bDate, min: vlISO(0), price: bv[2], base: money(bBase), total: money(bTotal),
      delFee: money(VL_FEES.delivery), seatFee: money(VL_FEES.seat), drvFee: money(VL_FEES.driver),
      seatTotal: money(VL_FEES.seat * bDays), drvTotal: money(VL_FEES.driver * bDays),
      selfPressed: bs.del ? "false" : "true", delPressed: bs.del ? "true" : "false",
      seatPressed: bs.seat ? "true" : "false", drvPressed: bs.drv ? "true" : "false",
      delRow: bs.del ? rowOn : rowOff, seatRow: bs.seat ? rowOn : rowOff, drvRow: bs.drv ? rowOn : rowOff,
      dateLong: bStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    };

    return {
      headerClass: st.scrolled ? "ohm-header is-glass" : "ohm-header",
      setDrive: this.setDrive,
      setTrack: this.setTrack,
      setCar: this.setCar,
      setWheelF: this.setWheelF,
      setWheelR: this.setWheelR,
      setPre: this.setPre,
      setPreNum: this.setPreNum,
      setPreFill: this.setPreFill,
      setPreLabel: this.setPreLabel,
      setHero: this.setHero,
      setVideo: this.setVideo,
      setTimecode: this.setTimecode,
      setFleet: this.setFleet,
      fleetPrev: this.fleetPrev,
      fleetNext: this.fleetNext,
      fleetCount: VL_FLEET.length,
      setFoot: this.setFoot,
      city: city,
      locOpen: st.locOpen ? "true" : "false",
      locClass: st.locOpen ? "vl-loc-list is-open" : "vl-loc-list",
      locToggle: this.locToggle,
      menuOpen: st.menuOpen ? "true" : "false",
      menuHidden: st.menuOpen ? "false" : "true",
      menuClass: st.menuOpen ? "vl-mm is-open" : "vl-mm",
      menuToggle: this.menuToggle,
      menuClose: this.menuClose,
      cities: VL_CITIES.map(function (c) { return { name: c[0], country: c[1], sel: c[0] === city ? "true" : "false", pick: function () { self.pickCity(c[0]); } }; }),
      setFootCanvas: this.setFootCanvas,
      footTop: this.footTop,
      bk: bkVals,
      bkClass: bs.open ? "vl-bk is-open" : "vl-bk",
      bkHidden: bs.open ? "false" : "true",
      bkFormStyle: bs.sent ? { display: "none" } : { display: "flex" },
      bkDoneStyle: bs.sent ? { display: "block" } : { display: "none" },
      bkClose: this.bkClose,
      bkLess: this.bkLess,
      bkMore: this.bkMore,
      bkDate: this.bkDate,
      bkSelf: this.bkSelf,
      bkDeliver: this.bkDeliver,
      bkSeat: this.bkSeat,
      bkDriver: this.bkDriver,
      bkSubmit: this.bkSubmit,
      fleet: VL_FLEET.map(function (c, i) {
        var v = us ? c.us : c.eu;
        return { onBook: function () { self.openBooking(i); }, img: c.img, alt: c.alt, name: c.name, trim: c.trim + " · " + c.meta, meta: c.meta, spec: v[0] + " · " + v[1], price: v[2], away: (us ? c.away[0] : c.away[1]) + " away", imgStyle: { objectPosition: "50% " + c.pos + "%" }, style: { background: c.bg } };
      }),
      offerRange: us ? "Up to 327 mi range" : "Up to 568 km range",
      offerOld: us ? "$89" : "€85",
      offerNew: us ? "$71" : "€68",
      tiles: tiles,
      bandStyle: {
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        perspective: (+(r * OHM_CAMERA).toFixed(3)) + "cqw",
        perspectiveOrigin: "50% " + axis + "%",
        maskImage: mask, WebkitMaskImage: mask
      },
      pickUS: this.pickUS,
      pickEU: this.pickEU,
      usPressed: us ? "true" : "false",
      euPressed: us ? "false" : "true",
      usStyle: pill(us),
      euStyle: pill(!us),
      fromText: us ? "From $79 a day" : "From €75 a day"
    };
  }
}

vlMount(Component, {"speed": 5, "curve": 68, "tileHeight": 23, "axis": 56});
