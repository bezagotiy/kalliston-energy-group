/* ===================== Interactive 3D globe + shipping routes =====================
   Base globe: COBE (MIT) — a rotating dotted WebGL globe with champagne markers
   on major maritime ports. Drag to spin.
   Overlay: a 2D canvas drawn in sync with COBE's rotation, showing animated
   great-circle "shipping routes" between ports with moving vessels.
   Falls back gracefully if WebGL is unavailable. */
import createGlobe from "./vendor/cobe.js";

const canvas = document.getElementById("globe");
const routeCanvas = document.getElementById("globe-routes");

if (canvas) {
  const wrap = canvas.parentElement;
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const THETA = 0.25; // globe tilt — must match createGlobe({ theta })
  const RADIUS_SCALE = 0.80; // COBE renders the globe at 0.8 of the half-width
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Major maritime hubs — [latitude, longitude]
  const PORTS = [
    [1.29, 103.85],   // 0  Singapore
    [51.95, 4.14],    // 1  Rotterdam
    [31.23, 121.47],  // 2  Shanghai
    [37.94, 23.65],   // 3  Piraeus
    [53.55, 9.99],    // 4  Hamburg
    [25.27, 55.30],   // 5  Dubai
    [29.76, -95.37],  // 6  Houston
    [22.32, 114.17],  // 7  Hong Kong
    [-23.96, -46.33], // 8  Santos
    [14.60, 120.98],  // 9  Manila
    [-33.87, 151.21], // 10 Sydney
    [40.64, -74.02],  // 11 New York
  ];

  // Shipping lanes as pairs of port indices.
  const ROUTES = [
    [1, 11], // Rotterdam → New York
    [1, 3],  // Rotterdam → Piraeus
    [3, 5],  // Piraeus → Dubai
    [5, 0],  // Dubai → Singapore
    [0, 2],  // Singapore → Shanghai
    [2, 7],  // Shanghai → Hong Kong
    [0, 10], // Singapore → Sydney
    [6, 1],  // Houston → Rotterdam
    [8, 1],  // Santos → Rotterdam
  ];

  const markers = PORTS.map(function (loc, i) {
    return { location: loc, size: i === 0 || i === 1 ? 0.06 : 0.045 };
  });

  // --- Geometry helpers -------------------------------------------------------
  // World unit vector for a port, matching COBE's own lat/lng → xyz convention.
  function toVec(lat, lng) {
    const p = (lat * Math.PI) / 180;
    const l = (lng * Math.PI) / 180;
    const cp = Math.cos(p);
    return [cp * Math.cos(l), Math.sin(p), -cp * Math.sin(l)];
  }

  // Great-circle interpolation between two unit vectors.
  function slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    d = Math.max(-1, Math.min(1, d));
    const o = Math.acos(d);
    const so = Math.sin(o);
    if (so < 1e-6) return a;
    const k0 = Math.sin((1 - t) * o) / so;
    const k1 = Math.sin(t * o) / so;
    const x = k0 * a[0] + k1 * b[0];
    const y = k0 * a[1] + k1 * b[1];
    const z = k0 * a[2] + k1 * b[2];
    const m = Math.hypot(x, y, z) || 1;
    return [x / m, y / m, z / m];
  }

  // Project a world vector to screen using COBE's rotation matrix transpose.
  // Returns { x, y, front } where `front` is true on the near hemisphere.
  function project(v, phi, cx, cy, R) {
    const cT = Math.cos(THETA), sT = Math.sin(THETA);
    const cP = Math.cos(phi), sP = Math.sin(phi);
    const qx = cP * v[0] + sP * v[2];
    const qy = sP * sT * v[0] + cT * v[1] - cP * sT * v[2];
    const qz = -sP * cT * v[0] + sT * v[1] + cP * cT * v[2];
    return { x: cx + qx * R, y: cy - qy * R, front: qz > 0.02 };
  }

  // Precompute endpoint vectors per route.
  const routeVecs = ROUTES.map(function (r) {
    return [toVec(PORTS[r[0]][0], PORTS[r[0]][1]), toVec(PORTS[r[1]][0], PORTS[r[1]][1])];
  });

  // --- Overlay setup ----------------------------------------------------------
  let width = wrap.offsetWidth || canvas.offsetWidth || 480;
  const rctx = routeCanvas ? routeCanvas.getContext("2d") : null;

  function sizeOverlay() {
    width = wrap.offsetWidth || width;
    // Pin the canvas display size in JS so COBE's per-frame resize (which reads
    // canvas.clientWidth) stays bounded even if the stylesheet is cached/stale.
    canvas.style.width = width + "px";
    canvas.style.height = width + "px";
    if (routeCanvas) {
      routeCanvas.style.width = width + "px";
      routeCanvas.style.height = width + "px";
      routeCanvas.width = Math.round(width * DPR);
      routeCanvas.height = Math.round(width * DPR);
    }
  }
  sizeOverlay();

  const onResize = function () { sizeOverlay(); };
  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) {
    new ResizeObserver(sizeOverlay).observe(wrap);
  }

  const SEGMENTS = 40;
  let shipT = 0;

  function drawRoutes(phi) {
    if (!rctx) return;
    const size = width * DPR;
    const cx = size / 2;
    const cy = size / 2;
    const R = (size / 2) * RADIUS_SCALE;
    rctx.clearRect(0, 0, size, size);
    rctx.lineCap = "round";

    for (let i = 0; i < routeVecs.length; i++) {
      const a = routeVecs[i][0];
      const b = routeVecs[i][1];

      // Draw the faint route line (only the visible, near-side portion).
      rctx.beginPath();
      let drawing = false;
      let frontCount = 0;
      for (let s = 0; s <= SEGMENTS; s++) {
        const p = project(slerp(a, b, s / SEGMENTS), phi, cx, cy, R);
        if (p.front) {
          frontCount++;
          if (!drawing) { rctx.moveTo(p.x, p.y); drawing = true; }
          else rctx.lineTo(p.x, p.y);
        } else {
          drawing = false;
        }
      }
      if (frontCount === 0) continue;
      rctx.strokeStyle = "rgba(216, 195, 154, 0.30)";
      rctx.lineWidth = 1.1 * DPR;
      rctx.stroke();

      // Moving vessel: position + short bright wake.
      const offset = i / routeVecs.length;
      const tp = (shipT + offset) % 1;
      const wakeStart = Math.max(0, tp - 0.10);

      rctx.beginPath();
      drawing = false;
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const tt = wakeStart + ((tp - wakeStart) * s) / steps;
        const p = project(slerp(a, b, tt), phi, cx, cy, R);
        if (p.front) {
          if (!drawing) { rctx.moveTo(p.x, p.y); drawing = true; }
          else rctx.lineTo(p.x, p.y);
        } else {
          drawing = false;
        }
      }
      rctx.strokeStyle = "rgba(240, 219, 178, 0.85)";
      rctx.lineWidth = 1.6 * DPR;
      rctx.stroke();

      const ship = project(slerp(a, b, tp), phi, cx, cy, R);
      if (ship.front) {
        rctx.save();
        rctx.shadowColor = "rgba(216, 182, 122, 0.9)";
        rctx.shadowBlur = 8 * DPR;
        rctx.fillStyle = "rgba(248, 236, 210, 1)";
        rctx.beginPath();
        rctx.arc(ship.x, ship.y, 2.4 * DPR, 0, Math.PI * 2);
        rctx.fill();
        rctx.restore();
      }
    }
  }

  // --- Globe ------------------------------------------------------------------
  let phi = 0;
  let pointerInteracting = null;
  let dragOffset = 0;

  try {
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: THETA,
      dark: 1,
      diffuse: 1.3,
      mapSamples: 20000,
      mapBrightness: 7,
      baseColor: [0.31, 0.42, 0.43],
      markerColor: [0.85, 0.7, 0.47],
      glowColor: [0.11, 0.2, 0.21],
      markers: markers,
      onRender: function (state) {
        if (!reduceMotion && pointerInteracting === null) {
          phi += 0.0035;
          shipT = (shipT + 0.0016) % 1;
        }
        const currentPhi = phi + dragOffset;
        state.phi = currentPhi;
        drawRoutes(currentPhi);
      },
    });

    requestAnimationFrame(function () {
      if (wrap) wrap.classList.add("is-ready");
    });
    setTimeout(function () {
      if (wrap) wrap.classList.add("is-ready");
    }, 1000);

    // Drag to rotate.
    const onDown = function (e) {
      pointerInteracting = e.clientX;
      canvas.style.cursor = "grabbing";
    };
    const onUp = function () {
      pointerInteracting = null;
      canvas.style.cursor = "grab";
    };
    const onMove = function (e) {
      if (pointerInteracting !== null) {
        const delta = e.clientX - pointerInteracting;
        pointerInteracting = e.clientX;
        dragOffset += delta * 0.01;
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointerleave", onUp);
    window.addEventListener("pointermove", onMove);
    canvas.style.cursor = "grab";

    window.addEventListener("beforeunload", function () {
      globe.destroy();
    });
  } catch (err) {
    canvas.style.display = "none";
    if (routeCanvas) routeCanvas.style.display = "none";
    console.warn("Globe disabled:", err);
  }
}
