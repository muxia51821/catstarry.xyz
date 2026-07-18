# catstarry Planet Asset Prompt Kit v2

## 0. Purpose

This kit defines the reusable prompt system for generating planet assets for **catstarry.xyz**.

The visual objective is:

> A shared warm geological universe with differentiated worlds, subtle signs of habitability, controlled artistic material references, and Klein Blue reserved for optical and interactive phenomena.

The planets should feel like natural celestial bodies with geological history, climate activity, atmosphere, and possible life.

They should not look like:

- CSS spheres
- game selection icons
- fantasy magic balls
- Earth replicas
- decorative UI buttons

---

# 1. Prompt Assembly

For each generation, combine the following blocks:

```text
[MASTER UNIVERSE PROMPT]

+

[PLANET IDENTITY BLOCK]

+

[ASSET TYPE BLOCK]

+

[COMPLEXITY BLOCK, optional]

+

[OUTPUT CONSTRAINTS]

+

[NEGATIVE CONSTRAINTS]
```

Recommended workflow:

```text
Step 1: Generate an Overview Full Sphere candidate.
Step 2: Select the strongest planetary identity.
Step 3: Use the selected Overview image as a visual reference for the Focus High Detail candidate.
Step 4: Generate a Mobile Optimized version from the same approved planet identity.
Step 5: Generate a separate Surface Material Study when needed for Content-page texture translation.
```

Do not attempt to generate overview, focus, mobile, interface layout, and surface-detail references in one image.

## Phase 4.2 Workflow Note

Use this Kit to generate prototype Overview and Focus candidates for all five planets, sufficient to validate:

- planet identity
- Overview-to-Focus continuity
- cropping behavior
- required resolution
- loading transitions
- edge quality
- interaction calibration

Generate Mobile Optimized candidates for validating small-screen readability and asset-cost reduction.

Store Phase 4.2 calibration assets under:

```text
docs/design/prototypes/phase4-2/
```

Validate the assets inside the isolated Phase 4.2 prototype against:

- edge integration on the `#0A0A0C` Deep Space background
- the naturalness of the Planet Push transition from Overview to Focus
- silhouette and primary-landform readability at mobile sizes
- the readability of representative Material Studies when used as low-dose Content-page textures
- image resolution, crop behavior, loading thresholds, and asset-swap continuity

These assets are calibration candidates only.

Do not place them in:

```text
src/assets/
```

Final production asset selection and batch rendering should occur after Phase 4.2 calibration results are approved.

The Phase 4.2 task list in `workflow-orchestration.md` should include:

```text
Planet asset generation and calibration
```

---

# 2. Master Universe Prompt

Use this block for every planet.

```text
Create a cinematic alien planet asset for the catstarry.xyz visual system.

Shared universe rules:

- The planets belong to one coherent warm geological universe.
- Each planet has a distinct primary landform, while sharing the same lighting, depth behavior, shadow temperature, and color-calibration standard.
- The primary surface palette consists of cream, sandstone, pale limestone, terracotta, ochre, warm mineral deposits, muted earth tones, and cool shadows.
- The world may feel habitable and ecologically possible, but it must not look like Earth.
- Subtle atmosphere, restrained cloud or mist presence, muted blue-gray inland seas, shallow basins, mineral water channels, and climate-shaped terrain are allowed.
- Warm geology must remain visually dominant.
- Natural celestial geology is the primary visual language.
- Artistic materials such as paper pulp, ceramic glaze, graphite, pigment sediment, fine fibers, or metal inlay may appear only as restrained close-up microtextures.
- Each planet must have one clearly readable primary landform at overview scale.
- Each planet may have at most one secondary artistic microtexture in close views.
- Complexity must come from geology, erosion, sedimentation, climate, atmosphere, mineral variation, and material depth—not from decorative objects.

Klein Blue is reserved exclusively for:

- optical rim light
- navigation signals
- satellite emission
- focus response
- interaction feedback

Klein Blue must never dominate the planetary surface.

Use one consistent global light source from the upper-left.
Use cinematic shadow falloff, subtle atmospheric depth, and restrained optical bloom.

The result should feel:

- natural
- tactile
- layered
- quiet
- cinematic
- premium
- spatially believable

For exact palette, material-token, and optical-role definitions, refer to DESIGN.md Section 2.3 "Warm Geological Baseline" and Section 2.5 "Planet Optical, Material, and State Tokens".
```

---

# 3. Habitability Baseline

Use this by default.

```text
The planet should feel quietly habitable rather than barren.

Suggest ecological possibility through:

- a thin but visible atmosphere
- restrained cloud wisps or mist layers
- muted blue-gray shallow seas, inland basins, or mineral water traces
- terrain shaped by erosion, water flow, sediment movement, and long-term climate activity
- occasional low-saturation gray-green, slate-blue, or mineral-cyan traces

Do not use:

- bright cyan oceans
- saturated green continents
- dense forests
- recognizable Earth geography
- Earth-style white cloud bands
- obvious tropical environments
- city lights or civilization networks
```

## Optional Habitability Levels

### Level 1 — Mostly Geological

```text
Keep signs of habitability extremely subtle.
Use only a thin atmosphere, faint moisture traces, and small muted basins.
The planet should remain predominantly geological.
```

### Level 2 — Quietly Habitable

```text
Show restrained but readable climate activity, shallow inland seas, mist, erosion channels, and atmospheric depth.
The planet should feel alive without appearing Earth-like.
```

### Level 3 — Richer Living World

```text
Increase atmospheric, hydrological, and ecological complexity while keeping the warm geological palette dominant.
Add more water-shaped terrain, muted mineral vegetation traces, cloud structure, and climate variation.
Do not introduce bright green continents or blue Earth-like oceans.
```

Recommended catstarry baseline:

```text
Habitability Level 2
```

---

# 4. Planet Identity Blocks

## 4.1 About

```text
Planet identity: About

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— About = cream + mineral.

Primary overview landform:

- a quiet, low-rhetoric, pale rocky world
- softly eroded mineral plains
- calm pale basins
- restrained geological transitions
- broad, uncluttered surface structures
- a slightly remote and contemplative presence

Close-up microtexture:

- extremely fine fur-like mineral striations
or
- a soft suspended dust layer

The texture must remain geological and abstract.

Mood:

- intimate
- quiet
- restrained
- remote
- personal
- contemplative

The planet must not become the visual center of the entire universe.

Avoid intentionally readable:

- cat-head planetary silhouettes
- cat-shaped continents
- paw-shaped primary landmarks
- anatomical cat features
- mascot-like facial features
- literal animal imagery
- dominant signature symbols

Subtle accidental geological pareidolia is acceptable in close detail, provided it does not become the planet's primary identity or read clearly as a cat at overview scale.
```

---

## 4.2 Blog

```text
Planet identity: Blog

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— Blog = sand + clay + graphite / pigment.

Primary overview landform:

- weathered stratified rock
- layered sedimentary terrain
- visible geological bands
- deposition zones
- eroded terraces
- river-delta-like sediment structures
- long-term geological accumulation

Close-up microtexture:

- subtle paper-pulp fibers
- ink-like mineral veins
- pigment sediment traces

These materials must remain abstract and embedded in the geology.

Mood:

- reflective
- layered
- archival
- accumulative
- shaped by time
- articulate without being literal

Avoid:

- books
- pages
- quills
- pens
- typography on the surface
- libraries
- obvious literary symbols
```

---

## 4.3 Feed

```text
Planet identity: Feed

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— Feed = sand + clay + pigment.

Primary overview landform:

- low-lying terrain with a directional flow
- sedimentary valleys
- braided channels
- shallow erosion paths
- terrain visibly shaped by movement and passing time
- a readable sense of direction without becoming a water planet

Close-up microtexture:

- subtle footprints
- tiny mineral glints
- time-worn surface marks
- fine traces carried or erased by sediment flow

Mood:

- current
- moving
- temporal
- observational
- quietly active

Avoid:

- social media icons
- message bubbles
- interface screens
- notification symbols
- literal information streams
- a fully aquatic planet
```

---

## 4.4 Learn

```text
Planet identity: Learn

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— Learn = cream + mineral + graphite.

Primary overview landform:

- geological faults
- exposed cross-sections
- gradually revealed mineral veins
- layered fracture systems
- terrain that suggests discovery through depth
- progressive geological revelation

Close-up microtexture:

- engraved lines
- graphite-like marks
- fine microcrystalline structures

Mood:

- progressive
- analytical
- exploratory
- structured
- gradually revealing

Avoid:

- giant knowledge crystals
- brains
- neural-network imagery
- glowing books
- educational icons
- generic artificial-intelligence symbolism
```

---

## 4.5 Projects

```text
Planet identity: Projects

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— Projects = clay + mineral + metal.

Primary overview landform:

- natural terrain interrupted by deliberate artificial cuts
- plateaus
- embedded geometric structures
- carved planes
- controlled terraces
- designed interventions integrated into geology

Close-up microtexture:

- restrained ceramic glaze
- fine metal inlay
- geometric construction traces

The planet must remain primarily natural rather than mechanical.

Mood:

- constructed
- deliberate
- organized
- structural
- materially precise

Avoid:

- fully mechanical planet
- cyberpunk factory
- spaceship base
- industrial megastructure
- exposed machinery covering the world
- excessive technological detail
```

---

# 5. Asset Type Blocks

## 5.1 Overview Full Sphere

Use for the Star Map overview.

```text
Asset type: Overview Full Sphere.

Show the entire sphere clearly.

Requirements:

- full planetary silhouette visible
- one primary landform readable at a glance
- primary landform remains recognizable at reduced Star Map size
- controlled surface complexity
- clear depth and spherical volume
- clean atmospheric edge
- transparent-background or deep-space-friendly edge treatment
- no foreground objects covering the planet
- no text or interface elements
- sufficient negative space around the sphere
- suitable for scaling down in a five-planet Star Map
- edge quality must remain clean when composited over the Home Deep Space background
- no low-resolution stair-stepping
- no compression halo
- no blurred masking edge
- no visible AI texture tiling or repeated surface pattern

The planet must remain recognizable at a reduced display size.

Do not reveal excessive close-up microtexture.
```

Recommended composition:

```text
Square composition, full sphere, centered or slightly offset, minimal deep-space background, clean silhouette, no dramatic lens flare.
```

---

## 5.2 Focus High Detail

Use after the user selects, focuses, or pushes toward a planet.

```text
Asset type: Focus High Detail.

Show a closer, more immersive view of the same planet.

Requirements:

- the planet may extend beyond the frame
- show a large curved planetary surface
- preserve the approved Overview planet's identity and palette
- use the same source material system
- use the same upper-left global lighting direction
- preserve atmospheric thickness and shadow temperature
- reveal more geological hierarchy
- reveal high-resolution terrain, atmosphere, shadow, and local curvature
- increase material detail without redesigning the planet
- show clearer transitions between large terrain, secondary geological structures, and microtexture
- retain stable negative space for interface copy or an entry action
- maintain continuity during Overview-to-Focus transition
- produce no visible asset-swap discontinuity
- preserve landmark placement, geological flow, and surface identity wherever they remain visible
- avoid looking like an unrelated second rendering of a similar planet

The Focus view should feel like approaching the same physical world, not replacing it with a newly designed planet.

Near-view details must remain clear, credible, and materially coherent.
```

---

## 5.3 Surface Material Study

Use as a reference for page textures, shader development, headers, masks, separators, or material translation.

```text
Asset type: Planet surface material study.

Do not show the full planet.

Create a close-up geological surface study focusing on:

- primary terrain material
- stratification
- erosion
- mineral deposits
- moisture or dust transitions
- the planet-specific artistic microtexture

The image should be usable as a visual reference for subtle website textures.

Avoid:

- horizon views
- complete planets
- architecture
- characters
- interface elements
- decorative science-fiction objects
```

---

## 5.4 Isolated Web Asset

Use when the planet will be composited into the website separately.

```text
Asset type: isolated planet web asset.

Show one complete planet with:

- clean circular silhouette
- no surrounding nebula crossing the planet edge
- no nearby large stars
- no lens flare
- no text
- no extra celestial bodies
- controlled rim light
- background that is easy to remove or mask

Keep all important surface details inside the planetary silhouette.

The edge must remain suitable for transparent export or compositing over the Home Deep Space background.
Avoid blurred edge contamination, compression halos, or background-colored fringes.
```

When the generation system supports transparency, request:

```text
Transparent background.
```

Otherwise use:

```text
Uniform near-black background with strong silhouette separation.
```

---

## 5.5 Mobile Optimized

Use for the mobile Star Map and reduced-cost loading path.

```text
Asset type: Mobile Optimized.

Create a mobile-optimized version of the approved Overview Full Sphere asset.

Preserve:

- the same planet identity
- the same full-sphere silhouette
- the same primary landform
- the same warm geological color calibration
- the same upper-left lighting direction
- the same shadow temperature
- the same restrained Klein Blue optical rim treatment
- clear differentiation from the other four planets

Reduce:

- high-frequency surface noise
- tiny crater details
- very fine mineral grain
- small repeated texture features
- complex cloud layering
- atmospheric haze complexity
- transparent overlay count
- subtle details that disappear or shimmer at small display sizes

Simplify:

- secondary geological detail
- cloud and mist structure
- small-scale texture contrast
- edge atmosphere where necessary for clean mobile rendering

Requirements:

- the primary landform must remain readable at small mobile sizes
- the planetary silhouette must remain clean
- the asset must not become a flat gradient sphere
- the asset must remain visually continuous with the Overview and Focus versions
- Klein Blue remains limited to the optical edge or functional signal treatment
- no new decorative landmarks may be introduced
- no redesign of the planet identity
- no visible compression halo or low-resolution edge stair-stepping
- preserve sufficient contrast against the Home Deep Space background

The result should feel like an optimized rendering of the same physical planet, not a simplified replacement icon.
```

---

# 6. Natural Complexity Enhancement Block

Add this when the result is too simple, flat, generic, or visually underdeveloped.

```text
Increase visual complexity through natural planetary systems rather than decorative additions.

Add:

- clearer large-to-medium-to-small terrain hierarchy
- layered geological transitions
- secondary erosion and deposition structures
- more nuanced mineral variation
- restrained atmospheric depth
- subtle cloud or mist layers at different altitudes
- muted water traces integrated into the terrain
- richer terminator shadows
- fine but controlled surface relief
- evidence of long-term climate and geological history

The primary landform must remain readable.

Do not increase complexity through:

- extra rings
- floating crystals
- plants covering the whole surface
- machinery
- cities
- architecture
- excessive particles
- multiple competing landmarks
- strong glowing patterns
```

---

# 7. More Earth-Like Spatial Richness Without Earth Imitation

Use when a planet feels too dry, dead, or visually uniform.

```text
Give the planet the spatial richness and environmental depth associated with a living terrestrial world, without copying Earth.

Use:

- atmosphere
- hydrological traces
- varied geological regions
- climate-shaped surface transitions
- shallow inland seas
- mineral-rich deltas
- restrained cloud systems
- subtle differences between dry, humid, elevated, and basin terrain

Do not use:

- recognizable continental shapes
- Earth-blue oceans
- saturated green vegetation
- white spiral storms
- Earth-like polar ice caps
- familiar terrestrial geography
```

---

# 8. Lighting and Color-Control Block

Use for all final asset generations.

```text
Lighting and color control:

- one global key light from the upper-left
- warm illuminated surface
- cool but not blue-black shadows
- soft cinematic terminator
- restrained atmospheric scattering
- subtle Klein Blue rim light only on selected shadow edges
- no independent glow from the entire planet
- no neon surface
- no excessive bloom
- no crushed black detail
- preserve visible terrain detail in both the lit and shadow regions

Color balance:

- warm geology remains dominant
- muted blue-gray water and atmosphere are secondary
- Klein Blue remains rare, pure, optical, and visually distinct
- avoid an overall yellow color cast
- include pale mineral neutrals, cool grays, slate tones, and controlled terracotta variation
```

The line below is important when earlier outputs appear too yellow:

```text
Avoid monochromatic yellow or orange grading.
Balance the warm geology with pale limestone, cool mineral gray, muted slate-blue, soft taupe, and restrained neutral shadows.
```

For exact palette, material-token, and optical-role definitions, refer to DESIGN.md Section 2.3 "Warm Geological Baseline" and Section 2.5 "Planet Optical, Material, and State Tokens".

---

# 9. Klein Blue Control Block

```text
Klein Blue is a functional optical language, not a planetary surface palette.

Klein Blue may appear only as:

- a thin optical rim
- a navigation path
- a tiny distant signal
- satellite emission
- focus response
- interaction feedback

Klein Blue must not appear as:

- a large ocean
- a continent
- a mineral field
- a broad atmospheric band
- decorative surface paint
- general background color

Any natural water must use muted blue-gray, slate-blue, mineral-cyan, or desaturated teal rather than Klein Blue.
```

---

# 10. Shared Negative Constraints

Append this block to final prompts.

```text
Avoid:

- Earth clone
- recognizable Earth continents
- bright cyan oceans
- saturated green continents
- tropical paradise planet
- generic Mars clone
- monochromatic yellow planet
- orange color cast across the entire image
- fantasy magic planet
- giant rings unless specifically required
- floating crystals
- excessive vegetation
- mechanical planet
- city-covered world
- spaceship base
- cyberpunk structures
- glowing circuit lines
- excessive neon
- excessive bloom
- strong lens flare
- multiple moons distracting from the planet
- decorative space clutter
- game UI appearance
- cartoon rendering
- Flash-animation aesthetic
- simple CSS-gradient sphere appearance
- smooth plastic surface
- flat lighting
- literal page, book, brain, social-media, or project-management symbols
```

These rendering-quality constraints do not prohibit high-quality abstract geological painting.

They prohibit the planet from being rendered as:

- a low-detail cartoon illustration
- a flat vector object
- a plastic gradient sphere
- a dated Flash-style web animation asset
- a decorative interface icon

The planet must continue to read as a natural geological celestial body.

---

# 11. Output Constraints

## Standard Overview Output

```text
Output requirements:

- square 1:1 composition
- one planet only
- full sphere visible
- clean silhouette
- no text
- no logo
- no interface
- no watermark
- no foreground objects
- minimal starfield
- cinematic realism or high-quality abstract geological rendering
- premium concept-art quality
- sufficient negative space
- clean transparent or deep-space-friendly edge
```

## Focus Output

```text
Output requirements:

- widescreen 16:9 or website-hero composition
- partial planet surface allowed
- maintain negative space for copy
- no text
- no interface
- no embedded buttons
- preserve the same planet identity as the Overview reference
- preserve source material, lighting, and geological continuity
```

## Material Study Output

```text
Output requirements:

- square or landscape close-up
- no horizon
- no full planet
- highly readable geological and material detail
- suitable as UI texture reference
```

## Mobile Output

```text
Output requirements:

- optimized for small-screen display
- complete silhouette preserved
- primary landform readable at reduced size
- reduced high-frequency detail
- simplified atmosphere and transparency
- clean edge against deep-space background
- no redesign of the approved Overview identity
```

---

# 12. Complete Prompt Templates

## 12.1 About — Overview Full Sphere

```text
Create a cinematic alien planet asset for the catstarry.xyz visual system.

The planet belongs to a coherent warm geological universe. Use cream, sandstone, pale limestone, terracotta, ochre, warm mineral deposits, muted earth tones, and cool shadows. The world should feel quietly habitable but not Earth-like. A thin atmosphere, restrained mist, muted blue-gray inland basins, and subtle climate-shaped terrain are allowed.

Klein Blue is reserved exclusively for optical rim light, navigation signals, satellite emission, focus response, and interaction feedback. Klein Blue must not dominate the planetary surface.

For exact palette, material-token, and optical-role definitions, refer to DESIGN.md Section 2.3 "Warm Geological Baseline" and Section 2.5 "Planet Optical, Material, and State Tokens".

Planet identity: About.

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— About = cream + mineral.

Create a quiet, low-rhetoric, pale rocky world with softly eroded mineral plains, calm pale basins, broad uncluttered geological structures, and restrained surface transitions. In closer detail, suggest extremely fine fur-like mineral striations or a soft dust layer, but keep the texture abstract and geological.

The mood should feel intimate, remote, contemplative, quiet, and personal.

Show the complete planetary sphere as a clean Overview Full Sphere asset suitable for a five-planet Star Map. The main landform must remain readable at reduced size. Use one global light source from the upper-left, cinematic shadow falloff, subtle atmospheric depth, and a restrained Klein Blue optical rim along part of the shadow edge.

The planetary edge must remain clean on transparent or deep-space backgrounds, without compression halos, low-resolution stair-stepping, blurred masking, or background-colored fringes.

Increase complexity through geological hierarchy, erosion, atmospheric depth, subtle water traces, and material variation—not through decorative objects.

Avoid a monochromatic yellow or orange grade. Balance warm geology with pale mineral neutrals, cool grays, slate-blue water traces, soft taupe, and restrained cool shadows.

Avoid intentionally readable cat-head silhouettes, cat-shaped continents, paw-shaped primary landmarks, mascot-like facial features, or literal animal imagery.

Subtle accidental geological pareidolia is acceptable in close detail, provided it does not become the planet's primary identity or read clearly as a cat at overview scale.

Avoid bright blue oceans, saturated green land, fantasy clutter, giant rings, crystals, machinery, architecture, excessive glow, lens flare, cartoon rendering, Flash-animation aesthetic, simple CSS-gradient sphere appearance, smooth plastic surfaces, flat lighting, or game UI appearance.

Square 1:1 composition. One planet only. Full sphere visible. Clean silhouette. Minimal starfield. No text, logo, interface, or watermark.
```

---

## 12.2 Blog — Overview Full Sphere

```text
Create a cinematic alien planet asset for the catstarry.xyz visual system.

The planet belongs to a coherent warm geological universe. Use cream, sandstone, pale limestone, terracotta, ochre, warm mineral deposits, muted earth tones, and cool shadows. The world should feel quietly habitable but not Earth-like. A thin atmosphere, restrained cloud wisps, muted blue-gray shallow seas, sedimentary basins, and climate-shaped terrain are allowed.

Klein Blue is reserved exclusively for optical rim light, navigation signals, satellite emission, focus response, and interaction feedback. Klein Blue must not dominate the planetary surface.

For exact palette, material-token, and optical-role definitions, refer to DESIGN.md Section 2.3 "Warm Geological Baseline" and Section 2.5 "Planet Optical, Material, and State Tokens".

Planet identity: Blog.

Material identity:
See DESIGN.md Section 1.5 "Planet Material Matrix".

Material token pairing:
See DESIGN.md Section 2.3 "Warm Geological Baseline"
— Blog = sand + clay + graphite / pigment.

Create a weathered stratified world dominated by layered sedimentary rock, visible geological bands, deposition zones, eroded terraces, and river-delta-like mineral structures. In closer detail, subtly suggest paper-pulp fibers, ink-like mineral veins, and pigment sediment embedded in the geology. These references must remain abstract and natural.

The mood should feel reflective, layered, archival, accumulative, and shaped by time.

Show the complete planetary sphere as a clean Overview Full Sphere asset suitable for a five-planet Star Map. The sedimentary identity must remain readable at reduced size. Use one global light source from the upper-left, cinematic shadow falloff, subtle atmospheric depth, and a restrained Klein Blue optical rim along part of the shadow edge.

The planetary edge must remain clean on transparent or deep-space backgrounds, without compression halos, low-resolution stair-stepping, blurred masking, or background-colored fringes.

Increase complexity through sedimentation, geological hierarchy, erosion, shallow water traces, atmospheric depth, mineral transitions, and long-term climate history—not through decorative objects.

Avoid a monochromatic yellow or orange grade. Balance warm geology with pale mineral neutrals, cool gray strata, muted slate-blue basins, soft taupe, terracotta variation, and restrained cool shadows.

Avoid books, pages, quills, typography, libraries, bright blue oceans, saturated green continents, fantasy clutter, giant rings, crystals, machinery, architecture, excessive glow, lens flare, cartoon rendering, Flash-animation aesthetic, simple CSS-gradient sphere appearance, smooth plastic surfaces, flat lighting, or game UI appearance.

Square 1:1 composition. One planet only. Full sphere visible. Clean silhouette. Minimal starfield. No text, logo, interface, or watermark.
```

---

# 13. Series Consistency Prompt

When generating the second, third, or later planet, add:

```text
This planet belongs to the same asset series as the provided reference planet.

Preserve:

- identical global light direction
- similar planetary scale in frame
- matching atmospheric thickness
- matching shadow temperature
- matching optical rim treatment
- matching background density
- matching color-calibration standard
- matching realism and rendering quality
- matching transparent or deep-space-friendly edge quality

Change only:

- primary landform
- planet-specific microtexture
- restrained secondary environmental features

The result must look like another world from the same universe, not an image from a different artist or rendering system.
```

When generating Focus or Mobile assets from an approved Overview reference, add:

```text
This is the same physical planet as the approved Overview reference.

Do not reinterpret or redesign the planet.

Preserve:

- geological landmark relationships
- primary terrain flow
- major color regions
- atmospheric behavior
- light direction
- shadow temperature
- material identity

Only change the viewing scale, crop, visible detail level, and asset optimization appropriate to the requested asset type.
```

---

# 14. Evaluation Checklist

Evaluate every generated planet using the following questions.

## Identity

1. Can the primary landform be recognized at overview scale?
2. Is the planet distinguishable from the other catstarry planets?
3. Does it avoid literal symbols?
4. If accidental pareidolia exists, does it remain subtle and secondary?

## Universe Consistency

5. Does it belong to the same warm geological universe?
6. Is the upper-left light direction consistent?
7. Are atmospheric thickness and shadow temperature consistent?
8. Does Klein Blue remain optical rather than geological?

## Complexity

9. Does complexity come from geology, climate, erosion, sediment, and material depth?
10. Is there one dominant landform rather than several competing ideas?
11. Does the close-up microtexture remain restrained?
12. Does the rendering avoid cartoon, Flash, plastic-gradient, or game-UI qualities?

## Habitability

13. Does the planet feel alive or environmentally active without becoming an Earth clone?
14. Are water, clouds, and ecological traces muted and controlled?

## Asset Continuity

15. Does the Overview edge work cleanly on transparent or Deep Space backgrounds?
16. Does the Focus asset feel physically continuous with the Overview asset?
17. Does the Mobile asset preserve the same silhouette and primary landform?
18. Are there compression halos, edge stair-stepping, blurred masks, or repeated AI textures?

## Production Value

19. Does the silhouette work at small Star Map scale?
20. Can the material language be translated into the corresponding Content page?
21. Does the asset feel cinematic rather than like a decorative website animation?

Recommended acceptance rule:

```text
Approve only if at least 17 of the 21 checks pass,
and none of questions 1, 5, 6, 8, 12, 15, 16, 17, or 19 fail.
```

---

# 15. Naming Convention

Recommended asset naming:

```text
planet-about-overview-v01.png
planet-about-focus-v01.png
planet-about-mobile-v01.png
planet-about-material-v01.png

planet-blog-overview-v01.png
planet-blog-focus-v01.png
planet-blog-mobile-v01.png
planet-blog-material-v01.png

planet-feed-overview-v01.png
planet-feed-focus-v01.png
planet-feed-mobile-v01.png

planet-learn-overview-v01.png
planet-learn-focus-v01.png
planet-learn-mobile-v01.png

planet-projects-overview-v01.png
planet-projects-focus-v01.png
planet-projects-mobile-v01.png
```

For prototype calibration candidates:

```text
planet-about-overview-candidate-a.png
planet-about-overview-candidate-b.png
planet-about-focus-candidate-a.png
planet-about-mobile-candidate-a.png
```

For selected master references:

```text
planet-about-overview-master.png
planet-blog-overview-master.png
```

Phase 4.2 candidates should remain under:

```text
docs/design/prototypes/phase4-2/
```

They should not be copied into the production asset directory until calibration and final rendering are complete.

---

# 16. Version 2 Scope

This kit defines:

- shared universe rules
- five planet identities
- habitability language
- Klein Blue restrictions
- Overview Full Sphere assets
- Focus High Detail assets
- Mobile Optimized assets
- isolated web assets
- surface material studies
- Overview-to-Focus continuity
- mobile simplification rules
- transparent and Deep Space edge requirements
- Phase 4.2 prototype calibration workflow
- series consistency
- output constraints
- evaluation standards
- rendering-quality constraints

This version does not define:

- exact WebGL implementation
- shader parameters
- final production texture resolutions
- animation behavior
- responsive planet placement
- activity-satellite production specifications
- leopard-cat particle production specifications
- final production batch-rendering settings

Those should be defined separately after the Phase 4.2 planet assets and transition behavior are approved.
