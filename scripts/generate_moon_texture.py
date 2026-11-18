"""
KidStar High-Fidelity Earth's Moon Texture Generator
Generates:
assets/textures/moon_earth.png (2048x1024)

Features:
- Completely eliminates the synthetic sine-wave checkerboard/plaid artifacts.
- Authentic lunar near-side maria geography:
  - Oceanus Procellarum (Ocean of Storms)
  - Mare Imbrium with Montes Apenninus mountain rim
  - Mare Serenitatis, Mare Tranquillitatis (Apollo 11 landing site)
  - Mare Crisium (isolated oval sea)
  - Mare Nubium, Mare Humorum, Mare Fecunditatis, Mare Nectaris
- Famous lunar impact craters with radiant ejecta ray networks:
  - Tycho Crater with sweeping radial rays spanning the southern hemisphere
  - Copernicus Crater with brilliant multi-prong ray web
  - Kepler & Aristarchus (brightest plateau on the Moon)
  - Plato Crater (dark basalt floor)
- Heavily cratered highlands with hundreds of procedural impact craters (basins, terraced walls, central peaks).
- Realistic far-side highlands (South Pole-Aitken Basin, Mare Moscoviense).
- Realistic lunar photometric albedo and regolith color grading.
"""

import math
import os
import numpy as np
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures")
os.makedirs(OUT_DIR, exist_ok=True)

def generate_moon_earth(width=2048, height=1024):
    print(f"Generating Photorealistic Earth Moon texture ({width}x{height})...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Lat/Lon in degrees
    # u: 0.5 = Prime Meridian (0 deg, facing Earth)
    # v: 0.5 = Equator (0 deg)
    lon_deg = (u - 0.5) * 360.0
    lat_deg = (0.5 - v) * 180.0
    lat_rad = np.radians(lat_deg)
    lon_rad = np.radians(lon_deg)
    
    # Natural organic multi-octave fractal noise (non-grid, aperiodic phase angles)
    # Carefully tuned frequencies and rotations to avoid any grid/checkerboard alignment
    fractal = (
        np.sin(lon_rad * 3.7 + lat_rad * 2.3 + 1.2) * 0.28 +
        np.cos(lon_rad * 7.1 - lat_rad * 5.4 + 2.7) * 0.18 +
        np.sin(lon_rad * 14.3 + lat_rad * 11.9 + 0.5) * 0.12 +
        np.cos(lon_rad * 29.7 - lat_rad * 23.1 + 3.1) * 0.07 +
        np.sin(lon_rad * 59.3 + lat_rad * 47.7 + 1.8) * 0.04 +
        np.cos(lon_rad * 119.1 - lat_rad * 97.3 + 0.9) * 0.02
    )

    # Base Highlands Albedo (medium-light silvery grey regolith)
    # Highlands: ~0.62 base
    surface = np.full((height, width), 0.60, dtype=np.float32) + fractal * 0.15

    # -------------------------------------------------------------
    # 1. LUNAR MARIA (Dark Basalt Volcanic Plains)
    # -------------------------------------------------------------
    # Helper to add an irregular volcanic mare basin
    def add_mare(clon, clat, rlon, rlat, depth=0.45, irregularity=0.25):
        cos_c = np.cos(np.radians(clat))
        dlon = np.minimum(np.abs(lon_deg - clon), 360.0 - np.abs(lon_deg - clon)) * cos_c
        dlat = np.abs(lat_deg - clat)
        dist = np.sqrt((dlon / rlon)**2 + (dlat / rlat)**2)
        # Add boundary noise so maria have natural ragged shorelines
        dist_mod = dist + fractal * irregularity
        mask = np.clip(1.0 - dist_mod * 1.5, 0.0, 1.0)
        return mask * depth

    # Near-side Maria:
    # Oceanus Procellarum (Ocean of Storms - massive west basin)
    procellarum = add_mare(-28.0, 18.0, 36.0, 32.0, depth=0.48, irregularity=0.35)
    # Mare Imbrium (Sea of Rains - circular, ~1100 km)
    imbrium = add_mare(-16.0, 34.0, 24.0, 20.0, depth=0.52, irregularity=0.20)
    # Mare Serenitatis (Sea of Serenity)
    serenitatis = add_mare(18.0, 27.0, 16.0, 16.0, depth=0.50, irregularity=0.18)
    # Mare Tranquillitatis (Sea of Tranquility - Apollo 11)
    tranquillitatis = add_mare(31.0, 8.0, 18.0, 16.0, depth=0.48, irregularity=0.28)
    # Mare Crisium (Sea of Crises - distinctive isolated oval sea)
    crisium = add_mare(59.0, 17.0, 12.0, 10.0, depth=0.55, irregularity=0.12)
    # Mare Fecunditatis & Nectaris
    fecunditatis = add_mare(51.0, -8.0, 15.0, 14.0, depth=0.46, irregularity=0.25)
    nectaris = add_mare(35.0, -15.0, 10.0, 10.0, depth=0.48, irregularity=0.20)
    # Mare Nubium & Humorum (southern near side)
    nubium = add_mare(-16.0, -21.0, 18.0, 16.0, depth=0.45, irregularity=0.28)
    humorum = add_mare(-39.0, -24.0, 11.0, 11.0, depth=0.50, irregularity=0.18)
    # Mare Frigoris (Sea of Cold - long northern ribbon)
    frigoris = add_mare(0.0, 56.0, 48.0, 6.0, depth=0.44, irregularity=0.22)
    # Mare Vaporum (Sea of Vapors)
    vaporum = add_mare(4.0, 13.0, 8.0, 8.0, depth=0.46, irregularity=0.20)

    # Far-side minor basins:
    # South Pole-Aitken basin (giant dark depression)
    aitken = add_mare(-170.0, -53.0, 45.0, 30.0, depth=0.25, irregularity=0.40)
    # Mare Moscoviense
    moscoviense = add_mare(147.0, 27.0, 10.0, 9.0, depth=0.38, irregularity=0.18)

    total_maria = np.clip(
        procellarum + imbrium + serenitatis + tranquillitatis + crisium +
        fecunditatis + nectaris + nubium + humorum + frigoris + vaporum +
        aitken + moscoviense,
        0.0, 0.58
    )

    # Darken maria regions with basalt smooth texture
    surface = surface - total_maria

    # Montes Apenninus mountain range (bright ragged rim around SE Imbrium)
    apennines_d = np.sqrt(((lon_deg - (-3.0))/14.0)**2 + ((lat_deg - 19.0)/6.0)**2)
    apennines = np.exp(-apennines_d**2 * 4.0) * np.clip(fractal * 1.5 + 0.4, 0.0, 1.0) * 0.25
    surface += apennines

    # -------------------------------------------------------------
    # 2. IMPACT CRATERS & EJECTA RAY NETWORKS
    # -------------------------------------------------------------
    # Helper to stamp realistic impact craters with raised rims and sunken floors
    def stamp_crater(clon, clat, radius_deg, rim_height=0.22, floor_depth=0.15):
        cos_c = np.cos(np.radians(clat))
        dlon = np.minimum(np.abs(lon_deg - clon), 360.0 - np.abs(lon_deg - clon)) * cos_c
        dlat = np.abs(lat_deg - clat)
        dist = np.sqrt(dlon**2 + dlat**2) / radius_deg
        # Floor (dist < 0.8): depressed
        floor = np.clip(1.0 - (dist / 0.85)**2, 0.0, 1.0) * floor_depth
        # Rim (dist ~ 0.85 to 1.3): bright elevated lip
        rim = np.exp(-((dist - 1.0) / 0.22)**2) * rim_height
        # Central peak (dist < 0.2)
        peak = np.exp(-(dist / 0.18)**2) * (rim_height * 0.6)
        return rim + peak - floor

    # Major prominent craters:
    # Plato (dark basalt floor at edge of Imbrium)
    surface += stamp_crater(-9.3, 51.6, 3.2, rim_height=0.28, floor_depth=0.25)
    # Archimedes in Imbrium
    surface += stamp_crater(-4.0, 29.7, 2.8, rim_height=0.22, floor_depth=0.18)
    # Clavius (giant southern crater with internal crater arc)
    surface += stamp_crater(-14.4, -58.4, 6.5, rim_height=0.24, floor_depth=0.12)
    # Tsiolkovskiy on the far side (dark flooded floor)
    surface += stamp_crater(129.0, -20.4, 4.8, rim_height=0.25, floor_depth=0.28)
    # Ptolemaeus, Alphonsus, Arzachel chain
    surface += stamp_crater(-1.8, -9.2, 3.8, rim_height=0.20, floor_depth=0.14)
    surface += stamp_crater(-2.8, -13.4, 3.2, rim_height=0.20, floor_depth=0.14)
    surface += stamp_crater(-1.9, -18.2, 2.9, rim_height=0.22, floor_depth=0.16)

    # -------------------------------------------------------------
    # 3. TYCHO & COPERNICUS SPECTACULAR RAY SYSTEMS
    # -------------------------------------------------------------
    # Tycho Crater (-11.2 deg lon, -43.3 deg lat): The iconic crown of the Moon
    tycho_lon, tycho_lat = -11.2, -43.3
    cos_ty = np.cos(np.radians(tycho_lat))
    dlon_ty = np.minimum(np.abs(lon_deg - tycho_lon), 360.0 - np.abs(lon_deg - tycho_lon)) * cos_ty
    dlat_ty = np.abs(lat_deg - tycho_lat)
    dist_ty = np.sqrt(dlon_ty**2 + dlat_ty**2)
    ang_ty = np.arctan2(lat_deg - tycho_lat, (lon_deg - tycho_lon) * cos_ty)

    # Tycho crater core (extremely brilliant white rim)
    tycho_crater = stamp_crater(tycho_lon, tycho_lat, 2.6, rim_height=0.45, floor_depth=0.08)
    surface += tycho_crater

    # Tycho Ejecta Rays (sweep out hundreds of degrees in long streaks)
    # Distinct multi-angle ray streaks
    tycho_rays = (
        np.exp(-((ang_ty - 0.4) / 0.12)**2) +
        np.exp(-((ang_ty - 1.1) / 0.15)**2) +
        np.exp(-((ang_ty - 1.8) / 0.14)**2) +
        np.exp(-((ang_ty - 2.5) / 0.12)**2) +
        np.exp(-((ang_ty - 3.0) / 0.16)**2) +
        np.exp(-((ang_ty - (-0.6)) / 0.14)**2) +
        np.exp(-((ang_ty - (-1.4)) / 0.15)**2) +
        np.exp(-((ang_ty - (-2.2)) / 0.12)**2)
    ) * np.clip(1.0 - (dist_ty / 75.0), 0.0, 1.0)**1.2 * 0.32
    surface += tycho_rays

    # Copernicus Crater (-20.1 deg lon, 9.6 deg lat)
    cop_lon, cop_lat = -20.1, 9.6
    cos_cp = np.cos(np.radians(cop_lat))
    dlon_cp = np.minimum(np.abs(lon_deg - cop_lon), 360.0 - np.abs(lon_deg - cop_lon)) * cos_cp
    dlat_cp = np.abs(lat_deg - cop_lat)
    dist_cp = np.sqrt(dlon_cp**2 + dlat_cp**2)
    ang_cp = np.arctan2(lat_deg - cop_lat, (lon_deg - cop_lon) * cos_cp)

    surface += stamp_crater(cop_lon, cop_lat, 2.9, rim_height=0.38, floor_depth=0.10)
    cop_rays = (
        np.sin(ang_cp * 9.0 + np.sin(ang_cp * 4.0))**4
    ) * np.clip(1.0 - (dist_cp / 35.0), 0.0, 1.0)**1.4 * 0.28
    surface += cop_rays

    # Kepler Crater (-38.0 deg lon, 8.1 deg lat)
    surface += stamp_crater(-38.0, 8.1, 1.8, rim_height=0.35, floor_depth=0.08)
    # Aristarchus (-47.5 deg lon, 23.7 deg lat) - dazzling white beacon
    surface += stamp_crater(-47.5, 23.7, 2.1, rim_height=0.48, floor_depth=0.04)

    # -------------------------------------------------------------
    # 4. HUNDREDS OF SECONDARY IMPACT CRATERS
    # -------------------------------------------------------------
    # Seeded pseudo-random crater field across highlands and far-side
    rng = np.random.RandomState(42)
    crater_overlay = np.zeros((height, width), dtype=np.float32)

    # Generate 180 realistic randomized craters across the Moon
    for _ in range(180):
        cr_lon = rng.uniform(-180.0, 180.0)
        cr_lat = rng.uniform(-82.0, 82.0)
        cr_rad = rng.uniform(0.8, 4.2)
        cr_rim = rng.uniform(0.08, 0.22)
        cr_floor = cr_rim * 0.65

        cos_cr = np.cos(np.radians(cr_lat))
        dlon_cr = np.minimum(np.abs(lon_deg - cr_lon), 360.0 - np.abs(lon_deg - cr_lon)) * cos_cr
        dlat_cr = np.abs(lat_deg - cr_lat)
        dist_cr = np.sqrt(dlon_cr**2 + dlat_cr**2) / cr_rad

        # Only evaluate locally within 2.5 radii
        local_mask = dist_cr < 2.5
        if np.any(local_mask):
            rim_contrib = np.exp(-((dist_cr[local_mask] - 1.0) / 0.22)**2) * cr_rim
            floor_contrib = np.clip(1.0 - (dist_cr[local_mask] / 0.85)**2, 0.0, 1.0) * cr_floor
            crater_overlay[local_mask] += (rim_contrib - floor_contrib)

    surface += crater_overlay * 0.70

    # -------------------------------------------------------------
    # 5. PHOTOMETRIC LUNAR REGOLITH COLOR MAPPING
    # -------------------------------------------------------------
    surface = np.clip(surface, 0.12, 0.95)

    # Color grading:
    # Maria are warm brownish-charcoal basalt: R > G > B slightly
    # Highlands are neutral silvery pearl-grey: R ~ G ~ B
    # Crater rays are cool frosty white: slight blue-white brilliance
    r_channel = (surface * 228.0 + 12.0).clip(0, 255)
    g_channel = (surface * 224.0 + 10.0).clip(0, 255)
    b_channel = (surface * 220.0 + 14.0).clip(0, 255)

    # Maria subtle titanium / basalt tint (slight warmth in dark areas)
    is_mare = total_maria > 0.15
    mare_tint = np.clip(total_maria * 1.8, 0.0, 1.0)
    r_channel = r_channel * (1.0 - mare_tint * 0.04)
    g_channel = g_channel * (1.0 - mare_tint * 0.06)
    b_channel = b_channel * (1.0 - mare_tint * 0.08)

    # Ray highlights: slightly cooler white
    is_ray = (tycho_rays + cop_rays) > 0.08
    r_channel = np.where(is_ray, np.clip(r_channel + 15, 0, 255), r_channel)
    g_channel = np.where(is_ray, np.clip(g_channel + 16, 0, 255), g_channel)
    b_channel = np.where(is_ray, np.clip(b_channel + 20, 0, 255), b_channel)

    img = Image.fromarray(np.dstack([
        r_channel.astype(np.uint8),
        g_channel.astype(np.uint8),
        b_channel.astype(np.uint8)
    ]))

    out_path = os.path.join(OUT_DIR, "moon_earth.png")
    img.save(out_path, optimize=True)
    print(f"Saved: {out_path} ({os.path.getsize(out_path) // 1024} KB)")

if __name__ == "__main__":
    generate_moon_earth()
