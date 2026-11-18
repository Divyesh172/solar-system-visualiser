# Design System: Solar System Visualizer (Cosmic Telemetry)

Design system specification for Kidstar Solar System Visualizer, defining visual tokens, glassmorphic UI components, celestial color palettes, and HUD layout architecture for Stitch Canvas.

## 1. Visual Theme & Atmosphere

- **Cosmic Deep Space Void**: Built for high-clarity planetary exploration and astronomical telemetry. A pitch-black void (`#010206`) serves as the boundless canvas for 3D Three.js celestial bodies, planetary orbits, and starfield dust.
- **Glassmorphic Telemetry Panels**: UI surfaces float weightlessly above the 3D space with high-blur frosted glass (`rgba(10, 16, 30, 0.88)` to `rgba(10, 16, 30, 0.92)` backdrop with `20px` Gaussian blur) and subtle `1px` translucent hairlines (`rgba(255, 255, 255, 0.16)`).
- **Celestial Radiance**: Accents and halos derive organically from the celestial body currently in focus, casting subtle chromatic ambient glows (`box-shadow: 0 0 25px [color]22`) onto inspection drawers and selection reticles.

---

## 2. Color Palette & Roles

### Primary Foundation
- **Cosmic Void (`#010206`)**: Canvas background, WebGL clear color, and root container surface.
- **Deep Orbit Glass (`rgba(10, 16, 30, 0.88)`)**: Primary container surface for navigation docks, modal drawers, and HUD cards.
- **Translucent Hairline (`rgba(255, 255, 255, 0.16)`)**: Structural borders, divider ticks, and pill outlines.
- **Deep Space Shadow (`rgba(0, 0, 0, 0.60)`)**: Atmospheric elevation and drop shadow layer for floating controls.

### Celestial Palette (Planetary Tokens)
- **Sun Corona Gold (`#FDB813`)**: The Sun, stellar illumination, heat telemetry.
- **Mercury Regolith Gray (`#A5A5A5`)**: Mercury, cratered terrain, dense core data.
- **Venus Sulfuric Ochre (`#E3BB7B`)**: Venus, runaway greenhouse atmosphere, high-temperature indicators.
- **Earth Ocean Blue (`#4B9CD3`)**: Earth, liquid water oceans, habitable zone markers.
- **Mars Iron Rust (`#CC5533`)**: Mars, Olympus Mons, oxidized surface soil.
- **Jupiter Jovian Amber (`#D9A066`)**: Jupiter, gas bands, Great Red Spot storm telemetry.
- **Saturn Ring Sand (`#EAD6B8`)**: Saturn, ice particle rings, low-density gas giant metrics.
- **Uranus Methane Cyan (`#7DE2D1`)**: Uranus, extreme axial tilt, freezing ice giant status.
- **Neptune Azure Blue (`#3F88C5`)**: Neptune, supersonic winds, cryovolcanic nitrogen plumes.

### Moon & Satellite Palette
- **Luna Slate (`#CBD5E1`)**: Earth's Moon.
- **Io Sulfur Gold (`#E6CC80`)**: Volcanic Io.
- **Europa Ocean Frost (`#A0C4E8`)**: Subsurface ocean Europa.
- **Ganymede Iron Stone (`#B8B09D`)**: Magnetic Ganymede.
- **Callisto Crater Dusk (`#8A8A99`)**: Ancient cratered Callisto.
- **Titan Nitrogen Orange (`#E08A38`)**: Smoggy atmosphere Titan.
- **Triton Kuiper Ice (`#A0D0E0`)**: Retrograde ice world Triton.

### Interactive & Status Accents
- **Neon Targeting Cyan (`#38BDF8`)**: Selected planet reticle, targeting brackets, active orbit highlights.
- **Stellar Beacon Amber (`#F59E0B`)**: Audio narrator status, guided tour checkpoints, speed multipliers.
- **Telemetry Emerald (`#10B981`)**: Simulation active indicator, stable orbit verification.
- **Cockpit Alert Coral (`#EF4444`)**: Close proximity collision alert, abort tour trigger.

---

## 3. Typography & Text Hierarchy

- **Font Family**: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Typographic Scale**:
  - **Display Title**: `24px` / `32px`, `font-weight: 700`, `-0.015em` letter spacing (Celestial body name, HUD banner).
  - **Scientific Metric Header**: `16px` / `20px`, `font-weight: 600`, `letter-spacing: 0.02em` (Drawer tabs, card titles).
  - **Body Copy**: `13px` / `18px`, `font-weight: 400`, color `#E2E8F0` (Fun facts, scientific lore, narrator text).
  - **Telemetry Data & Numbers**: `12px` / `16px`, `font-weight: 600`, tabular numerals (Mass, orbital radius, velocity, date readouts).
  - **Pill Badges & Captions**: `11px` / `14px`, `font-weight: 600`, `text-transform: uppercase`, `0.04em` tracking (Moons count, AU distance, temperature category).

---

## 4. Component Stylings

### PlanetDock (Dual-Deck Bottom Navigation)
- **Container**: `rgba(10, 16, 30, 0.88)` with `20px` Gaussian backdrop blur, `border: 1px solid rgba(255, 255, 255, 0.16)`, `border-radius: 32px`, `padding: 5px 14px`, `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5)`.
- **Buttons**: Pill chips with color-coded circular badge dots, subtle hover brighten, scale `1.05` on active selection.
- **Decks**: Upper deck for prominent Moons, lower primary deck for the 8 Planets + Sun, with collapsible arrow toggles.

### FactCard & Telemetry Drawer
- **Desktop**: Right-aligned slide-out card (`380px` max-width, `border-radius: 20px`), floating `20px` from viewport edge.
- **Mobile Peek Pill**: Bottom-pinned collapsed capsule (`border-radius: 24px`, `padding: 10px 14px`) expanding into a full-height interactive sheet on tap.
- **Accent Glow**: `border: 1.5px solid [planetColor]55` with `box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 25px [planetColor]22`.
- **Header**: Large title, phonetic pronunciation pronunciation guide (`URTH`, `JOO-pih-tur`), audio speech synthesis button (`Volume2`), and quick close button (`X`).
- **Fact Carousel**: Multi-fact carousel with left/right arrow chevrons, dot indicators, and quick-snapshot camera trigger (`Camera`).

### TimeScrubber & Simulation Controls
- **Docking**: Top or bottom horizontal slider bar with frosted backdrop.
- **Controls**: Play/Pause toggle, speed presets (`1x`, `10x`, `100x`, `1000x`), reverse playback, and calendar date picker for real planetary alignment calculations.

### Spaceship Cockpit HUD
- **Flight Reticle**: Center viewport crosshair brackets with glowing neon cyan hairlines.
- **Meters**: Lateral velocity vectors, warp drive throttle gauge, pitch/yaw telemetry, and planetary distance markers.

---

## 5. Layout Architecture & Viewport Standards

- **Viewport Standard**: `100vw` by `100vh` non-scrollable desktop and mobile canvas (`overflow: hidden`).
- **Layer Stacking (Z-Index Scale)**:
  - `z: 0`: WebGL 3D Canvas (Three.js/Fiber, stars, shaders, planets).
  - `z: 20`: Secondary Viewport HUD (Zoom slider, orientation reset, camera controls).
  - `z: 30`: Time & Date Scrubber (Top/Bottom calendar bar).
  - `z: 40`: Primary PlanetDock (Bottom-center pinned navigation).
  - `z: 50`: FactCard / Celestial Inspection Drawer (Right / Bottom peek).
  - `z: 60+`: Tour Guide, Controls Tutorial, and Share Modals.
- **Responsive Adaptations**:
  - Desktop: Multi-dock split (Moons top deck, Planets bottom deck), right drawer fact inspection.
  - Mobile: Auto-collapse docks on planet selection; bottom peek capsule drawer; minimum `44px` touch targets.

---

## 6. Design System Notes for Stitch Generation

- **Atmosphere Keywords**: Deep space cosmic void, frosted glassmorphism, celestial glow, high-contrast astronomical telemetry, neon reticle brackets, planetary color accents.
- **Target Component Prompts**:
  1. *"A floating glassmorphic navigation dock (`rgba(10, 16, 30, 0.88)` with `20px` backdrop blur and `32px` rounded border) displaying horizontal pill chips for Earth, Mars, and Jupiter with glowing colored badge indicators."*
  2. *"An astronomical planet inspection card with a glowing `#4B9CD3` neon accent outline, displaying orbital period, mass, temperature, and audio pronunciation button over a dark cosmic backdrop."*
  3. *"A sci-fi spaceship cockpit HUD with neon cyan crosshairs, warp speed throttle bar, and planetary telemetry indicators overlaying a dark starfield."*
