# 🪐 KidStar — Solar System Visualizer for Kids

> **"NASA Eyes for Kids"** — A mathematically and scientifically accurate 3D interactive solar system visualizer engineered with **TypeScript**, **React 19**, **Three.js**, and **React Three Fiber**.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black?logo=three.js)](https://threejs.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-green.svg)](LICENSE)

---

## 🌟 Overview

**KidStar** bridges the gap between complex astrophysics simulators (like *NASA Eyes* and *Celestia*) and child-friendly educational toys. It computes planetary orbits dynamically using official **NASA JPL analytical formulations** (Standish et al.) and high-precision astronomical time calculations (Jean Meeus Julian Ephemeris Date), while projecting scales onto a perceptually optimized curve so children can explore the entire solar family seamlessly.

---

## 🚀 Key Features

* **🔭 Scientifically Accurate Ephemerides**: Calculates real-time heliocentric orbits for all major planets from J2000 epoch using analytical series in pure TypeScript.
* **🪐 Moons & Dwarf Planets**: Detailed moons (Earth's Moon, Io, Europa, Ganymede, Callisto, Titan, Triton, Charon) and dwarf planets (Ceres, Pluto, Eris).
* **🕰️ Time Scrubbing & Gregorian Calendar**: Play, pause, reverse time, and jump across history with warp speed presets (`1 Hr/s`, `1 Day/s`, `1 Wk/s`, `1 Mo/s`, `1 Yr/s`).
* **📐 Real Axial Tilts & Sidereal Spin**: Each planet tilts along its physical obliquity with authentic rotational periods.
* **🪐 Procedural Saturn Rings**: True-to-scale ring geometry with Cassini Division rendered double-sided.
* **🚀 Spaceship Cockpit & Warp Drive**: Pilot a starship across the cosmos with cockpit HUD, warp speed streaks, and procedural Web Audio SFX.
* **🎯 Smooth Camera Tracking & Reticle**: Tap or click any world to fly the camera smoothly into orbit.
* **👶 Kid-Friendly HUD & Fact Cards**: 
  * Phonetic pronunciation guide (e.g. *Mercury — "MUR-kyuh-ree"*).
  * Astonishing fun facts and size comparisons.
  * Kid-relatable temperature badges (*"Boiling Hot! Melts lead"*, *"Super Freezing! -214 °C"*).
  * 1-click quick-jump dock for the Sun and all planets.
* **🎧 Web Audio Synthesizer**: Zero-asset procedural SFX for sound effects, clicks, whooshes, and chimes.

---

## 🏗️ Project Architecture

```
solar-system-visualiser/
├── web/
│   ├── src/
│   │   ├── components/         # 3D Solar system, planets, moons, lighting, canvas
│   │   │   ├── interaction/    # Camera controls, labels, selection reticle
│   │   │   ├── moons/          # Earth moon, Galilean moons, Titan, Triton
│   │   │   ├── planets/        # Terrestrial planets, gas giants, Saturn rings
│   │   │   ├── spaceship/      # Spaceship vessel, cockpit HUD, warp streaks
│   │   │   └── ui/             # Time scrubber, planet dock, fact card, tutorial
│   │   ├── science/            # Ephemeris engine, Julian date, coordinates, constants
│   │   ├── state/              # Zustand stores (focus, tour, tutorial, spaceship)
│   │   ├── utils/              # Web Audio synthesizers, snapshot capture
│   │   ├── App.tsx             # Main visualizer layout
│   │   └── main.tsx            # React application entrypoint
│   ├── public/                 # High-resolution textures, icons, favicons
│   ├── package.json            # Web frontend dependencies & scripts
│   └── vite.config.ts          # Vite bundler configuration
├── scripts/                    # Python scripts for procedural texture processing
├── .github/workflows/          # GitHub Pages CI/CD workflow
└── package.json                # Root package proxy scripts
```

---

## 🛠️ Getting Started

### Prerequisites

* **Node.js**: v18+ (tested on Node 22+)
* **pnpm**: v9+ (recommended) or `npm`

### Installation & Running Locally

```bash
# Install dependencies
pnpm --dir web install

# Start the local development server
pnpm dev
# (or cd web && pnpm dev)
```

Open your browser at `http://localhost:5173`.

---

## 📦 Production Build

To build the static distribution for production:

```bash
pnpm build
```

The optimized static build will be placed in `web/dist/`, ready for deployment to any static host (GitHub Pages, Cloudflare Pages, Vercel, Netlify).

---

## 📄 License

This project is licensed under either the MIT License or Apache-2.0 License.
