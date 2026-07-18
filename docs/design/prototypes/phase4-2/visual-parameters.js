// PROTOTYPE ONLY — centralized calibration surface.
// Adjust values here without editing index.html interaction logic.
window.PROTOTYPE_VISUAL_PARAMETERS = {
  environment: {
    backgroundBloomOpacity: 0.16,
    warmDustOpacity: 0.11,
    starLayerOpacity: { far: 0.34, mid: 0.46, near: 0.18 },
    starLayerScale: { far: 0.72, mid: 1, near: 1.42 }
  },

  camera: {
    journeyVh: { orbit: 400, drift: 430, mobile: 350 },
    entryEnd: 0.18,
    approachEnd: 0.62,
    approachStart: 0.10,
    approachSpan: 0.48,
    overviewStart: 0.50,
    overviewSpan: 0.28,
    focusMapScale: 1.72,
    focusMapOpacity: 0.12,
    parallax: { far: 0.012, mid: 0.032, near: 0.06 }
  },

  meteor: {
    entryLayers: [
      { className: "far", top: 12, left: -22, length: 330, thickness: 1, scale: 0.72, opacity: 0.42, durationMs: 6600, delayMs: 240, travelX: 86, travelY: 52, angleDeg: 29 },
      { className: "mid", top: 19, left: -28, length: 540, thickness: 2, scale: 0.92, opacity: 0.68, durationMs: 5500, delayMs: 980, travelX: 104, travelY: 62, angleDeg: 30 },
      { className: "near", top: 3, left: -38, length: 760, thickness: 3, scale: 1.12, opacity: 0.9, durationMs: 5000, delayMs: 1780, travelX: 126, travelY: 78, angleDeg: 31 }
    ],
    cursor: {
      follow: 0.4,
      visibilityLerp: 0.08,
      maxTrailPoints: 45,
      speedThreshold: 60,
      trailWidth: 2.2,
      headRadius: 9,
      debrisChance: 0.77,
      debrisMinSpeed: 20,
      debrisMaxSpeed: 70,
      debrisLifeMin: 0.2,
      debrisLifeMax: 0.5
    }
  },

  satellite: {
    shellScale: { active: 1, stable: 0.88, dormant: 0.76 },
    opacity: { active: 0.82, stable: 0.61, dormant: 0.39 },
    orbitOpacity: { active: 0.26, stable: 0.16, dormant: 0.08 },
    microTravelPx: { active: 9, stable: 5, dormant: 0 },
    microDurationMs: { active: 24000, stable: 32000, dormant: 0 },
    motionWindowPercent: { active: 18, stable: 12, dormant: 0 },
    responseMs: 820,
    parallaxPx: 5,
    coreDiameterRatio: 0.16,
    particleOpacity: { active: 0.46, stable: 0.24, dormant: 0 },
    particleCount: { active: 3, stable: 1, dormant: 0 }
  },

  planet: {
    overviewSizePx: { min: 112, preferredVw: 16, max: 244 },
    overviewScale: {
      orbit: { about: 1.08, blog: 0.83, feed: 0.71, learn: 0.8, projects: 0.92 },
      drift: { about: 1.02, blog: 0.91, feed: 0.7, learn: 0.77, projects: 0.95 }
    },
    depthScale: { about: 0.72, blog: 0.9, feed: 1, projects: 0.86, learn: 0.84 },
    materials: {
      about: { asset: "./assets/planets/about.webp", overviewScale: 1, focusScale: 1.055, contrast: 1.02, saturation: 0.82 },
      blog: { asset: "./assets/planets/blog.webp", overviewScale: 1, focusScale: 1.05, contrast: 1.04, saturation: 0.8 },
      feed: { asset: "./assets/planets/feed.webp", overviewScale: 1, focusScale: 1.045, contrast: 1.03, saturation: 0.78 },
      projects: { asset: "./assets/planets/projects.webp", overviewScale: 1, focusScale: 1.05, contrast: 1.02, saturation: 0.76 },
      learn: { asset: "./assets/planets/learn.webp", overviewScale: 1, focusScale: 1.055, contrast: 1.05, saturation: 0.8 }
    },
    lighting: {
      atmosphereOpacity: 0.23,
      atmosphereWidthPx: 1,
      terminatorOpacity: 0.18,
      castShadowOpacity: 0.44,
      castShadowBlurPx: 34,
      focusMaterialBoost: 1.06
    },
    focusDiameterVmin: 66,
    focusDiameterMaxPx: 820,
    focusSurfaceScale: 1.16
  },

  aboutCompanion: {
    offsetPlanetRadii: { x: 1.12, y: 0.72 },
    overviewScale: 0.62,
    revealStart: 0.28,
    catLineOpacity: 0.12,
    catLineFocusOpacity: 0.84,
    particleCount: 3,
    parallaxPx: 4
  },

  transition: {
    microMs: 180,
    hoverMs: 220,
    parallaxEaseMs: 320,
    navigationMs: 160,
    routeFadeMs: 170,
    focusInMs: 980,
    focusOutMs: 720,
    actionPreviewMs: 760,
    aboutOpenMs: 420,
    catChargeMs: 3800,
    catBurstMs: 1140,
    catRecoverMs: 2750,
    catDustStaggerMs: 25,
    signalResponseMs: 820
  },

  layout: {
    orbit: {
      origin: [52, 51],
      planets: { about: [77, 18, 5], blog: [23, 29, 2], feed: [65, 38, 1], projects: [23, 74, 4], learn: [73, 73, 3] }
    },
    drift: {
      origin: [48, 47],
      planets: { about: [72, 21, 5], blog: [28, 25, 2], feed: [62, 42, 1], projects: [20, 70, 4], learn: [76, 68, 3] }
    }
  }
};
