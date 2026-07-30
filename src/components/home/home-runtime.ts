// @ts-nocheck

export type ActivityState = 'active' | 'stable' | 'dormant';
type Assets = Record<string, { overview: string; focus: string; mobile: string }>;
type States = Record<'blog' | 'feed' | 'learn' | 'projects', ActivityState>;

export function mountPhase42Runtime({ assets, satelliteAsset }: { assets: Assets; satelliteAsset: string }) {
  let activityProjection: States | null = null;
  const focusAsset = (key) => matchMedia('(max-width: 760px)').matches ? assets[key].mobile : assets[key].focus;

// PROTOTYPE ONLY — centralized calibration surface.
// Adjust values here without editing index.html interaction logic.
const PROTOTYPE_VISUAL_PARAMETERS = {
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
    orbitOpacity: { active: 0.38, stable: 0.22, dormant: 0.1 },
    microTravelPx: { active: 13, stable: 7, dormant: 0 },
    microDurationMs: { active: 28000, stable: 36000, dormant: 0 },
    motionWindowPercent: { active: 100, stable: 100, dormant: 0 },
    orbitShellPercent: 132,
    orbitPath: {
      centerPercent: [50, 50],
      radiusPercent: [39, 31],
      startAngleDeg: -52,
      sampleCount: 8
    },
    depthHysteresis: 0.16,
    staticAngleDeg: 0,
    responseMs: 820,
    hoverOrbitRate: 0.2,
    hoverSlowMs: 900,
    hoverResumeMs: 700,
    hoverGlowBoost: 0.18,
    hoverOrbitBoost: 0.14,
    parallaxPx: 5,
    coreDiameterRatio: 0.06375,
    material: {
      bodyAsset: "./assets/satellites/has-beacon-body-v1.png",
      bodyAssetScale: "148%",
      bodyBrightness: 0.86,
      bodyContrast: 1.08,
      bodySaturation: 0.72,
      signalBandTiltDeg: -8,
      signalBandTop: "30%",
      signalBandHeight: "44%"
    },
    ambientPulse: {
      intervalMs: { active: [4000, 8000], stable: [9000, 13000] },
      orbitBoost: 0.06
    },
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
    overviewScale: 0.82,
    revealStart: 0.28,
    fragmentRestOpacity: 0.14,
    fragmentHintOpacity: 0.4,
    fragmentRevealOpacity: 0.86,
    residueOpacity: 0.22,
    burstRadiusPx: 118,
    fragmentStaggerMs: 42,
    nodes: {
      restOpacity: 0.52,
      revealOpacity: 0.96,
      chargedOpacity: 1,
      primaryScale: 1,
      secondaryScale: 0.72,
      restGlowPx: 2.5,
      revealGlowPx: 4,
      chargedGlowPx: 7
    },
    burst: {
      contourSamplesPerPath: 6,
      impulse: 820,
      impulseRandomness: 0.46,
      tangentialRatio: 0.14,
      breakRadiusRatio: 0.32,
      fragmentTravelRatio: 0.14,
      residueRatio: 0.3,
      spring: 46,
      damping: 12
    },
    catLineOpacity: 0.12,
    catLineFocusOpacity: 0.94,
    lineWidth: 1.85,
    innerLineOpacity: 0.28,
    constellationRestOpacity: 0.52,
    constellationRevealOpacity: 1,
    constellationChargeOpacity: 1,
    auraRestOpacity: 0.14,
    auraRevealOpacity: 0.22,
    auraChargeOpacity: 0.42,
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


  Object.entries(assets).forEach(([key, asset]) => { PROTOTYPE_VISUAL_PARAMETERS.planet.materials[key].asset = asset.overview; });
  PROTOTYPE_VISUAL_PARAMETERS.satellite.material.bodyAsset = satelliteAsset;

const P = PROTOTYPE_VISUAL_PARAMETERS,
          root = document.documentElement;
        const body = document.body,
          journey = document.querySelector(".journey"),
          stage = document.getElementById("stage");
        const planets = [...document.querySelectorAll(".planet")],
          catZone = document.getElementById("about-zone"),
          cat = document.getElementById("cat");
        const aboutPlanet = document.querySelector('[data-planet="about"]'),
          focusLayer = document.getElementById("planet-focus"),
          focusProxy = document.getElementById("focus-proxy");
        const focusSlots = [...document.querySelectorAll(".focus-shot")],
          primarySlot = focusSlots[0],
          secondarySlot = focusSlots[1],
          focusBack = document.getElementById("focus-back"),
          focusEnter = document.getElementById("focus-enter");
        focusLayer.style.transition = "none";
        const reduce = matchMedia("(prefers-reduced-motion: reduce)"),
          finePointer = matchMedia("(hover: hover) and (pointer: fine)");
        const destinations = {
          blog: "/blog/",
          feed: "/feed/",
          learn: "/learn/",
          projects: "/projects/",
        };
        const focusMeta = {
          about: {
            title: "ABOUT",
            kicker: "PERSONAL ORBIT",
            description: "一个安静、偏远、只在 Home 原地展开的私人世界。",
            notes: [
              "浅色岩质与柔和尘埃只是镜头占位。",
              "直接展开与豹猫彩蛋通往同一状态。",
            ],
            action: "",
          },
          feed: {
            title: "FEED",
            kicker: "PUBLIC FOOTPRINTS",
            description: "公开来时路的入口；此处只验证阅读区和推进动作。",
            notes: ["沉积河谷表达时间方向。", "原型不读取任何真实动态。"],
            action: "ENTER FEED",
          },
          blog: {
            title: "BLOG",
            kicker: "WRITING & NOTES",
            description:
              "层状地貌作为写作世界的空间窗口，文字仍是主要阅读对象。",
            notes: ["近景材质仍是可替换占位。", "原型不加载文章标题或列表。"],
            action: "ENTER BLOG",
          },
          projects: {
            title: "PROJECTS",
            kicker: "SELECTED BUILDS",
            description: "人工切面从自然地表中显露，但不在 Home 展开项目内容。",
            notes: ["下部弧面用于验证不同镜头。", "原型不加载项目卡片。"],
            action: "ENTER PROJECTS",
          },
          learn: {
            title: "LEARN",
            kicker: "LEARNING TRACKS",
            description: "断层与矿脉提供纵深，稳定文字区承担进入前的说明。",
            notes: ["只验证 Focus 的阅读节奏。", "原型不加载章节或学习进度。"],
            action: "ENTER LEARN",
          },
        };
        let variant = "drift",
          catState = "rest",
          activeFocus = null,
          focusTrigger = null,
          focusMode = null,
          chargeTimer,
          catBurstTimer,
          catRecoverTimer,
          suppressSyntheticCatClickUntil = 0,
          returnTimer,
          signalsRevealed = false,
          manualAnimations = [],
          focusTransitionToken = 0;
        const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n)),
          ease = (n) => 1 - Math.pow(1 - clamp(n), 3),
          smooth = (n) => {
            n = clamp(n);
            return n * n * (3 - 2 * n);
          },
          lerp = (a, b, t) => a + (b - a) * t;
        const signalStateText = {
          active: "活动状态：活跃",
          stable: "活动状态：稳定",
          dormant: "活动状态：休眠",
          unavailable: "活动状态：当前不可用",
        };
        function applyParameters() {
          root.style.setProperty(
            "--background-bloom",
            P.environment.backgroundBloomOpacity,
          );
          root.style.setProperty("--warm-dust", P.environment.warmDustOpacity);
          root.style.setProperty(
            "--stars-far-opacity",
            P.environment.starLayerOpacity.far,
          );
          root.style.setProperty(
            "--stars-mid-opacity",
            P.environment.starLayerOpacity.mid,
          );
          root.style.setProperty(
            "--stars-near-opacity",
            P.environment.starLayerOpacity.near,
          );
          root.style.setProperty(
            "--stars-far-scale",
            P.environment.starLayerScale.far,
          );
          root.style.setProperty(
            "--stars-mid-scale",
            P.environment.starLayerScale.mid,
          );
          root.style.setProperty(
            "--stars-near-scale",
            P.environment.starLayerScale.near,
          );
          root.style.setProperty(
            "--galaxy-gradient-angle",
            `${P.environment.starfield.galaxy.angleDeg}deg`,
          );
          root.style.setProperty("--focus-in", `${P.transition.focusInMs}ms`);
          root.style.setProperty("--focus-out", `${P.transition.focusOutMs}ms`);
          root.style.setProperty(
            "--focus-copy-in",
            `${Math.round(P.transition.focusInMs * 0.72)}ms`,
          );
          root.style.setProperty(
            "--focus-copy-delay",
            `${Math.round(P.transition.focusInMs * 0.28)}ms`,
          );
          root.style.setProperty(
            "--action-preview",
            `${P.transition.actionPreviewMs}ms`,
          );
          root.style.setProperty(
            "--satellite-response",
            `${P.satellite.responseMs}ms`,
          );
          root.style.setProperty("--micro", `${P.transition.microMs}ms`);
          root.style.setProperty("--hover", `${P.transition.hoverMs}ms`);
          root.style.setProperty(
            "--parallax-ease",
            `${P.transition.parallaxEaseMs}ms`,
          );
          root.style.setProperty(
            "--navigation",
            `${P.transition.navigationMs}ms`,
          );
          root.style.setProperty(
            "--route-fade",
            `${P.transition.routeFadeMs}ms`,
          );
          root.style.setProperty(
            "--cat-charge",
            `${P.transition.catChargeMs}ms`,
          );
          root.style.setProperty("--cat-burst", `${P.transition.catBurstMs}ms`);
          root.style.setProperty(
            "--cat-recover",
            `${P.transition.catRecoverMs}ms`,
          );
          root.style.setProperty(
            "--cat-dust-stagger",
            `${P.transition.catDustStaggerMs}ms`,
          );
          root.style.setProperty("--parallax-far", P.camera.parallax.far);
          root.style.setProperty("--parallax-mid", P.camera.parallax.mid);
          root.style.setProperty("--parallax-near", P.camera.parallax.near);
          root.style.setProperty("--focus-map-scale", P.camera.focusMapScale);
          root.style.setProperty(
            "--focus-map-opacity",
            P.camera.focusMapOpacity,
          );
          root.style.setProperty(
            "--planet-min",
            `${P.planet.overviewSizePx.min}px`,
          );
          root.style.setProperty(
            "--planet-preferred",
            `${P.planet.overviewSizePx.preferredVw}vw`,
          );
          root.style.setProperty(
            "--planet-max",
            `${P.planet.overviewSizePx.max}px`,
          );
          root.style.setProperty(
            "--focus-planet-size",
            `min(${P.planet.focusDiameterVmin}vmin, ${P.planet.focusDiameterMaxPx}px)`,
          );
          root.style.setProperty(
            "--atmosphere-opacity",
            P.planet.lighting.atmosphereOpacity,
          );
          root.style.setProperty(
            "--atmosphere-shadow-opacity",
            P.planet.lighting.atmosphereOpacity * 0.32,
          );
          root.style.setProperty(
            "--atmosphere-glow-opacity",
            P.planet.lighting.atmosphereOpacity * 0.2,
          );
          root.style.setProperty(
            "--atmosphere-width",
            `${P.planet.lighting.atmosphereWidthPx}px`,
          );
          root.style.setProperty(
            "--terminator-opacity",
            P.planet.lighting.terminatorOpacity,
          );
          root.style.setProperty(
            "--focus-terminator-opacity",
            P.planet.lighting.terminatorOpacity * 0.7,
          );
          root.style.setProperty(
            "--planet-shadow-opacity",
            P.planet.lighting.castShadowOpacity,
          );
          root.style.setProperty(
            "--planet-shadow-blur",
            `${P.planet.lighting.castShadowBlurPx}px`,
          );
          root.style.setProperty(
            "--planet-passive-rim-opacity",
            P.planet.lighting.passiveRimOpacity,
          );
          root.style.setProperty(
            "--planet-passive-rim-blur",
            `${P.planet.lighting.passiveRimBlurPx}px`,
          );
          root.style.setProperty(
            "--planet-ready-rim-opacity",
            P.planet.lighting.readyRimOpacity,
          );
          root.style.setProperty(
            "--planet-hover-glow-opacity",
            P.planet.lighting.hoverGlowOpacity,
          );
          root.style.setProperty(
            "--planet-hover-glow-blur",
            `${P.planet.lighting.hoverGlowBlurPx}px`,
          );
          root.style.setProperty(
            "--planet-hover-halo-opacity",
            P.planet.lighting.hoverHaloOpacity,
          );
          root.style.setProperty(
            "--planet-hover-halo-blur",
            `${P.planet.lighting.hoverHaloBlurPx}px`,
          );
          root.style.setProperty(
            "--signal-core-size",
            `${P.satellite.coreDiameterRatio * 100}%`,
          );
          root.style.setProperty(
            "--signal-body-asset",
            `url("${P.satellite.material.bodyAsset}")`,
          );
          root.style.setProperty(
            "--signal-body-asset-scale",
            P.satellite.material.bodyAssetScale,
          );
          root.style.setProperty(
            "--signal-body-brightness",
            P.satellite.material.bodyBrightness,
          );
          root.style.setProperty(
            "--signal-body-contrast",
            P.satellite.material.bodyContrast,
          );
          root.style.setProperty(
            "--signal-body-saturation",
            P.satellite.material.bodySaturation,
          );
          root.style.setProperty(
            "--signal-band-tilt",
            `${P.satellite.material.signalBandTiltDeg}deg`,
          );
          root.style.setProperty(
            "--signal-band-top",
            P.satellite.material.signalBandTop,
          );
          root.style.setProperty(
            "--signal-band-height",
            P.satellite.material.signalBandHeight,
          );
          root.style.setProperty(
            "--signal-orbit-shell-size",
            `${P.satellite.orbitShellPercent}%`,
          );
          root.style.setProperty(
            "--signal-hover-glow",
            P.satellite.hoverGlowBoost,
          );
          root.style.setProperty(
            "--signal-hover-orbit-boost",
            P.satellite.hoverOrbitBoost,
          );
          root.style.setProperty(
            "--signal-pulse-orbit-boost",
            P.satellite.ambientPulse.orbitBoost,
          );
          root.style.setProperty(
            "--companion-overview-scale",
            P.aboutCompanion.overviewScale,
          );
          root.style.setProperty(
            "--companion-reveal-start",
            P.aboutCompanion.revealStart,
          );
          root.style.setProperty(
            "--cat-fragment-rest-opacity",
            P.aboutCompanion.fragmentRestOpacity,
          );
          root.style.setProperty(
            "--cat-fragment-hint-opacity",
            P.aboutCompanion.fragmentHintOpacity,
          );
          root.style.setProperty(
            "--cat-fragment-reveal-opacity",
            P.aboutCompanion.fragmentRevealOpacity,
          );
          root.style.setProperty(
            "--cat-residue-opacity",
            P.aboutCompanion.residueOpacity,
          );
          root.style.setProperty(
            "--cat-node-rest-opacity",
            P.aboutCompanion.nodes.restOpacity,
          );
          root.style.setProperty(
            "--cat-node-reveal-opacity",
            P.aboutCompanion.nodes.revealOpacity,
          );
          root.style.setProperty(
            "--cat-node-charged-opacity",
            P.aboutCompanion.nodes.chargedOpacity,
          );
          root.style.setProperty(
            "--cat-node-glow",
            `${P.aboutCompanion.nodes.restGlowPx}px`,
          );
          root.style.setProperty(
            "--cat-line-opacity",
            P.aboutCompanion.catLineOpacity,
          );
          root.style.setProperty(
            "--cat-line-focus-opacity",
            P.aboutCompanion.catLineFocusOpacity,
          );
          root.style.setProperty(
            "--cat-line-width",
            `${P.aboutCompanion.lineWidth}px`,
          );
          root.style.setProperty(
            "--cat-inner-line-opacity",
            P.aboutCompanion.innerLineOpacity,
          );
          root.style.setProperty(
            "--cat-constellation-rest-opacity",
            P.aboutCompanion.constellationRestOpacity,
          );
          root.style.setProperty(
            "--cat-constellation-reveal-opacity",
            P.aboutCompanion.constellationRevealOpacity,
          );
          root.style.setProperty(
            "--cat-constellation-charge-opacity",
            P.aboutCompanion.constellationChargeOpacity,
          );
          root.style.setProperty(
            "--cat-aura-rest-opacity",
            P.aboutCompanion.auraRestOpacity,
          );
          root.style.setProperty(
            "--cat-aura-reveal-opacity",
            P.aboutCompanion.auraRevealOpacity,
          );
          root.style.setProperty(
            "--cat-aura-charge-opacity",
            P.aboutCompanion.auraChargeOpacity,
          );
          root.style.setProperty(
            "--entry-meteor-angle",
            `${P.meteor.entryLayers[Math.floor(P.meteor.entryLayers.length / 2)].angleDeg}deg`,
          );
          planets.forEach((planet) => {
            const key = planet.dataset.planet,
              material = P.planet.materials[key];
            planet.style.setProperty(
              "--planet-asset",
              `url("${material.asset}")`,
            );
            planet.style.setProperty(
              "--planet-material-scale",
              material.overviewScale,
            );
            planet.style.setProperty(
              "--planet-hover-scale",
              material.overviewScale * 1.012,
            );
            planet.style.setProperty("--planet-contrast", material.contrast);
            planet.style.setProperty(
              "--planet-hover-contrast",
              material.contrast + 0.025,
            );
            planet.style.setProperty(
              "--planet-saturation",
              material.saturation,
            );
            const preload = new Image();
            preload.src = material.asset;
          });
          document.querySelectorAll(".cat-fragment").forEach((fragment, index) => {
            const x = Number(fragment.dataset.burstX) * P.aboutCompanion.burstRadiusPx,
              y = Number(fragment.dataset.burstY) * P.aboutCompanion.burstRadiusPx;
            fragment.style.setProperty("--fragment-x", `${x}px`);
            fragment.style.setProperty("--fragment-y", `${y}px`);
            fragment.style.setProperty("--fragment-early-x", `${x * 0.34}px`);
            fragment.style.setProperty("--fragment-early-y", `${y * 0.34}px`);
            fragment.style.setProperty("--fragment-final-x", `${x * 1.12}px`);
            fragment.style.setProperty("--fragment-final-y", `${y * 1.12}px`);
            fragment.style.setProperty(
              "--fragment-delay",
              `${index * P.aboutCompanion.fragmentStaggerMs}ms`,
            );
          });
          document
            .querySelectorAll(".entry-meteor")
            .forEach((meteor, index) => {
              const m = P.meteor.entryLayers[index];
              Object.entries({
                top: `${m.top}%`,
                left: `${m.left}%`,
                length: `${m.length}px`,
                thickness: `${m.thickness}px`,
                scale: m.scale,
                opacity: m.opacity,
                duration: `${m.durationMs}ms`,
                delay: `${m.delayMs}ms`,
                "travel-x": `${m.travelX}vw`,
                "travel-y": `${m.travelY}vh`,
                angle: `${m.angleDeg}deg`,
              }).forEach(([key, value]) =>
                meteor.style.setProperty(`--meteor-${key}`, value),
              );
            });
          document
            .querySelectorAll(".cat-dust i")
            .forEach((particle, index) => {
              particle.style.animationDelay = `${index * P.transition.catDustStaggerMs}ms`;
            });
        }
        const CAT_SVG_NS = "http://www.w3.org/2000/svg";
        let catPhysics = null,
          catBurstOrigin = { x: 601, y: 264 },
          catPhysicsFrame = 0,
          catPhysicsLast = 0;
        const catPrimaryNodeIndices = new Set([
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 19, 23,
        ]);
        const catRandom = (seed) => {
          const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
          return value - Math.floor(value);
        };
        function svgElement(name, attributes = {}) {
          const element = document.createElementNS(CAT_SVG_NS, name);
          Object.entries(attributes).forEach(([key, value]) =>
            element.setAttribute(key, value),
          );
          return element;
        }
        function setupCatConstellation() {
          const svg = cat.querySelector(".cat-svg");
          if (!svg || svg.dataset.constellationReady === "true") return;
          const defs = svg.querySelector("defs"), aura = svg.querySelector(".cat-aura"),
            sourceFragments = [...svg.querySelectorAll(":scope > .cat-fragment")],
            contourLayer = svgElement("g", { class: "cat-contour-layer" }),
            linkLayer = svgElement("g", { class: "cat-link-layer" }),
            nodeLayer = svgElement("g", { class: "cat-node-layer" }),
            burstLayer = svgElement("g", { class: "cat-burst-layer", "aria-hidden": "true" }),
            entries = [], links = [], fragments = [];
          let nodeIndex = 0;
          sourceFragments.forEach((source, fragmentIndex) => {
            const contour = svgElement("g", {
              class: source.className.baseVal,
              "data-fragment-index": fragmentIndex,
              "data-burst-x": source.dataset.burstX,
              "data-burst-y": source.dataset.burstY,
              fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round",
            });
            const link = svgElement("g", {
              class: "cat-link-fragment", "data-fragment-index": fragmentIndex,
              fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round",
            });
            const paths = [...source.querySelectorAll("path")];
            if (paths[0]) contour.append(paths[0]);
            if (paths[1]) {
              link.append(paths[1]);
              const midpoint = paths[1].getPointAtLength(paths[1].getTotalLength() / 2);
              links.push({ element: link, x: midpoint.x, y: midpoint.y });
            }
            [...source.querySelectorAll("circle")].forEach((circle) => {
              const x = Number(circle.getAttribute("cx")), y = Number(circle.getAttribute("cy")),
                primary = catPrimaryNodeIndices.has(nodeIndex),
                node = svgElement("g", {
                  class: `cat-node cat-node--${primary ? "primary" : "secondary"}`,
                  "data-node-id": `node-${nodeIndex}`,
                  "data-origin-x": x,
                  "data-origin-y": y,
                  transform: `translate(${x} ${y})`,
                }),
                radius = Number(circle.getAttribute("r"));
              node.append(
                svgElement("circle", { class: "cat-node-halo", r: radius * 2.15 }),
                svgElement("circle", { class: "cat-node-core", r: radius * (primary ? 0.72 : 0.56) }),
              );
              nodeLayer.append(node);
              entries.push({ element: node, originX: x, originY: y, x, y, vx: 0, vy: 0, kind: "node", importance: primary ? 1 : 0.62, index: nodeIndex++ });
            });
            contourLayer.append(contour);
            linkLayer.append(link);
            fragments.push({ element: contour, x: Number(source.dataset.burstX), y: Number(source.dataset.burstY) });
          });
          [...contourLayer.querySelectorAll("path")].forEach((path, pathIndex) => {
            const count = P.aboutCompanion.burst.contourSamplesPerPath;
            for (let sample = 1; sample <= count; sample += 1) {
              const point = path.getPointAtLength((path.getTotalLength() * sample) / (count + 1));
              const particle = svgElement("g", { class: "cat-burst-particle" });
              particle.append(svgElement("circle", { r: sample % 3 === 0 ? 2.15 : 1.45 }));
              burstLayer.append(particle);
              entries.push({ element: particle, originX: point.x, originY: point.y, x: point.x, y: point.y, vx: 0, vy: 0, kind: "particle", importance: 0.28, index: 100 + pathIndex * count + sample });
            }
          });
          svg.replaceChildren(defs, aura, contourLayer, linkLayer, nodeLayer, burstLayer);
          svg.dataset.constellationReady = "true";
          catPhysics = { svg, entries, links, fragments, mode: "rest", startedAt: 0 };
        }
        function recordCatBurstOrigin(event) {
          if (!catPhysics) return;
          const point = event?.changedTouches?.[0] || event?.touches?.[0] || event;
          if (!point || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) return;
          const matrix = catPhysics.svg.getScreenCTM();
          if (!matrix) return;
          const local = new DOMPoint(point.clientX, point.clientY).matrixTransform(matrix.inverse());
          catBurstOrigin = { x: local.x, y: local.y };
        }
        function catRange() {
          const rect = catPhysics.svg.getBoundingClientRect();
          return Math.max(80, (P.aboutCompanion.burstRadiusPx / Math.max(1, rect.width)) * 1202);
        }
        function resetCatPhysics() {
          cancelAnimationFrame(catPhysicsFrame);
          catPhysicsFrame = 0;
          if (!catPhysics) return;
          catPhysics.mode = "rest";
          root.style.setProperty("--cat-node-glow", `${P.aboutCompanion.nodes.restGlowPx}px`);
          catPhysics.entries.forEach((entry) => {
            entry.x = entry.originX; entry.y = entry.originY; entry.vx = 0; entry.vy = 0;
            entry.element.setAttribute("transform", `translate(${entry.x} ${entry.y})`);
            entry.element.style.removeProperty("opacity");
            entry.element.classList.remove("is-residue");
          });
          catPhysics.links.forEach((link) => link.element.style.removeProperty("opacity"));
          catPhysics.fragments.forEach((fragment) => {
            fragment.element.removeAttribute("transform");
            fragment.element.style.removeProperty("opacity");
          });
        }
        function beginCatPhysics(mode) {
          if (!catPhysics || reduce.matches) return;
          catPhysics.mode = mode;
          catPhysics.startedAt = performance.now();
          if (mode === "charged") root.style.setProperty("--cat-node-glow", `${P.aboutCompanion.nodes.chargedGlowPx}px`);
          if (mode === "burst") {
            const range = catRange(), breakRange = range * P.aboutCompanion.burst.breakRadiusRatio;
            catPhysics.entries.forEach((entry) => {
              const dx = entry.originX - catBurstOrigin.x, dy = entry.originY - catBurstOrigin.y,
                length = Math.hypot(dx, dy) || 1,
                radialX = dx / length, radialY = dy / length,
                proximity = clamp(1 - length / breakRange),
                random = (catRandom(entry.index) - .5) * P.aboutCompanion.burst.impulseRandomness,
                tangential = (catRandom(entry.index + 41) - .5) * P.aboutCompanion.burst.tangentialRatio,
                impulse = P.aboutCompanion.burst.impulse * (0.55 + proximity * .45) * (entry.kind === "particle" ? .62 : 1);
              entry.vx = impulse * (radialX + random - radialY * tangential);
              entry.vy = impulse * (radialY + random + radialX * tangential);
              entry.element.classList.toggle("is-residue", catRandom(entry.index + 93) < P.aboutCompanion.burst.residueRatio && (entry.kind === "particle" || entry.importance === 1));
            });
            catPhysics.links.forEach((link) => {
              const near = clamp(1 - Math.hypot(link.x - catBurstOrigin.x, link.y - catBurstOrigin.y) / breakRange);
              link.breakWeight = near;
            });
          }
          if (!catPhysicsFrame) {
            catPhysicsLast = performance.now();
            catPhysicsFrame = requestAnimationFrame(tickCatPhysics);
          }
        }
        function tickCatPhysics(now) {
          if (!catPhysics || catPhysics.mode === "rest") { catPhysicsFrame = 0; return; }
          const dt = Math.min(.034, Math.max(.001, (now - catPhysicsLast) / 1000));
          catPhysicsLast = now;
          const elapsed = now - catPhysics.startedAt, mode = catPhysics.mode, range = catRange();
          catPhysics.entries.forEach((entry) => {
            if (mode === "charged") {
              const dx = entry.originX - catBurstOrigin.x, dy = entry.originY - catBurstOrigin.y, length = Math.hypot(dx, dy) || 1;
              const pull = range * .026 * smooth(clamp(elapsed / P.transition.catChargeMs));
              entry.x = entry.originX - (dx / length) * pull * entry.importance;
              entry.y = entry.originY - (dy / length) * pull * entry.importance;
            } else if (mode === "burst" || mode === "residue") {
              entry.x += entry.vx * dt; entry.y += entry.vy * dt;
              entry.vx *= mode === "burst" ? .976 : .94; entry.vy *= mode === "burst" ? .976 : .94;
              entry.element.style.opacity = mode === "burst" ? Math.max(.2, 1 - elapsed / (P.transition.catBurstMs * 1.25)) : entry.element.classList.contains("is-residue") ? P.aboutCompanion.residueOpacity : 0;
            } else if (mode === "recovering") {
              const ax = (entry.originX - entry.x) * P.aboutCompanion.burst.spring - entry.vx * P.aboutCompanion.burst.damping;
              const ay = (entry.originY - entry.y) * P.aboutCompanion.burst.spring - entry.vy * P.aboutCompanion.burst.damping;
              entry.vx += ax * dt; entry.vy += ay * dt; entry.x += entry.vx * dt; entry.y += entry.vy * dt;
            }
            entry.element.setAttribute("transform", `translate(${entry.x} ${entry.y})`);
          });
          catPhysics.links.forEach((link) => {
            if (mode === "burst") link.element.style.opacity = Math.max(0, .42 * (1 - link.breakWeight * clamp(elapsed / 260)));
            if (mode === "recovering") link.element.style.opacity = clamp((elapsed - P.transition.catRecoverMs * .48) / (P.transition.catRecoverMs * .32)) * .42;
          });
          catPhysics.fragments.forEach((fragment) => {
            if (mode === "burst") {
              const travel = range * P.aboutCompanion.burst.fragmentTravelRatio * clamp(elapsed / 210);
              fragment.element.setAttribute("transform", `translate(${fragment.x * travel} ${fragment.y * travel})`);
              fragment.element.dataset.travel = travel;
              fragment.element.style.opacity = String(Math.max(0, .9 * (1 - elapsed / 360)));
            }
          });
          if (mode === "burst" && elapsed >= P.transition.catBurstMs) { catPhysics.mode = "residue"; catPhysics.startedAt = now; }
          if (mode === "recovering" && elapsed >= P.transition.catRecoverMs) { resetCatPhysics(); return; }
          catPhysicsFrame = requestAnimationFrame(tickCatPhysics);
        }
        function updateUrl() {}
        function clearSignalResponse(signal) {
          if (!signal) return;
          cancelAnimationFrame(signal._responseFrame);
          clearTimeout(signal._responseTimer);
          signal._responseFrame = null;
          signal._responseTimer = null;
          signal.classList.remove("respond", "ambient-pulse");
        }
        function respond(signal, ambient = false) {
          if (
            !signal ||
            reduce.matches ||
            !finePointer.matches ||
            signal.dataset.state === "dormant"
          )
            return;
          clearSignalResponse(signal);
          signal._responseFrame = requestAnimationFrame(() => {
            signal._responseFrame = null;
            if (!signal.dataset.state) return;
            signal.classList.add("respond");
            signal.classList.toggle("ambient-pulse", ambient);
            signal._responseTimer = setTimeout(
              () => clearSignalResponse(signal),
              P.satellite.responseMs,
            );
          });
        }
        function clearAmbientPulse(signal) {
          if (!signal) return;
          clearTimeout(signal._ambientPulseTimer);
          signal._ambientPulseTimer = null;
          signal.classList.remove("ambient-pulse");
        }
        function canRunAmbientPulse(signal) {
          const state = signal?.dataset.state;
          return (
            (state === "active" || state === "stable") &&
            !reduce.matches &&
            finePointer.matches &&
            signal.dataset.staticMotion !== "true" &&
            !signal.classList.contains("attention")
          );
        }
        function scheduleAmbientPulse(signal) {
          clearAmbientPulse(signal);
          if (!canRunAmbientPulse(signal)) return;
          const [minMs, maxMs] =
              P.satellite.ambientPulse.intervalMs[signal.dataset.state],
            delay = minMs + Math.random() * (maxMs - minMs);
          signal._ambientPulseTimer = setTimeout(() => {
            signal._ambientPulseTimer = null;
            if (!canRunAmbientPulse(signal)) return;
            respond(signal, true);
            scheduleAmbientPulse(signal);
          }, delay);
        }
        function clearSignalRateTween(signal) {
          if (!signal) return;
          cancelAnimationFrame(signal._rateFrame);
          signal._rateFrame = null;
        }
        function setSignalOrbitRate(signal, targetRate, durationMs) {
          const animation = signal?._ambientMotion;
          clearSignalRateTween(signal);
          if (!animation) return;
          const startRate = animation.playbackRate,
            startedAt = performance.now();
          const tick = (now) => {
            if (signal._ambientMotion !== animation) return;
            const progress = Math.min(1, (now - startedAt) / durationMs),
              eased = progress * (2 - progress);
            animation.playbackRate = startRate + (targetRate - startRate) * eased;
            if (progress < 1) signal._rateFrame = requestAnimationFrame(tick);
            else signal._rateFrame = null;
          };
          signal._rateFrame = requestAnimationFrame(tick);
        }
        function updateSignalAttention(signal) {
          if (!signal?.dataset.state || reduce.matches || !finePointer.matches)
            return;
          const attentive = Boolean(
              signal._pointerAttention || signal._focusAttention,
            ),
            wasAttentive = signal.classList.contains("attention"),
            state = signal.dataset.state;
          signal.classList.toggle("attention", attentive);
          if (state === "dormant") return;
          if (attentive === wasAttentive) return;
          if (attentive) clearAmbientPulse(signal);
          setSignalOrbitRate(
            signal,
            attentive ? P.satellite.hoverOrbitRate : 1,
            attentive ? P.satellite.hoverSlowMs : P.satellite.hoverResumeMs,
          );
          if (attentive) respond(signal);
          else scheduleAmbientPulse(signal);
        }
        function setSignalPointerAttention(signal, attentive) {
          if (!signal) return;
          signal._pointerAttention = attentive;
          updateSignalAttention(signal);
        }
        function setSignalFocusAttention(signal, attentive) {
          if (!signal) return;
          signal._focusAttention = attentive;
          updateSignalAttention(signal);
        }
        function clearSignalAttention(signal) {
          if (!signal) return;
          signal.classList.remove("attention", "respond");
          signal._pointerAttention = false;
          signal._focusAttention = false;
          clearSignalRateTween(signal);
          clearSignalResponse(signal);
          clearAmbientPulse(signal);
          if (signal._ambientMotion) signal._ambientMotion.playbackRate = 1;
        }
        const signalDepthSignals = new Set();
        let signalDepthFrame = null;
        function placeSignalCore(signal, depth, exposeDepth = true) {
          const core = signal?.querySelector(".signal-core"),
            layer = signal?.querySelector(`.signal-core-layer.${depth}`);
          if (!core || !layer) return;
          if (core.parentElement !== layer) layer.append(core);
          if (exposeDepth) signal.dataset.depth = depth;
        }
        function stopSignalDepthSync(signal) {
          if (!signal) return;
          signalDepthSignals.delete(signal);
          if (!signalDepthSignals.size && signalDepthFrame) {
            cancelAnimationFrame(signalDepthFrame);
            signalDepthFrame = null;
          }
          placeSignalCore(signal, "front", false);
          delete signal.dataset.depth;
        }
        function syncSignalDepth(signal) {
          const state = signal?.dataset.state,
            animation = signal?._ambientMotion;
          if (!state || !animation || signal.dataset.staticMotion === "true") {
            stopSignalDepthSync(signal);
            return;
          }
          const duration = Number(animation.effect?.getTiming().duration),
            elapsed = Number(animation.currentTime || 0),
            progress =
              duration > 0
                ? ((elapsed % duration) + duration) % duration / duration
                : 0,
            angle =
              P.satellite.orbitPath.startAngleDeg +
              P.satellite.motionWindowPercent[state] * 3.6 * progress,
            depthValue = Math.sin((angle * Math.PI) / 180),
            threshold = P.satellite.depthHysteresis,
            currentDepth = signal.dataset.depth;
          let nextDepth = currentDepth || (depthValue >= 0 ? "front" : "back");
          if (currentDepth === "front" && depthValue < -threshold)
            nextDepth = "back";
          else if (currentDepth === "back" && depthValue > threshold)
            nextDepth = "front";
          placeSignalCore(signal, nextDepth);
        }
        function runSignalDepthSync() {
          signalDepthFrame = null;
          signalDepthSignals.forEach(syncSignalDepth);
          if (signalDepthSignals.size)
            signalDepthFrame = requestAnimationFrame(runSignalDepthSync);
        }
        function startSignalDepthSync(signal) {
          if (!signal || signal.dataset.staticMotion === "true") return;
          signalDepthSignals.add(signal);
          syncSignalDepth(signal);
          if (!signalDepthFrame)
            signalDepthFrame = requestAnimationFrame(runSignalDepthSync);
        }
        function setSignalMotion(signal, state) {
          clearSignalRateTween(signal);
          clearAmbientPulse(signal);
          clearSignalResponse(signal);
          stopSignalDepthSync(signal);
          signal._ambientMotion?.cancel();
          signal._ambientMotion = null;
          const core = signal.querySelector(".signal-core"),
            path = P.satellite.orbitPath,
            [centerX, centerY] = path.centerPercent,
            [baseRadiusX, baseRadiusY] = path.radiusPercent,
            travel = P.satellite.microTravelPx[state] || 0,
            radiusX = baseRadiusX + travel * 0.42,
            radiusY = baseRadiusY + travel * 0.24,
            pointAt = (angleDeg) => {
              const angle = (angleDeg * Math.PI) / 180;
              return {
                left: `${centerX + Math.cos(angle) * radiusX}%`,
                top: `${centerY + Math.sin(angle) * radiusY}%`,
              };
            },
            staticMotion =
              reduce.matches || !finePointer.matches || state === "dormant",
            start = pointAt(
              staticMotion ? P.satellite.staticAngleDeg : path.startAngleDeg,
            );
          core.style.left = start.left;
          core.style.top = start.top;
          signal.dataset.staticMotion = String(staticMotion);
          if (staticMotion) {
            placeSignalCore(signal, "front");
            return;
          }
          const coverage = P.satellite.motionWindowPercent[state] / 100,
            samples = Math.max(3, path.sampleCount),
            keyframes = Array.from({ length: samples + 1 }, (_, index) => ({
              ...pointAt(path.startAngleDeg + coverage * 360 * (index / samples)),
              offset: index / samples,
            }));
          signal._ambientMotion = core.animate(keyframes, {
            duration: P.satellite.microDurationMs[state],
            iterations: Infinity,
            easing: "linear",
          });
          startSignalDepthSync(signal);
        }
        function applyActivityProjection() {
          planets.forEach((planet) => {
            const key = planet.dataset.planet,
              signal = planet.querySelector(".signal-wrap"),
              status = document.getElementById(`${key}-signal-status`);
            if (!signal) return;
            const state = activityProjection?.[key] ?? null;
            stopSignalDepthSync(signal);
            clearSignalAttention(signal);
            signal._ambientMotion?.cancel();
            signal._ambientMotion = null;
            if (state) {
              signal.dataset.state = state;
              signal.dataset.particles = P.satellite.particleCount[state];
              signal.style.setProperty(
                "--particle-duration",
                `${P.satellite.microDurationMs[state] || 1}ms`,
              );
              signal.style.setProperty(
                "--particle-opacity",
                P.satellite.particleOpacity[state],
              );
              signal.style.setProperty(
                "--signal-opacity",
                P.satellite.opacity[state],
              );
              signal.style.setProperty(
                "--orbit",
                P.satellite.orbitOpacity[state],
              );
              signal.style.setProperty(
                "--signal-scale",
                P.satellite.shellScale[state],
              );
              status.textContent = signalStateText[state];
              setSignalMotion(signal, state);
              scheduleAmbientPulse(signal);
            } else {
              clearAmbientPulse(signal);
              clearSignalResponse(signal);
              delete signal.dataset.state;
              delete signal.dataset.particles;
              delete signal.dataset.staticMotion;
              status.textContent = signalStateText.unavailable;
            }
          });
          updateUrl();
        }
        function cameraMetrics() {
          const mobile = innerWidth <= 760,
            baseJourneyVh = mobile
              ? P.camera.journeyVh.mobile
              : P.camera.journeyVh[variant],
            stepVh = mobile
              ? P.camera.focusSequence.stepVh.mobile
              : P.camera.focusSequence.stepVh.desktop,
            overviewHandoffVh = mobile
              ? P.camera.focusSequence.overviewHandoffVh.mobile
              : P.camera.focusSequence.overviewHandoffVh.desktop,
            focusCount = P.camera.focusSequence.order.length,
            pxPerVh = innerHeight / 100;
          const totalJourneyVh = reduce.matches
            ? baseJourneyVh
            : baseJourneyVh +
              P.camera.focusSequence.overviewHoldVh +
              overviewHandoffVh +
              stepVh * focusCount +
              P.camera.focusSequence.footerReleaseVh;
          const baseTravelPx = Math.max(
              pxPerVh,
              (baseJourneyVh - 100) * pxPerVh,
            ),
            overviewHoldPx = P.camera.focusSequence.overviewHoldVh * pxPerVh,
            overviewHandoffPx = overviewHandoffVh * pxPerVh,
            stepPx = stepVh * pxPerVh,
            footerReleasePx = P.camera.focusSequence.footerReleaseVh * pxPerVh,
            focusStartPx = baseTravelPx + overviewHoldPx,
            focusStepsStartPx = focusStartPx + overviewHandoffPx,
            focusStepsEndPx = focusStepsStartPx + stepPx * focusCount;
          return {
            mobile,
            baseJourneyVh,
            stepVh,
            totalJourneyVh,
            baseTravelPx,
            overviewHoldPx,
            overviewHandoffPx,
            stepPx,
            footerReleasePx,
            focusStartPx,
            focusStepsStartPx,
            focusStepsEndPx,
          };
        }
        function overviewInteractiveProgress() {
          const { interactiveStart, depthOffset } = P.planet.emergence,
            latestPlanetThreshold = Math.max(
              ...Object.values(depthOffset).map(
                ({ progress }) => interactiveStart + progress * 0.12,
              ),
            );
          return Math.min(
            1,
            Math.max(P.camera.approachEnd, latestPlanetThreshold),
          );
        }
        function setVariant(next) {
          variant = next;
          body.dataset.variant = next;
          root.style.setProperty(
            "--journey",
            `${cameraMetrics().totalJourneyVh}vh`,
          );
          updateUrl();
          updateScene();
        }
        function resolveFocusFrame(scrollPx, metrics) {
          if (reduce.matches || scrollPx < metrics.focusStartPx) return null;
          if (scrollPx < metrics.focusStepsStartPx)
            return {
              phase: "overview-enter",
              fromKey: null,
              toKey: "about",
              progress: clamp(
                (scrollPx - metrics.focusStartPx) / metrics.overviewHandoffPx,
              ),
              primaryKey: "about",
            };
          if (scrollPx < metrics.focusStepsEndPx) {
            const sequence = P.camera.focusSequence.order,
              raw = (scrollPx - metrics.focusStepsStartPx) / metrics.stepPx,
              index = clamp(Math.floor(raw), 0, sequence.length - 1),
              local = clamp(raw - index),
              key = sequence[index],
              next = sequence[index + 1],
              hold = P.camera.focusSequence.holdRatio;
            if (!next || local <= hold)
              return {
                phase: "hold",
                fromKey: key,
                toKey: null,
                progress: local / Math.max(hold, 0.001),
                primaryKey: key,
              };
            const handoff = clamp((local - hold) / (1 - hold));
            return {
              phase: "handoff",
              fromKey: key,
              toKey: next,
              progress: handoff,
              primaryKey: handoff < 0.5 ? key : next,
            };
          }
          if (scrollPx < metrics.focusStepsEndPx + metrics.footerReleasePx)
            return {
              phase: "footer-release",
              fromKey: "learn",
              toKey: null,
              progress: clamp(
                (scrollPx - metrics.focusStepsEndPx) / metrics.footerReleasePx,
              ),
              primaryKey: "learn",
            };
          return null;
        }
        function getShot(key) {
          const base = P.planet.focusShots[key],
            mobile = innerWidth <= 760 ? base.mobile : null;
          return mobile
            ? { ...base, ...mobile, copy: { ...base.copy, ...mobile.copy } }
            : base;
        }
        function shotDiameter(shot) {
          return Math.min(
            (Math.min(innerWidth, innerHeight) * shot.diameterVmin) / 100,
            shot.maxPx,
          );
        }
        function setSlotContent(slot, key) {
          if (slot.dataset.identity === key) return;
          slot.dataset.identity = key;
          const meta = focusMeta[key],
            material = P.planet.materials[key],
            isAbout = key === "about";
          slot.querySelector(".focus-title").textContent = isAbout
            ? "木下"
            : meta.title;
          slot.querySelector(".focus-kicker").textContent = isAbout
            ? "PERSONAL ORBIT"
            : meta.kicker;
          slot.querySelector(".focus-description").textContent = isAbout
            ? "一个安静、偏远、只在 Home 原地展开的私人世界。"
            : meta.description;
          const notes = isAbout
            ? ["直接展开与豹猫彩蛋通往同一状态。", "返回星图后可继续自然滚动。"]
            : meta.notes;
          slot.querySelector(".focus-notes").replaceChildren(
            ...notes.map((text) => {
              const li = document.createElement("li");
              li.textContent = text;
              return li;
            }),
          );
          slot.style.setProperty(
            "--focus-planet-asset",
            `url("${material.asset}")`,
          );
          slot.style.setProperty(
            "--focus-material-scale",
            material.focusScale * P.planet.focusSurfaceScale,
          );
          slot.style.setProperty(
            "--focus-planet-contrast",
            material.contrast * P.planet.lighting.focusMaterialBoost,
          );
          slot.style.setProperty(
            "--focus-planet-saturation",
            material.saturation,
          );
          if (slot === primarySlot) {
            focusEnter.textContent = meta.action;
            focusBack.textContent = "返回星图";
          }
        }
        function setSlotGeometry(slot, key, state) {
          const shot = getShot(key),
            t = smooth(state.progress ?? 1),
            targetSize = shotDiameter(shot);
          let x = shot.x,
            y = shot.y,
            size = targetSize,
            scale = shot.scale,
            planetOpacity = state.opacity ?? 1,
            copyOpacity = state.copyOpacity ?? planetOpacity;
          if (state.kind === "overview") {
            const rect = document
              .querySelector(`[data-planet="${key}"]`)
              .getBoundingClientRect();
            x = lerp(
              ((rect.left + rect.width / 2) / innerWidth) * 100,
              shot.x,
              t,
            );
            y = lerp(
              ((rect.top + rect.height / 2) / innerHeight) * 100,
              shot.y,
              t,
            );
            size = lerp(rect.width, targetSize, t);
            scale = lerp(1, shot.scale, t);
          }
          if (state.kind === "incoming") {
            x = shot.x + shot.entryOffset[0] * (1 - t);
            y = shot.y + shot.entryOffset[1] * (1 - t);
            scale = shot.scale * lerp(0.88, 1, t);
            planetOpacity = smooth(clamp((state.progress - 0.02) / 0.82));
            copyOpacity = smooth(clamp((state.progress - 0.26) / 0.66));
          }
          if (state.kind === "outgoing") {
            x = shot.x + shot.exitOffset[0] * t;
            y = shot.y + shot.exitOffset[1] * t;
            scale = shot.scale * lerp(1, 1.06, t);
            planetOpacity = 1 - smooth(clamp((state.progress - 0.12) / 0.86));
            copyOpacity = 1 - smooth(clamp(state.progress / 0.68));
          }
          if (state.kind === "footer") {
            y = shot.y - shot.exitOffset[1] * t * 0.7;
            scale = shot.scale * lerp(1, 1.08, t);
            planetOpacity = 1 - smooth(state.progress);
            copyOpacity = 1 - smooth(clamp(state.progress / 0.62));
          }
          slot.style.setProperty("--shot-x", `${x}%`);
          slot.style.setProperty("--shot-y", `${y}%`);
          slot.style.setProperty("--shot-size", `${size}px`);
          slot.style.setProperty("--shot-max", `${size}px`);
          slot.style.setProperty("--shot-scale", scale);
          slot.style.setProperty("--shot-opacity", state.opacity ?? 1);
          slot.style.setProperty("--planet-opacity", planetOpacity);
          slot.style.setProperty("--copy-opacity", copyOpacity);
          slot.style.setProperty("--focus-crop", shot.crop);
          slot.style.setProperty("--copy-x", `${shot.copy.x}%`);
          slot.style.setProperty("--copy-y", `${shot.copy.y}%`);
          slot.style.setProperty("--copy-width-ch", shot.copy.widthCh);
          slot.style.setProperty("--copy-align", shot.copy.align);
        }
        function setSlotSemantics(primaryKey) {
          focusSlots.forEach((slot) => {
            const interactive =
              slot === primarySlot && slot.dataset.key === primaryKey;
            slot.dataset.interactive = String(interactive);
            slot.inert = !interactive;
            slot.setAttribute("aria-hidden", String(!interactive));
          });
        }
        function hideFocusVisual() {
          body.classList.remove("focus-open");
          delete body.dataset.focusMode;
          delete focusLayer.dataset.open;
          focusLayer.style.removeProperty("opacity");
          focusLayer.setAttribute("aria-hidden", "true");
          focusSlots.forEach((slot) => {
            slot.style.setProperty("--shot-opacity", 0);
            slot.inert = true;
            slot.setAttribute("aria-hidden", "true");
          });
          root.style.setProperty("--focus-map-opacity-current", 1);
          root.style.setProperty("--focus-map-scale-current", 1);
        }
        function renderScrollFocus(frame) {
          const previousFocus = activeFocus;
          if (!frame) {
            if (focusMode === "scroll") {
              if (
                previousFocus === "about" &&
                (focusTrigger === cat || catState === "burst")
              ) {
                recoverCatCompanion();
                focusTrigger = null;
              }
              activeFocus = null;
              focusMode = null;
              hideFocusVisual();
            }
            return;
          }
          focusMode = "scroll";
          body.dataset.focusMode = "scroll";
          activeFocus = frame.primaryKey;
          body.classList.add("focus-open");
          focusLayer.dataset.open = "true";
          focusLayer.style.opacity = "1";
          focusLayer.setAttribute("aria-hidden", "false");
          focusLayer.dataset.focus = activeFocus;
          let mapProgress = 1;
          if (
            previousFocus === "about" &&
            activeFocus !== "about" &&
            (focusTrigger === cat || catState === "burst")
          ) {
            recoverCatCompanion();
            focusTrigger = null;
          }
          if (frame.phase === "overview-enter") {
            primarySlot.dataset.key = "about";
            secondarySlot.dataset.key = "";
            setSlotContent(primarySlot, "about");
            setSlotGeometry(primarySlot, "about", {
              kind: "overview",
              progress: frame.progress,
              opacity: 1,
            });
            secondarySlot.style.setProperty("--shot-opacity", 0);
            mapProgress = frame.progress;
          }
          if (frame.phase === "hold") {
            primarySlot.dataset.key = frame.fromKey;
            secondarySlot.dataset.key = "";
            setSlotContent(primarySlot, frame.fromKey);
            setSlotGeometry(primarySlot, frame.fromKey, {
              kind: "stable",
              progress: 1,
              opacity: 1,
            });
            secondarySlot.style.setProperty("--shot-opacity", 0);
          }
          if (frame.phase === "handoff") {
            primarySlot.dataset.key = frame.fromKey;
            secondarySlot.dataset.key = frame.toKey;
            setSlotContent(primarySlot, frame.fromKey);
            setSlotContent(secondarySlot, frame.toKey);
            setSlotGeometry(primarySlot, frame.fromKey, {
              kind: "outgoing",
              progress: frame.progress,
              opacity: 1,
            });
            setSlotGeometry(secondarySlot, frame.toKey, {
              kind: "incoming",
              progress: frame.progress,
              opacity: 1,
            });
          }
          if (frame.phase === "footer-release") {
            primarySlot.dataset.key = "learn";
            secondarySlot.dataset.key = "";
            setSlotContent(primarySlot, "learn");
            setSlotGeometry(primarySlot, "learn", {
              kind: "footer",
              progress: frame.progress,
              opacity: 1,
            });
            secondarySlot.style.setProperty("--shot-opacity", 0);
          }
          root.style.setProperty(
            "--focus-map-opacity-current",
            lerp(1, P.camera.focusMapOpacity, smooth(mapProgress)),
          );
          root.style.setProperty(
            "--focus-map-scale-current",
            lerp(1, P.camera.focusMapScale, smooth(mapProgress)),
          );
          setSlotSemantics(frame.phase === "handoff" ? null : activeFocus);
          document
            .querySelectorAll(".flight-index button")
            .forEach((b) =>
              b.classList.toggle("active", b.dataset.focus === activeFocus),
            );
        }
        function updateScene() {
          const metrics = cameraMetrics(),
            scrollPx = clamp(
              -journey.getBoundingClientRect().top,
              0,
              Math.max(1, journey.offsetHeight - innerHeight),
            ),
            rawProgress = clamp(scrollPx / metrics.baseTravelPx),
            p = reduce.matches ? 1 : rawProgress,
            approach = clamp(
              (p - P.camera.approachStart) / P.camera.approachSpan,
            ),
            overview = clamp(
              (p - P.camera.overviewStart) / P.camera.overviewSpan,
            ),
            emergence = P.planet.emergence,
            overviewInteractiveStart = overviewInteractiveProgress();
          root.style.setProperty("--journey", `${metrics.totalJourneyVh}vh`);
          root.style.setProperty("--progress", p.toFixed(3));
          root.style.setProperty("--approach", approach.toFixed(3));
          root.style.setProperty("--overview", overview.toFixed(3));
          root.style.setProperty(
            "--galaxy-dust-opacity",
            (
              P.environment.starfield.galaxy.dustOpacity *
              (0.92 + overview * 0.08)
            ).toFixed(3),
          );
          planets.forEach((planet) => {
            const key = planet.dataset.planet,
              [tx, ty, z] = P.layout[variant].planets[key],
              ts =
                P.planet.overviewScale[variant][key] * P.planet.depthScale[key],
              depth = emergence.depthOffset[key],
              sphereStart = emergence.sphereStart + depth.progress,
              sphereEnd = emergence.sphereEnd + depth.progress * 0.22,
              sphere = smooth(
                clamp((p - sphereStart) / (sphereEnd - sphereStart)),
              ),
              halo = smooth(
                clamp(
                  (p - (emergence.haloStart + depth.progress * 0.45)) /
                    (sphereStart - emergence.haloStart),
                ),
              ),
              label = smooth(
                clamp(
                  (p - (emergence.labelStart + depth.progress * 0.16)) /
                    (1 - emergence.labelStart),
                ),
              ),
              ready =
                p >= emergence.interactiveStart + depth.progress * 0.12 &&
                !body.classList.contains("focus-open");
            planet.style.setProperty("--x", `${tx}vw`);
            planet.style.setProperty("--y", `${ty}vh`);
            planet.style.setProperty(
              "--emerge-x",
              `${depth.xVw * (1 - sphere)}vw`,
            );
            planet.style.setProperty(
              "--emerge-y",
              `${depth.yVh * (1 - sphere)}vh`,
            );
            planet.style.setProperty("--scale", ts.toFixed(3));
            planet.style.setProperty(
              "--sphere-scale",
              lerp(0.08, 1, sphere).toFixed(3),
            );
            planet.style.setProperty("--sphere-visible", sphere.toFixed(3));
            planet.style.setProperty(
              "--target-visible",
              clamp(emergence.targetOpacity * (1 - sphere * 0.92)),
            );
            planet.style.setProperty(
              "--target-halo",
              (halo * emergence.haloStrength * (1 - sphere * 0.62)).toFixed(3),
            );
            planet.style.setProperty(
              "--target-tone",
              emergence.targetTone[key],
            );
            planet.style.setProperty("--label-visible", label.toFixed(3));
            planet.style.setProperty("--signal-reveal", label.toFixed(3));
            planet.style.setProperty(
              "--visible",
              p >= emergence.targetStart ? 1 : 0,
            );
            planet.style.setProperty("--z", z);
            planet.classList.toggle("ready", ready);
            planet.tabIndex = ready ? 0 : -1;
          });
          const aboutRect = aboutPlanet.getBoundingClientRect(),
            aboutRadius = aboutRect.width / 2,
            companion = P.aboutCompanion.offsetPlanetRadii,
            catX = clamp(
              aboutRect.left + aboutRadius + aboutRadius * companion.x,
              72,
              innerWidth - 72,
            ),
            catY = clamp(
              aboutRect.top + aboutRadius + aboutRadius * companion.y,
              66,
              innerHeight - 66,
            ),
            canEnter = aboutPlanet.classList.contains("ready");
          catZone.style.setProperty("--cat-x", `${catX}px`);
          catZone.style.setProperty("--cat-y", `${catY}px`);
          catZone.classList.toggle("ready", canEnter);
          cat.tabIndex = canEnter ? 0 : -1;
          cat.disabled = !canEnter;
          if (canEnter && !signalsRevealed) {
            signalsRevealed = true;
          } else if (overview < 0.08) {
            signalsRevealed = false;
          }
          const frame = resolveFocusFrame(scrollPx, metrics);
          if (focusMode !== "manual" && focusMode !== "returning")
            renderScrollFocus(frame);
          const stageText = activeFocus
            ? [
                `03 / ${activeFocus.toUpperCase()} FOCUS`,
                "content first · planet as spatial window",
                `FOCUS / ${activeFocus.toUpperCase()}`,
                "NEAR",
              ]
            : p < P.camera.entryEnd
              ? [
                  "00 / ENTRY",
                  "five distant targets · one living starfield",
                  "ENTRY",
                  "FAR",
                ]
              : p < overviewInteractiveStart
                ? [
                    "01 / APPROACH",
                    "target stars become small worlds in place",
                    "APPROACH",
                    "MID",
                  ]
                : [
                    "02 / STAR MAP",
                    "five stable regions · full warm geologies",
                    "STAR MAP",
                    "OVERVIEW",
                  ];
          document.getElementById("stage-name").textContent = stageText[0];
          document.getElementById("stage-copy").textContent = stageText[1];
          if (!activeFocus) {
            const anchor =
              p < P.camera.entryEnd
                ? "entry"
                : p < overviewInteractiveStart
                  ? "approach"
                  : "overview";
            document
              .querySelectorAll(".flight-index button")
              .forEach((b) =>
                b.classList.toggle("active", b.dataset.anchor === anchor),
              );
          }
        }
        function targetFocusScroll(key) {
          const metrics = cameraMetrics(),
            index = P.camera.focusSequence.order.indexOf(key);
          return (
            journey.offsetTop +
            metrics.focusStepsStartPx +
            metrics.stepPx * (index + P.camera.focusSequence.holdRatio * 0.5)
          );
        }
        function cancelManualAnimation() {
          focusTransitionToken++;
          manualAnimations.forEach((animation) => animation.cancel());
          manualAnimations = [];
          focusProxy.classList.remove("active");
        }
        function jump(mark) {
          cancelManualAnimation();
          closeFocusInstant(false);
          const metrics = cameraMetrics(),
            p =
              mark === "overview"
                ? Math.min(1, overviewInteractiveProgress() + 0.002)
                : { entry: 0.01, approach: 0.36 }[mark];
          scrollTo({
            top: journey.offsetTop + metrics.baseTravelPx * p,
            behavior: reduce.matches ? "auto" : "smooth",
          });
        }
        function setManualFocus(key) {
          activeFocus = key;
          focusMode = "manual";
          body.dataset.focusMode = "manual";
          body.classList.add("focus-open");
          focusLayer.dataset.open = "true";
          focusLayer.style.opacity = "1";
          focusLayer.setAttribute("aria-hidden", "false");
          focusLayer.dataset.focus = key;
          primarySlot.dataset.key = key;
          secondarySlot.dataset.key = "";
          setSlotContent(primarySlot, key);
          setSlotGeometry(primarySlot, key, {
            kind: "stable",
            progress: 1,
            opacity: 1,
          });
          secondarySlot.style.setProperty("--shot-opacity", 0);
          setSlotSemantics(key);
          root.style.setProperty(
            "--focus-map-opacity-current",
            P.camera.focusMapOpacity,
          );
          root.style.setProperty(
            "--focus-map-scale-current",
            P.camera.focusMapScale,
          );
        }
        function animateFocusProxy(
          key,
          sourceRect,
          onComplete,
          sourceAssetKey = key,
        ) {
          const token = ++focusTransitionToken,
            shot = getShot(key),
            size = shotDiameter(shot),
            target = {
              left: (innerWidth * shot.x) / 100 - size / 2,
              top: (innerHeight * shot.y) / 100 - size / 2,
              width: size,
              height: size,
            },
            material = P.planet.materials[sourceAssetKey],
            duration = P.transition.focusInMs,
            mobile = innerWidth <= 760,
            copyFrom = mobile
              ? "translateY(18px)"
              : "translateY(calc(-50% + 18px))",
            copyTo = mobile ? "translateY(0)" : "translateY(-50%)";
          focusProxy.style.setProperty(
            "--proxy-asset",
            `url("${material.asset}")`,
          );
          focusProxy.style.setProperty(
            "--proxy-contrast",
            material.contrast * P.planet.lighting.focusMaterialBoost,
          );
          focusProxy.style.setProperty(
            "--proxy-saturation",
            material.saturation,
          );
          focusProxy.classList.add("active");
          primarySlot.style.setProperty("--planet-opacity", 1);
          primarySlot.style.setProperty("--copy-opacity", 1);
          const proxyAnimation = focusProxy.animate(
              [
                {
                  left: `${sourceRect.left}px`,
                  top: `${sourceRect.top}px`,
                  width: `${sourceRect.width}px`,
                  height: `${sourceRect.height}px`,
                  opacity: 1,
                },
                {
                  left: `${target.left}px`,
                  top: `${target.top}px`,
                  width: `${target.width}px`,
                  height: `${target.height}px`,
                  opacity: 0.92,
                  offset: 0.72,
                },
                {
                  left: `${target.left}px`,
                  top: `${target.top}px`,
                  width: `${target.width}px`,
                  height: `${target.height}px`,
                  opacity: 0,
                },
              ],
              {
                duration,
                easing: "cubic-bezier(.16,.76,.18,1)",
                fill: "forwards",
              },
            ),
            planetAnimation = primarySlot
              .querySelector(".focus-planet-wrap")
              .animate(
                [{ opacity: 0 }, { opacity: 0, offset: 0.42 }, { opacity: 1 }],
                { duration, easing: "ease-out", fill: "forwards" },
              ),
            copyAnimation = primarySlot.querySelector(".focus-copy").animate(
              [
                { opacity: 0, transform: copyFrom },
                { opacity: 0, transform: copyFrom, offset: 0.58 },
                { opacity: 1, transform: copyTo },
              ],
              { duration, easing: "ease-out", fill: "forwards" },
            );
          manualAnimations = [proxyAnimation, planetAnimation, copyAnimation];
          proxyAnimation.finished
            .then(() => {
              if (token !== focusTransitionToken) return;
              manualAnimations = [];
              focusProxy.classList.remove("active");
              onComplete?.();
            })
            .catch(() => {});
        }
        function navigateToFocus(key, source) {
          const sourcePlanet = document.querySelector(`[data-planet="${key}"]`),
            sourceRect = (
              source?.closest?.(".planet") ||
              source ||
              sourcePlanet
            ).getBoundingClientRect(),
            sourceAssetKey = activeFocus || key;
          cancelManualAnimation();
          focusTrigger = source || sourcePlanet;
          setManualFocus(key);
          if (reduce.matches) {
            primarySlot.style.setProperty("--planet-opacity", 1);
            primarySlot.style.setProperty("--copy-opacity", 1);
            focusBack.focus();
            return;
          }
          animateFocusProxy(
            key,
            sourceRect,
            () => {
              scrollTo({ top: targetFocusScroll(key), behavior: "auto" });
              focusMode = null;
              delete body.dataset.focusMode;
              updateScene();
              focusBack.focus();
            },
            sourceAssetKey,
          );
        }
        function jumpFocus(key) {
          const source = activeFocus
            ? primarySlot.querySelector(".focus-planet-wrap")
            : document.querySelector(`[data-planet="${key}"]`);
          navigateToFocus(key, source);
        }
        document.getElementById("discover").onclick = () => jump("overview");
        document
          .querySelectorAll(".flight-index [data-anchor]")
          .forEach((b) => (b.onclick = () => jump(b.dataset.anchor)));
        document
          .querySelectorAll(".flight-index [data-focus]")
          .forEach((b) => (b.onclick = () => jumpFocus(b.dataset.focus)));
        function resetCatToRest() {
          clearTimeout(chargeTimer);
          clearTimeout(catBurstTimer);
          clearTimeout(catRecoverTimer);
          catState = "rest";
          resetCatPhysics();
          body.classList.remove("cat-residue-visible");
          catZone.classList.remove("charged", "burst", "recovering");
          document.getElementById("cat-hint").textContent = "豹猫卫星彩蛋";
        }
        function recoverCatCompanion(restoreFocus = false, force = false) {
          if (!force && catState !== "burst" && focusTrigger !== cat) return;
          clearTimeout(chargeTimer);
          clearTimeout(catBurstTimer);
          body.classList.remove("cat-residue-visible");
          if (reduce.matches) {
            resetCatToRest();
            if (restoreFocus && catZone.classList.contains("ready")) cat.focus();
            return;
          }
          catState = "recover";
          beginCatPhysics("recovering");
          catZone.classList.remove("burst");
          catZone.classList.add("recovering");
          clearTimeout(catRecoverTimer);
          catRecoverTimer = setTimeout(
            () => {
              catState = "rest";
              catZone.classList.remove("recovering");
              document.getElementById("cat-hint").textContent = "豹猫卫星彩蛋";
              if (restoreFocus) cat.focus();
            },
            reduce.matches ? 1 : P.transition.catRecoverMs,
          );
        }
        function closeFocusInstant(restoreFocus = true) {
          if (!activeFocus) return;
          const returnTarget = focusTrigger,
            wasCat = returnTarget === cat;
          cancelManualAnimation();
          body.classList.remove("focus-returning");
          hideFocusVisual();
          activeFocus = null;
          focusMode = null;
          focusTrigger = null;
          if (wasCat) recoverCatCompanion(restoreFocus, true);
          else if (returnTarget && restoreFocus) returnTarget.focus();
        }
        function animateFocusReturn(key, onComplete) {
          const token = ++focusTransitionToken,
            sourceRect = primarySlot
              .querySelector(".focus-planet-wrap")
              .getBoundingClientRect(),
            targetRect = document
              .querySelector(`[data-planet="${key}"]`)
              .getBoundingClientRect(),
            material = P.planet.materials[key],
            duration = P.transition.focusOutMs;
          focusProxy.style.setProperty(
            "--proxy-asset",
            `url("${focusAsset(key)}")`,
          );
          focusProxy.style.setProperty("--proxy-contrast", material.contrast);
          focusProxy.style.setProperty(
            "--proxy-saturation",
            material.saturation,
          );
          focusProxy.classList.add("active");
          body.classList.add("focus-returning");
          const proxyAnimation = focusProxy.animate(
              [
                {
                  left: `${sourceRect.left}px`,
                  top: `${sourceRect.top}px`,
                  width: `${sourceRect.width}px`,
                  height: `${sourceRect.height}px`,
                  opacity: 1,
                },
                {
                  left: `${targetRect.left}px`,
                  top: `${targetRect.top}px`,
                  width: `${targetRect.width}px`,
                  height: `${targetRect.height}px`,
                  opacity: 0.82,
                  offset: 0.78,
                },
                {
                  left: `${targetRect.left}px`,
                  top: `${targetRect.top}px`,
                  width: `${targetRect.width}px`,
                  height: `${targetRect.height}px`,
                  opacity: 0,
                },
              ],
              {
                duration,
                easing: "cubic-bezier(.2,.72,.18,1)",
                fill: "forwards",
              },
            ),
            planetAnimation = primarySlot
              .querySelector(".focus-planet-wrap")
              .animate(
                [{ opacity: 1 }, { opacity: 0, offset: 0.72 }, { opacity: 0 }],
                { duration, easing: "ease-in", fill: "forwards" },
              ),
            copyAnimation = primarySlot
              .querySelector(".focus-copy")
              .animate(
                [
                  { opacity: 1 },
                  {
                    opacity: 0,
                    transform:
                      innerWidth <= 760
                        ? "translateY(18px)"
                        : "translateY(calc(-50% + 18px))",
                  },
                ],
                {
                  duration: duration * 0.62,
                  easing: "ease-in",
                  fill: "forwards",
                },
              );
          manualAnimations = [proxyAnimation, planetAnimation, copyAnimation];
          proxyAnimation.finished
            .then(() => {
              if (token !== focusTransitionToken) return;
              manualAnimations = [];
              focusProxy.classList.remove("active");
              body.classList.remove("focus-returning");
              onComplete?.();
            })
            .catch(() => {});
        }
        function returnToOverview() {
          const returnTarget = focusTrigger;
          closeFocusInstant(false);
          focusMode = "returning";
          body.dataset.focusMode = "returning";
          const metrics = cameraMetrics(),
            target =
              journey.offsetTop +
              metrics.baseTravelPx *
                Math.min(1, overviewInteractiveProgress() + 0.002);
          let finished = false;
          const finish = () => {
            if (finished || focusMode !== "returning") return;
            finished = true;
            clearTimeout(returnTimer);
            focusMode = null;
            delete body.dataset.focusMode;
            updateScene();
            returnTarget?.focus();
          };
          addEventListener("scrollend", finish, { once: true });
          returnTimer = setTimeout(finish, P.transition.focusOutMs + 500);
          scrollTo({
            top: target,
            behavior: reduce.matches ? "auto" : "smooth",
          });
          if (reduce.matches) finish();
        }
        function closeFocus() {
          if (focusMode === "scroll") {
            returnToOverview();
            return;
          }
          if (reduce.matches) {
            closeFocusInstant(true);
            updateScene();
            return;
          }
          const key = activeFocus;
          animateFocusReturn(key, () => {
            closeFocusInstant(true);
            updateScene();
          });
        }
        function previewDestination() {
          if (!activeFocus || activeFocus === "about") return;
          const destination = destinations[activeFocus];
          body.classList.add("pushing");
          setTimeout(() => location.assign(destination), reduce.matches ? 1 : P.transition.actionPreviewMs);
        }
        focusBack.onclick = closeFocus;
        focusEnter.onclick = previewDestination;
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && activeFocus) closeFocus();
        });
        planets.forEach((p) => {
          p.addEventListener("click", () =>
            navigateToFocus(p.dataset.planet, p),
          );
          p.addEventListener("mouseenter", () =>
            setSignalPointerAttention(p.querySelector(".signal-wrap"), true),
          );
          p.addEventListener("mouseleave", () =>
            setSignalPointerAttention(p.querySelector(".signal-wrap"), false),
          );
          p.addEventListener("focus", () =>
            setSignalFocusAttention(p.querySelector(".signal-wrap"), true),
          );
          p.addEventListener("blur", () =>
            setSignalFocusAttention(p.querySelector(".signal-wrap"), false),
          );
        });
        aboutPlanet.addEventListener("mouseenter", () =>
          catZone.classList.add("revealed"),
        );
        aboutPlanet.addEventListener("mouseleave", () =>
          catZone.classList.remove("revealed"),
        );
        aboutPlanet.addEventListener("focus", () =>
          catZone.classList.add("revealed"),
        );
        aboutPlanet.addEventListener("blur", () =>
          catZone.classList.remove("revealed"),
        );
        function enterAboutFromCat() {
          clearTimeout(chargeTimer);
          clearTimeout(catBurstTimer);
          catState = "burst";
          body.classList.add("cat-residue-visible");
          catZone.classList.remove("charged", "recovering");
          catZone.classList.add("burst");
          beginCatPhysics("burst");
          document.getElementById("cat-hint").textContent = "豹猫卫星彩蛋";
          if (reduce.matches) {
            resetCatToRest();
            navigateToFocus("about", cat);
            return;
          }
          catBurstTimer = setTimeout(() => {
            catBurstTimer = undefined;
            if (catState === "burst") {
              if (catPhysics) catPhysics.mode = "residue";
              navigateToFocus("about", cat);
            }
          }, P.transition.catBurstMs);
        }
        function activateCat({ direct = false, event } = {}) {
          if (!catZone.classList.contains("ready") || catState === "burst") return;
          recordCatBurstOrigin(event);
          if (reduce.matches || direct) {
            enterAboutFromCat();
            return;
          }
          if (catState === "rest" || catState === "recover") {
            catState = "charged";
            beginCatPhysics("charged");
            catZone.classList.remove("recovering");
            catZone.classList.add("charged");
            document.getElementById("cat-hint").textContent =
              "再次点击，进入 About";
            clearTimeout(chargeTimer);
            chargeTimer = setTimeout(
              () => {
                if (catState === "charged") {
                  resetCatToRest();
                }
              },
              P.transition.catChargeMs,
            );
            return;
          }
          if (catState === "charged") {
            enterAboutFromCat();
          }
        }
        cat.addEventListener("pointerup", (event) => {
          if (event.pointerType !== "touch") return;
          event.preventDefault();
          suppressSyntheticCatClickUntil = performance.now() + 750;
          activateCat({ direct: true, event });
        });
        cat.addEventListener("click", (event) => {
          if (performance.now() < suppressSyntheticCatClickUntil) {
            event.preventDefault();
            return;
          }
          activateCat({ event });
        });
        function seededRandom(seed) {
          let state = seed >>> 0;
          return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
          };
        }
        function drawStarfield() {
          const cfg = P.environment.starfield,
            mobile = innerWidth <= 760,
            densityScale = mobile ? cfg.mobileDensityScale : 1,
            galaxy = cfg.galaxy,
            galaxyAngle = (galaxy.angleDeg * Math.PI) / 180,
            galaxyCos = Math.cos(galaxyAngle),
            galaxySin = Math.sin(galaxyAngle);
          document
            .querySelectorAll("[data-star-layer]")
            .forEach((canvas, layerIndex) => {
              const name = canvas.dataset.starLayer,
                layer = cfg.layers[name],
                rect = canvas.getBoundingClientRect(),
                dpr = Math.min(devicePixelRatio || 1, 2),
                w = Math.max(1, rect.width),
                h = Math.max(1, rect.height),
                ctx = canvas.getContext("2d"),
                rng = seededRandom(cfg.seed + layerIndex * 7919),
                count = Math.round(
                  ((w * h) / 1000000) *
                    layer.densityPerMegapixel *
                    densityScale *
                    (mobile && name === "near" ? 0.36 : 1),
                );
              canvas.width = Math.round(w * dpr);
              canvas.height = Math.round(h * dpr);
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              ctx.clearRect(0, 0, w, h);
              const drawStar = (x, y, alphaMultiplier = 1) => {
                const warm = rng() < layer.warmRatio,
                  color = warm
                    ? [237, 222, 196]
                    : rng() < 0.72
                      ? [216, 224, 242]
                      : [168, 182, 218],
                  radius = lerp(layer.radiusPx[0], layer.radiusPx[1], rng()),
                  alpha =
                    lerp(layer.opacity[0], layer.opacity[1], rng()) *
                    alphaMultiplier;
                ctx.fillStyle = `rgba(${color.join(",")},${alpha})`;
                ctx.beginPath();
                ctx.arc(x * w, y * h, radius, 0, Math.PI * 2);
                ctx.fill();
                if (name !== "far" && rng() > 0.94) {
                  ctx.fillStyle = `rgba(${color.join(",")},${alpha * 0.13})`;
                  ctx.beginPath();
                  ctx.arc(x * w, y * h, radius * 4.2, 0, Math.PI * 2);
                  ctx.fill();
                }
              };
              let drawn = 0,
                attempts = 0;
              while (drawn < count && attempts < count * 12) {
                attempts++;
                const x = rng(),
                  y = rng();
                let chance = 0.42;
                const galaxyX = x - galaxy.center[0],
                  galaxyY = y - galaxy.center[1],
                  galaxyAlong = galaxyX * galaxyCos + galaxyY * galaxySin,
                  galaxyAcross =
                    -galaxyX * galaxySin + galaxyY * galaxyCos;
                if (Math.abs(galaxyAlong) < galaxy.halfLength) {
                  const alongFalloff =
                      1 - Math.abs(galaxyAlong) / galaxy.halfLength,
                    acrossFalloff = Math.exp(
                      -0.5 *
                        Math.pow(galaxyAcross / galaxy.halfWidth, 2),
                    );
                  chance +=
                    galaxy.densityBoost[name] * alongFalloff * acrossFalloff;
                }
                for (const c of cfg.clusters) {
                  const d = Math.hypot(x - c.x, y - c.y) / c.radius;
                  if (d < 1) chance += c.strength * (1 - d);
                }
                for (const d of cfg.darkZones) {
                  const distance = Math.hypot(x - d.x, y - d.y) / d.radius;
                  if (distance < 1) chance -= d.strength * (1 - distance);
                }
                if (rng() > clamp(chance, 0.04, 1)) continue;
                drawStar(x, y);
                drawn++;
              }
              const bandCount = Math.round(
                count * (galaxy.bandStarFraction[name] || 0),
              );
              for (let index = 0; index < bandCount; index++) {
                const along = lerp(
                    -galaxy.halfLength,
                    galaxy.halfLength,
                    rng(),
                  ),
                  across =
                    (rng() + rng() + rng() - 1.5) * galaxy.halfWidth * 1.12,
                  x =
                    galaxy.center[0] +
                    along * galaxyCos -
                    across * galaxySin,
                  y =
                    galaxy.center[1] +
                    along * galaxySin +
                    across * galaxyCos;
                if (x < 0 || x > 1 || y < 0 || y > 1) continue;
                drawStar(
                  x,
                  y,
                  0.54 + 0.46 * (1 - Math.abs(along) / galaxy.halfLength),
                );
              }
            });
        }
        function setupMeteor() {
          const canvas = document.getElementById("meteor-canvas");
          if (!finePointer.matches || reduce.matches) {
            canvas.hidden = true;
            return;
          }
          const ctx = canvas.getContext("2d"),
            cfg = P.meteor.cursor;
          let W = innerWidth,
            H = innerHeight,
            dpr = Math.min(devicePixelRatio || 1, 2),
            curX = W * 0.5,
            curY = H * 0.5,
            targetX = curX,
            targetY = curY,
            prevX = curX,
            prevY = curY,
            visible = 0,
            targetVisible = 0,
            lastTime = performance.now();
          const trail = [],
            debris = [];
          function resize() {
            W = innerWidth;
            H = innerHeight;
            dpr = Math.min(devicePixelRatio || 1, 2);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            canvas.style.width = `${W}px`;
            canvas.style.height = `${H}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
          function color(t) {
            const stops =
                t < 0.55
                  ? [[0, 47, 167], [51, 92, 255], t / 0.55]
                  : [[51, 92, 255], [184, 200, 255], (t - 0.55) / 0.45],
              a = stops[0],
              b = stops[1],
              k = stops[2];
            return `${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))}`;
          }
          function draw() {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            if (visible < 0.01 && !debris.length) return;
            const N = trail.length;
            if (N > 1) {
              ctx.lineCap = "round";
              for (let j = 0; j < N - 1; j++) {
                const t = (j + 1) / N,
                  a = trail[j],
                  b = trail[j + 1];
                ctx.strokeStyle = `rgba(${color(t)},${(t * visible * 0.92).toFixed(3)})`;
                ctx.lineWidth = cfg.trailWidth * t;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
              }
            }
            const radius = cfg.headRadius * visible;
            if (radius > 0.5) {
              const glow = ctx.createRadialGradient(
                curX,
                curY,
                0,
                curX,
                curY,
                radius,
              );
              glow.addColorStop(
                0,
                `rgba(232,239,255,${(0.72 * visible).toFixed(3)})`,
              );
              glow.addColorStop(
                0.26,
                `rgba(51,92,255,${(0.42 * visible).toFixed(3)})`,
              );
              glow.addColorStop(1, "rgba(0,47,167,0)");
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(curX, curY, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = `rgba(235,241,255,${(0.82 * visible).toFixed(3)})`;
              ctx.beginPath();
              ctx.arc(curX, curY, 1.9 * visible, 0, Math.PI * 2);
              ctx.fill();
            }
            for (const d of debris) {
              const alpha = (d.life / d.maxLife) * visible;
              if (alpha <= 0) continue;
              ctx.save();
              ctx.translate(d.x, d.y);
              ctx.rotate(Math.atan2(d.vy, d.vx));
              ctx.fillStyle = `rgba(${d.hue},${alpha.toFixed(3)})`;
              ctx.fillRect(-d.size * 0.5, -d.size * 0.8, d.size, d.size * 1.6);
              ctx.restore();
            }
          }
          function tick(now) {
            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;
            prevX = curX;
            prevY = curY;
            curX += (targetX - curX) * cfg.follow;
            curY += (targetY - curY) * cfg.follow;
            const dx = curX - prevX,
              dy = curY - prevY,
              speed = Math.hypot(dx, dy) / Math.max(dt, 0.001);
            visible += (targetVisible - visible) * cfg.visibilityLerp;
            trail.push({ x: curX, y: curY });
            while (trail.length > cfg.maxTrailPoints) trail.shift();
            if (
              speed > cfg.speedThreshold &&
              trail.length > 4 &&
              Math.random() < cfg.debrisChance
            ) {
              const count = Math.random() < 0.6 ? 1 : 2;
              for (let i = 0; i < count; i++) {
                const point =
                    trail[Math.floor(Math.random() * (trail.length - 1))],
                  angle = Math.random() * Math.PI * 2,
                  speedOut =
                    cfg.debrisMinSpeed +
                    Math.random() * (cfg.debrisMaxSpeed - cfg.debrisMinSpeed),
                  life =
                    cfg.debrisLifeMin +
                    Math.random() * (cfg.debrisLifeMax - cfg.debrisLifeMin);
                debris.push({
                  x: point.x,
                  y: point.y,
                  vx: Math.cos(angle) * speedOut,
                  vy: Math.sin(angle) * speedOut - 10,
                  life,
                  maxLife: life,
                  size: 0.6 + Math.random() * 0.9,
                  hue: Math.random() < 0.5 ? "51,92,255" : "184,200,255",
                });
              }
            }
            for (let i = debris.length - 1; i >= 0; i--) {
              const d = debris[i];
              d.x += d.vx * dt;
              d.y += d.vy * dt;
              d.vy += 30 * dt;
              d.vx *= 0.98;
              d.vy *= 0.98;
              d.life -= dt;
              if (d.life <= 0) debris.splice(i, 1);
            }
            draw();
            requestAnimationFrame(tick);
          }
          addEventListener(
            "pointermove",
            (e) => {
              if (e.pointerType !== "mouse") return;
              targetX = e.clientX;
              targetY = e.clientY;
              targetVisible = 1;
              const nx = e.clientX / innerWidth - 0.5,
                ny = e.clientY / innerHeight - 0.5;
              document
                .querySelectorAll(".signal-wrap[data-state]")
                .forEach((signal) => {
                  const state = signal.dataset.state,
                    factor =
                      state === "active" ? 1 : state === "stable" ? 0.55 : 0;
                  signal.style.setProperty(
                    "--satellite-px",
                    `${nx * P.satellite.parallaxPx * factor}px`,
                  );
                  signal.style.setProperty(
                    "--satellite-py",
                    `${ny * P.satellite.parallaxPx * factor}px`,
                  );
                });
              catZone.style.setProperty(
                "--companion-px",
                `${nx * P.aboutCompanion.parallaxPx}px`,
              );
              catZone.style.setProperty(
                "--companion-py",
                `${ny * P.aboutCompanion.parallaxPx}px`,
              );
            },
            { passive: true },
          );
          document.addEventListener("mouseleave", () => {
            targetVisible = 0;
            catZone.style.setProperty("--companion-px", "0px");
            catZone.style.setProperty("--companion-py", "0px");
          });
          addEventListener("resize", resize);
          resize();
          requestAnimationFrame(tick);
        }
        function releaseManualToScroll() {
          if (focusMode !== "manual") return;
          cancelManualAnimation();
          if (reduce.matches) {
            closeFocusInstant(false);
            return;
          }
          const key = activeFocus;
          scrollTo({ top: targetFocusScroll(key), behavior: "auto" });
          focusMode = null;
          delete body.dataset.focusMode;
          updateScene();
        }
        addEventListener(
          "scroll",
          () => {
            if (catState === "charged" || (catState === "burst" && !activeFocus))
              resetCatToRest();
            updateScene();
          },
          { passive: true },
        );
        addEventListener("wheel", releaseManualToScroll, { passive: true });
        addEventListener("touchstart", releaseManualToScroll, {
          passive: true,
        });
        addEventListener("resize", () => {
          cancelManualAnimation();
          drawStarfield();
          setVariant(variant);
          updateScene();
        });
        reduce.addEventListener("change", () => {
          if (reduce.matches) resetCatToRest();
          cancelManualAnimation();
          drawStarfield();
          setVariant(variant);
          applyActivityProjection();
          document.getElementById("meteor-canvas").hidden =
            reduce.matches || !finePointer.matches;
          updateScene();
        });
        finePointer.addEventListener("change", applyActivityProjection);
        setupCatConstellation();
        applyParameters();
        drawStarfield();
        setVariant(variant);
        applyActivityProjection();
        setupMeteor();
        updateScene();

  return (states: States) => { activityProjection = states; applyActivityProjection(); };
}
