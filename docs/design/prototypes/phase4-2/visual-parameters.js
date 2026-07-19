// PROTOTYPE ONLY — centralized calibration surface.
// Adjust values here without editing index.html interaction logic.
window.PROTOTYPE_VISUAL_PARAMETERS = {
  environment: {
    backgroundBloomOpacity: 0.16,
    warmDustOpacity: 0.11,
    starLayerOpacity: { far: 0.68, mid: 0.66, near: 0.31 },
    starLayerScale: { far: 0.72, mid: 1, near: 1.42 },
    starfield: {
      seed: 4217,
      mobileDensityScale: 0.54,
      layers: {
        far: { densityPerMegapixel: 720, opacity: [0.12, 0.54], radiusPx: [0.28, 0.82], warmRatio: 0.16 },
        mid: { densityPerMegapixel: 255, opacity: [0.22, 0.82], radiusPx: [0.5, 1.3], warmRatio: 0.18 },
        near: { densityPerMegapixel: 60, opacity: [0.24, 0.66], radiusPx: [0.72, 1.55], warmRatio: 0.18 }
      },
      clusters: [
        { x: 0.22, y: 0.6, radius: 0.18, strength: 0.86 },
        { x: 0.56, y: 0.47, radius: 0.2, strength: 0.56 },
        { x: 0.83, y: 0.34, radius: 0.16, strength: 0.74 }
      ],
      darkZones: [
        { x: 0.5, y: 0.22, radius: 0.2, strength: 0.84 },
        { x: 0.87, y: 0.72, radius: 0.16, strength: 0.62 }
      ],
      galaxy: {
        center: [0.56, 0.46],
        angleDeg: -22,
        halfLength: 0.82,
        halfWidth: 0.17,
        densityBoost: { far: 1.45, mid: 0.92, near: 0.12 },
        bandStarFraction: { far: 0.9, mid: 0.44, near: 0.03 },
        dustOpacity: 0.075
      }
    }
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
    focusSequence: {
      order: ["about", "feed", "blog", "projects", "learn"],
      overviewHoldVh: 45,
      overviewHandoffVh: { desktop: 54, mobile: 42 },
      stepVh: { desktop: 144, mobile: 126 },
      footerReleaseVh: 35,
      holdRatio: 0.72
    },
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
      drift: { about: 0.88, blog: 0.94, feed: 1, learn: 0.91, projects: 0.94 }
    },
    depthScale: { about: 0.72, blog: 0.9, feed: 1, projects: 0.86, learn: 0.84 },
    emergence: {
      targetStart: 0.015,
      targetOpacity: 0.7,
      haloStart: 0.07,
      sphereStart: 0.2,
      sphereEnd: 0.86,
      labelStart: 0.68,
      interactiveStart: 0.84,
      haloStrength: 0.5,
      targetTone: {
        about: "226 224 219",
        blog: "231 218 197",
        feed: "205 216 232",
        projects: "222 205 184",
        learn: "202 211 225"
      },
      depthOffset: {
        about: { progress: 0.13, xVw: 1.2, yVh: -0.8 },
        blog: { progress: 0.03, xVw: -0.7, yVh: -0.4 },
        feed: { progress: -0.08, xVw: 0.35, yVh: 0.2 },
        projects: { progress: 0.06, xVw: -0.65, yVh: 0.7 },
        learn: { progress: 0.09, xVw: 0.8, yVh: 0.65 }
      }
    },
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
      focusMaterialBoost: 1.06,
      passiveRimOpacity: 0.1,
      passiveRimBlurPx: 18,
      readyRimOpacity: 0.3,
      hoverGlowOpacity: 0.74,
      hoverGlowBlurPx: 28,
      hoverHaloOpacity: 0.24,
      hoverHaloBlurPx: 56
    },
    focusShots: {
      about: {
        x: 77, y: 56, diameterVmin: 78, maxPx: 980, scale: 1.08, crop: "42% 48%",
        entryOffset: [7, -7], exitOffset: [-8, 4],
        copy: { x: 7, y: 52, widthCh: 34, align: "left" },
        mobile: { x: 66, y: 28, diameterVmin: 72, maxPx: 520, scale: 1.02, crop: "42% 48%", copy: { x: 6, y: 70, widthCh: 31, align: "left" } }
      },
      feed: {
        x: 24, y: 64, diameterVmin: 84, maxPx: 1040, scale: 1.13, crop: "52% 46%",
        entryOffset: [9, 5], exitOffset: [-10, -5],
        copy: { x: 62, y: 42, widthCh: 33, align: "left" },
        mobile: { x: 35, y: 29, diameterVmin: 78, maxPx: 540, scale: 1.05, crop: "52% 46%", copy: { x: 6, y: 70, widthCh: 31, align: "left" } }
      },
      blog: {
        x: 76, y: 49, diameterVmin: 88, maxPx: 1100, scale: 1.16, crop: "38% 52%",
        entryOffset: [8, -4], exitOffset: [-9, 6],
        copy: { x: 7, y: 49, widthCh: 35, align: "left" },
        mobile: { x: 67, y: 27, diameterVmin: 82, maxPx: 560, scale: 1.07, crop: "38% 52%", copy: { x: 6, y: 70, widthCh: 31, align: "left" } }
      },
      projects: {
        x: 69, y: 80, diameterVmin: 90, maxPx: 1100, scale: 1.1, crop: "46% 36%",
        entryOffset: [-6, 8], exitOffset: [7, -7],
        copy: { x: 8, y: 30, widthCh: 34, align: "left" },
        mobile: { x: 50, y: 36, diameterVmin: 92, maxPx: 620, scale: 1.1, crop: "48% 34%", copy: { x: 6, y: 70, widthCh: 31, align: "left" } }
      },
      learn: {
        x: 20, y: 43, diameterVmin: 82, maxPx: 1020, scale: 1.12, crop: "58% 45%",
        entryOffset: [-8, -5], exitOffset: [10, 5],
        copy: { x: 61, y: 58, widthCh: 34, align: "left" },
        mobile: { x: 33, y: 28, diameterVmin: 76, maxPx: 530, scale: 1.04, crop: "58% 45%", copy: { x: 6, y: 70, widthCh: 31, align: "left" } }
      }
    },
    focusDiameterVmin: 66,
    focusDiameterMaxPx: 820,
    focusSurfaceScale: 1.16
  },

  aboutCompanion: {
    offsetPlanetRadii: { x: -1.08, y: 0.72 },
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
    parallaxEaseMs: 480,
    navigationMs: 170,
    routeFadeMs: 270,
    focusInMs: 1100,
    focusOutMs: 800,
    actionPreviewMs: 600,
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
      planets: { about: [77, 18, 5], blog: [25, 27, 2], feed: [61, 43, 1], projects: [21, 73, 4], learn: [75, 71, 3] }
    }
  }
};
