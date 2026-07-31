/* ===================== Interactive 3D globe (COBE, MIT) =====================
   Renders a rotating WebGL globe in the hero with markers on major maritime
   ports. Drag to spin. Falls back gracefully if WebGL is unavailable. */
import createGlobe from "./vendor/cobe.js";

const canvas = document.getElementById("globe");

if (canvas) {
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Major maritime hubs — [latitude, longitude]
  const markers = [
    { location: [1.29, 103.85], size: 0.06 },   // Singapore
    { location: [51.95, 4.14], size: 0.05 },     // Rotterdam
    { location: [31.23, 121.47], size: 0.05 },   // Shanghai
    { location: [37.94, 23.65], size: 0.05 },    // Piraeus
    { location: [53.55, 9.99], size: 0.04 },     // Hamburg
    { location: [25.27, 55.30], size: 0.05 },    // Dubai
    { location: [29.76, -95.37], size: 0.04 },   // Houston
    { location: [22.32, 114.17], size: 0.04 },   // Hong Kong
    { location: [-23.96, -46.33], size: 0.04 },  // Santos
    { location: [14.60, 120.98], size: 0.05 },   // Manila
    { location: [-33.87, 151.21], size: 0.04 },  // Sydney
    { location: [40.64, -74.02], size: 0.04 },   // New York
  ];

  let phi = 0;
  let width = canvas.offsetWidth || 480;
  let pointerInteracting = null;
  let offset = 0;

  const onResize = function () {
    width = canvas.offsetWidth || width;
  };
  window.addEventListener("resize", onResize);

  try {
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.3,
      mapSamples: 20000,
      mapBrightness: 7,
      baseColor: [0.36, 0.47, 0.62],      // steel blue landmasses
      markerColor: [0.98, 0.85, 0.58],    // champagne ports
      glowColor: [0.22, 0.36, 0.52],      // navy glow
      markers: markers,
      onRender: function (state) {
        if (!reduceMotion && pointerInteracting === null) {
          phi += 0.0035;
        }
        state.phi = phi + offset;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    // Reveal once the first frame is ready.
    requestAnimationFrame(function () {
      canvas.classList.add("is-ready");
    });

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
        offset += delta * 0.01;
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointerleave", onUp);
    window.addEventListener("pointermove", onMove);
    canvas.style.cursor = "grab";

    // Clean up if the globe is ever removed.
    window.addEventListener("beforeunload", function () {
      globe.destroy();
    });
  } catch (err) {
    // WebGL not available — hide the canvas so the layout stays clean.
    canvas.style.display = "none";
    console.warn("Globe disabled:", err);
  }
}
