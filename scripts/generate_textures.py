"""
KidStar Texture Generator
Generates vibrant, scientifically informed equirectangular textures for
the Sun, 8 planets, and Saturn's rings, optimized for WebAssembly/WebGL2.
"""

import math
import os
import numpy as np
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures")
os.makedirs(OUT_DIR, exist_ok=True)

def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)

def generate_sun(width=1024, height=512):
    print("Generating Sun texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Granulation noise via layered sine/cosine interference
    granules = (
        np.sin(u * 80.0) * np.cos(v * 40.0) * 0.4 +
        np.sin(u * 160.0 + 1.2) * np.cos(v * 80.0 + 0.8) * 0.3 +
        np.sin(u * 320.0 + 2.5) * np.sin(v * 160.0 + 1.7) * 0.2 +
        np.cos(u * 640.0 + 0.3) * np.cos(v * 320.0 + 2.1) * 0.1
    )
    # Bright coronal flare bands
    flares = np.sin(u * 30.0 + np.sin(v * 15.0)) * 0.15
    
    intensity = 0.85 + 0.15 * granules + flares
    intensity = np.clip(intensity, 0.0, 1.0)
    
    # Base radiant solar colors: deep amber -> bright yellow -> blinding white-yellow
    r = np.clip(intensity * 255 + 20, 0, 255).astype(np.uint8)
    g = np.clip(intensity * 225 - 10, 0, 255).astype(np.uint8)
    b = np.clip(intensity * 90 - 20, 0, 255).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "sun.png"), optimize=True)

def generate_mercury(width=1024, height=512):
    print("Generating Mercury texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Rocky cratered terrain noise
    noise = (
        np.sin(u * 40.0) * np.cos(v * 20.0) * 0.35 +
        np.sin(u * 90.0 + 1.0) * np.sin(v * 50.0 + 2.0) * 0.25 +
        np.cos(u * 180.0 + 0.5) * np.cos(v * 90.0 + 1.5) * 0.2 +
        np.sin(u * 360.0 + 3.0) * np.sin(v * 180.0 + 0.7) * 0.1
    )
    
    # Caloris Basin & crater ray structures
    crater_centers = [(0.3, 0.45), (0.7, 0.6), (0.45, 0.75), (0.85, 0.35), (0.15, 0.25)]
    crater_field = np.zeros((height, width), dtype=np.float32)
    for cx, cy in crater_centers:
        dx = np.minimum(np.abs(u - cx), 1.0 - np.abs(u - cx))
        dy = v - cy
        dist = np.sqrt(dx * dx + dy * dy)
        crater_field += 0.3 * np.exp(-dist * 18.0) * np.sin(dist * 60.0)
    
    val = 0.52 + 0.25 * noise + 0.15 * crater_field
    val = np.clip(val, 0.0, 1.0)
    
    # Warm brownish grey
    r = (val * 175).astype(np.uint8)
    g = (val * 165).astype(np.uint8)
    b = (val * 155).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "mercury.png"), optimize=True)

def generate_venus(width=1024, height=512):
    print("Generating Venus texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Swirling sulfuric acid cloud bands (chevron-shaped waves)
    chevron = np.sin((u + 0.2 * np.sin(v * 6.0)) * 12.0) * 0.2
    bands = np.sin(v * 28.0 + chevron * 2.0) * 0.15
    soft_noise = (
        np.sin(u * 20.0 + v * 10.0) * 0.1 +
        np.sin(u * 50.0 - v * 25.0) * 0.05
    )
    
    val = 0.6 + bands + chevron + soft_noise
    val = np.clip(val, 0.0, 1.0)
    
    # Warm golden/cream sulfuric hues
    r = np.clip(235 * val + 20, 0, 255).astype(np.uint8)
    g = np.clip(205 * val + 15, 0, 255).astype(np.uint8)
    b = np.clip(140 * val + 10, 0, 255).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "venus.png"), optimize=True)

def generate_earth(width=1024, height=512):
    print("Generating Earth texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Continents mask using multi-frequency harmonic synthesis
    # Approx: Americas (u ~ 0.15-0.35), Eurasia/Africa (u ~ 0.5-0.85), Australia (u ~ 0.85-0.95)
    lat = (v - 0.5) * np.pi  # -pi/2 to pi/2
    lon = (u - 0.5) * 2 * np.pi
    
    macro_land = (
        np.sin(lon * 1.0 + 1.2) * np.cos(lat) * 0.45 +
        np.sin(lon * 2.0 - 0.5) * np.cos(lat * 1.5) * 0.35 +
        np.sin(lon * 4.0 + 2.0) * np.cos(lat * 2.0) * 0.25 +
        np.sin(lon * 8.0) * np.sin(lat * 4.0) * 0.15
    )
    
    is_land = macro_land > 0.12
    
    # Polar ice caps: north > 75 deg (v < 0.08) and south > 70 deg (v > 0.88)
    north_ice = v < (0.08 + 0.02 * np.sin(u * 20.0))
    south_ice = v > (0.86 + 0.03 * np.cos(u * 16.0))
    is_ice = north_ice | south_ice
    
    # Swirling dynamic white clouds
    clouds = (
        np.sin(u * 25.0 + np.sin(v * 15.0)) * 0.3 +
        np.sin(u * 50.0 - np.cos(v * 20.0)) * 0.25 +
        np.sin(u * 100.0 + v * 50.0) * 0.15
    )
    cloud_mask = clouds > 0.25
    cloud_alpha = np.clip((clouds - 0.25) / 0.45, 0.0, 0.85)
    
    # Base oceans (deep vibrant blue)
    ocean_r = np.full_like(v, 24)
    ocean_g = np.full_like(v, 82)
    ocean_b = np.full_like(v, 165)
    
    # Land colors: green vegetation + brown highlands
    elevation = np.clip((macro_land - 0.12) * 2.5, 0.0, 1.0)
    land_r = (50 + elevation * 90).astype(np.uint8)
    land_g = (120 - elevation * 20).astype(np.uint8)
    land_b = (45 + elevation * 10).astype(np.uint8)
    
    r = np.where(is_land, land_r, ocean_r)
    g = np.where(is_land, land_g, ocean_g)
    b = np.where(is_land, land_b, ocean_b)
    
    # Apply polar ice
    r = np.where(is_ice, 240, r)
    g = np.where(is_ice, 248, g)
    b = np.where(is_ice, 255, b)
    
    # Blend clouds
    r = (r * (1.0 - cloud_alpha) + 255 * cloud_alpha).astype(np.uint8)
    g = (g * (1.0 - cloud_alpha) + 255 * cloud_alpha).astype(np.uint8)
    b = (b * (1.0 - cloud_alpha) + 255 * cloud_alpha).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "earth.png"), optimize=True)

def generate_mars(width=1024, height=512):
    print("Generating Mars texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    terrain = (
        np.sin(u * 15.0) * np.cos(v * 10.0) * 0.35 +
        np.sin(u * 35.0 + 2.0) * np.sin(v * 20.0 + 1.0) * 0.25 +
        np.cos(u * 70.0) * np.cos(v * 40.0) * 0.15
    )
    
    # Volcanic basaltic dark patches (e.g. Syrtis Major)
    dark_highlands = np.exp(-((u - 0.6)**2 / 0.02 + (v - 0.5)**2 / 0.03)) * 0.4
    dark_acidalia = np.exp(-((u - 0.25)**2 / 0.03 + (v - 0.35)**2 / 0.02)) * 0.35
    dark_features = dark_highlands + dark_acidalia
    
    # Polar ice caps
    north_cap = v < 0.06
    south_cap = v > 0.94
    is_cap = north_cap | south_cap
    
    val = 0.5 + 0.3 * terrain - 0.4 * dark_features
    val = np.clip(val, 0.0, 1.0)
    
    r = (185 * val + 45).astype(np.uint8)
    g = (85 * val + 25).astype(np.uint8)
    b = (50 * val + 15).astype(np.uint8)
    
    # Caps
    r = np.where(is_cap, 245, r)
    g = np.where(is_cap, 245, g)
    b = np.where(is_cap, 250, b)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "mars.png"), optimize=True)

def generate_jupiter(width=1024, height=512):
    print("Generating Jupiter texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Latitudinal cloud belts and zones
    lat_bands = (
        np.sin(v * 45.0) * 0.35 +
        np.sin(v * 90.0 + 0.5) * 0.15 +
        np.cos(v * 18.0) * 0.2
    )
    # Zonal turbulence eddies
    eddies = np.sin(u * 35.0 + np.sin(v * 30.0) * 3.0) * 0.12
    
    # Great Red Spot in Southern Hemisphere (v ~ 0.65, u ~ 0.45)
    grs_dx = np.minimum(np.abs(u - 0.45), 1.0 - np.abs(u - 0.45))
    grs_dy = v - 0.65
    grs_dist = (grs_dx / 0.08)**2 + (grs_dy / 0.04)**2
    is_grs = grs_dist < 1.0
    grs_factor = np.exp(-grs_dist * 1.5)
    
    pattern = 0.5 + lat_bands + eddies
    pattern = np.clip(pattern, 0.0, 1.0)
    
    # Cream / Ochre / Warm brown bands
    r = (210 * pattern + 35).astype(np.uint8)
    g = (165 * pattern + 25).astype(np.uint8)
    b = (115 * pattern + 20).astype(np.uint8)
    
    # Stamp the Great Red Spot with iconic crimson-brick red
    r = np.where(is_grs, (r * (1.0 - grs_factor) + 215 * grs_factor).astype(np.uint8), r)
    g = np.where(is_grs, (g * (1.0 - grs_factor) + 65 * grs_factor).astype(np.uint8), g)
    b = np.where(is_grs, (b * (1.0 - grs_factor) + 45 * grs_factor).astype(np.uint8), b)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "jupiter.png"), optimize=True)

def generate_saturn(width=1024, height=512):
    print("Generating Saturn texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Subtle golden amber atmospheric bands
    bands = (
        np.sin(v * 32.0) * 0.15 +
        np.sin(v * 64.0) * 0.08 +
        np.cos(v * 16.0) * 0.1
    )
    soft_noise = np.sin(u * 20.0 + v * 10.0) * 0.03
    
    pattern = 0.6 + bands + soft_noise
    pattern = np.clip(pattern, 0.0, 1.0)
    
    # Butterscotch / golden-tan hue
    r = (230 * pattern + 15).astype(np.uint8)
    g = (200 * pattern + 12).astype(np.uint8)
    b = (135 * pattern + 10).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "saturn.png"), optimize=True)

def generate_saturn_ring(width=1024, height=64):
    """
    Generates Saturn's rings texture with transparency (RGBA).
    X axis corresponds to radial distance from inner ring edge to outer ring edge.
    Features: Ring C (inner faint), Ring B (bright dense), Cassini Division (gap), Ring A, Encke Gap.
    """
    print("Generating Saturn Ring texture...")
    x = np.linspace(0.0, 1.0, width)
    # y is trivial since texture maps radially along U
    
    # Structure of Saturn's Rings from inner (0.0) to outer (1.0):
    # 0.00 - 0.15: C Ring (semi-transparent, dimmer)
    # 0.15 - 0.60: B Ring (brightest, densest)
    # 0.60 - 0.68: Cassini Division (dark, nearly transparent gap!)
    # 0.68 - 0.95: A Ring (medium bright)
    # 0.85 - 0.87: Encke Gap (fine gap inside A Ring)
    # 0.95 - 1.00: F Ring / Outer falloff
    
    alpha = np.zeros(width, dtype=np.float32)
    brightness = np.zeros(width, dtype=np.float32)
    
    for i, r in enumerate(x):
        if r < 0.15:
            # C Ring
            t = r / 0.15
            alpha[i] = 0.25 * smoothstep(0.0, 0.05, r)
            brightness[i] = 0.65
        elif r < 0.60:
            # B Ring
            sub_grooves = 0.85 + 0.15 * np.sin(r * 400.0)
            alpha[i] = 0.92 * sub_grooves
            brightness[i] = 0.95 * sub_grooves
        elif r < 0.68:
            # Cassini Division
            alpha[i] = 0.03  # Faint dusty traces
            brightness[i] = 0.3
        elif r < 0.95:
            # A Ring
            if 0.84 < r < 0.87:
                # Encke gap
                alpha[i] = 0.05
                brightness[i] = 0.35
            else:
                sub_grooves = 0.88 + 0.12 * np.cos(r * 350.0)
                alpha[i] = 0.75 * sub_grooves
                brightness[i] = 0.85 * sub_grooves
        else:
            # Outer edge taper
            alpha[i] = 0.3 * smoothstep(1.0, 0.95, r)
            brightness[i] = 0.7
            
    # Golden sand tone for ring particles (water ice + dust)
    r_col = np.clip(brightness * 230, 0, 255).astype(np.uint8)
    g_col = np.clip(brightness * 205, 0, 255).astype(np.uint8)
    b_col = np.clip(brightness * 165, 0, 255).astype(np.uint8)
    a_col = np.clip(alpha * 255, 0, 255).astype(np.uint8)
    
    # Broadcast across height
    rgba_strip = np.dstack([r_col, g_col, b_col, a_col])[0]  # shape (width, 4)
    rgba_image = np.tile(rgba_strip, (height, 1, 1))
    
    img = Image.fromarray(rgba_image, mode="RGBA")
    img.save(os.path.join(OUT_DIR, "saturn_ring.png"), optimize=True)

def generate_uranus(width=1024, height=512):
    print("Generating Uranus texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Smooth serene cyan/aquamarine ice giant with faint polar haze
    haze = 0.9 + 0.1 * np.cos((v - 0.5) * np.pi)
    faint_band = np.sin(v * 20.0) * 0.02
    
    val = np.clip(haze + faint_band, 0.0, 1.0)
    
    r = (145 * val + 20).astype(np.uint8)
    g = (215 * val + 20).astype(np.uint8)
    b = (225 * val + 20).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "uranus.png"), optimize=True)

def generate_neptune(width=1024, height=512):
    print("Generating Neptune texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Deep cobalt blue with white methane cirrus streaks
    base_bands = np.sin(v * 24.0) * 0.08
    
    # Great Dark Spot (v ~ 0.55, u ~ 0.35)
    gds_dist = ((u - 0.35) / 0.07)**2 + ((v - 0.55) / 0.04)**2
    is_gds = gds_dist < 1.0
    
    # Bright white methane cloud streaks
    cirrus = (
        np.sin(u * 60.0 + v * 30.0) * 0.3 +
        np.sin(u * 120.0 - v * 40.0) * 0.2
    )
    is_cirrus = cirrus > 0.32
    cirrus_alpha = np.clip((cirrus - 0.32) / 0.25, 0.0, 0.9)
    
    val = 0.55 + base_bands
    val = np.clip(val, 0.0, 1.0)
    
    # Deep rich azure / royal blue
    r = (45 * val + 15).astype(np.uint8)
    g = (105 * val + 25).astype(np.uint8)
    b = (225 * val + 25).astype(np.uint8)
    
    # Great dark spot
    r = np.where(is_gds, (r * 0.6).astype(np.uint8), r)
    g = np.where(is_gds, (g * 0.6).astype(np.uint8), g)
    b = np.where(is_gds, (b * 0.7).astype(np.uint8), b)
    
    # Methane cirrus clouds
    r = (r * (1.0 - cirrus_alpha) + 245 * cirrus_alpha).astype(np.uint8)
    g = (g * (1.0 - cirrus_alpha) + 250 * cirrus_alpha).astype(np.uint8)
    b = (b * (1.0 - cirrus_alpha) + 255 * cirrus_alpha).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "neptune.png"), optimize=True)

def generate_starfield(width=2048, height=1024):
    print("Generating Starfield & Milky Way panorama...")
    np.random.seed(42)  # Deterministic seed for reproducible astronomy
    
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Base cosmic background: deep space indigo
    img_data = np.zeros((height, width, 3), dtype=np.float32)
    img_data[:, :, 0] = 3.0
    img_data[:, :, 1] = 4.0
    img_data[:, :, 2] = 8.0
    
    # 1. Milky Way galactic plane: sinusoidal band
    mw_center = 0.5 + 0.26 * np.sin(2.0 * math.pi * u - 1.2)
    dist_to_mw = np.abs(v - mw_center)
    
    # Multi-frequency galactic clouds
    mw_noise = (
        np.sin(u * 24.0) * np.cos(v * 16.0) * 0.35 +
        np.sin(u * 50.0 + 1.3) * np.sin(v * 32.0 + 0.7) * 0.25 +
        np.cos(u * 110.0 + 2.1) * np.cos(v * 64.0 + 1.4) * 0.15 +
        np.sin(u * 220.0 + 0.5) * np.cos(v * 120.0 + 2.3) * 0.1
    )
    
    # Dark dust rifts (Great Rift)
    rift = np.sin(u * 40.0 - 0.5) * np.cos(v * 28.0) * 0.4
    dark_lane = np.exp(-((v - mw_center - 0.02 * rift) / 0.028)**2) * 0.65
    
    # Galactic core bulge around Sagittarius (u ~ 0.72)
    core_dist = np.sqrt(((u - 0.72) / 0.14)**2 + ((v - 0.5 - 0.26 * np.sin(2.0 * math.pi * 0.72 - 1.2)) / 0.10)**2)
    core_glow = np.exp(-(core_dist**2) * 4.0) * 1.4
    
    # Diffuse galactic light intensity
    mw_profile = np.exp(-(dist_to_mw / 0.09)**2) * (0.8 + mw_noise) + core_glow
    mw_profile = np.clip(mw_profile * (1.0 - dark_lane), 0.0, 2.0)
    
    # Milky Way colors: blend of warm star core, deep violet, and ethereal cyan
    img_data[:, :, 0] += mw_profile * 38.0
    img_data[:, :, 1] += mw_profile * 32.0
    img_data[:, :, 2] += mw_profile * 64.0
    
    # 2. Pinpoint Background Stars (~4,000 stars)
    num_faint_stars = 4000
    star_x = np.random.randint(0, width, num_faint_stars)
    star_y = np.random.randint(0, height, num_faint_stars)
    star_b = np.random.uniform(80, 210, num_faint_stars)
    
    for sx, sy, sb in zip(star_x, star_y, star_b):
        dist_mw = abs((sy / height) - (0.5 + 0.26 * math.sin(2.0 * math.pi * (sx / width) - 1.2)))
        boost = 1.4 if dist_mw < 0.12 else 1.0
        val = min(255.0, sb * boost)
        tint = np.random.choice([0, 1, 2])
        if tint == 0:
            img_data[sy, sx] += [val * 0.85, val * 0.95, val]
        elif tint == 1:
            img_data[sy, sx] += [val, val, val]
        else:
            img_data[sy, sx] += [val, val * 0.88, val * 0.7]

    # 3. Prominent Constellation Stars & Bright Navigation Stars
    bright_stars = [
        # Orion
        (0.24, 0.48, 255, [255, 180, 100], 4), # Betelgeuse (M-type supergiant, red-orange)
        (0.26, 0.54, 255, [180, 220, 255], 4), # Rigel (B-type supergiant, icy blue)
        (0.23, 0.49, 210, [210, 230, 255], 3), # Bellatrix
        (0.26, 0.53, 200, [200, 220, 255], 3), # Saiph
        (0.245, 0.51, 220, [220, 230, 255], 3), # Belt: Alnitak
        (0.248, 0.512, 220, [220, 230, 255], 3), # Belt: Alnilam
        (0.251, 0.514, 220, [220, 230, 255], 3), # Belt: Mintaka
        # Canis Major (Sirius)
        (0.28, 0.59, 255, [220, 240, 255], 5), # Sirius
        # Ursa Major (Big Dipper)
        (0.48, 0.22, 230, [255, 255, 255], 3), # Dubhe
        (0.47, 0.24, 220, [230, 240, 255], 3), # Merak
        (0.50, 0.25, 210, [240, 240, 255], 3), # Phecda
        (0.51, 0.23, 200, [240, 240, 255], 3), # Megrez
        (0.53, 0.22, 230, [255, 255, 255], 3), # Alioth
        (0.55, 0.21, 225, [240, 245, 255], 3), # Mizar
        (0.57, 0.22, 220, [230, 240, 255], 3), # Alkaid
        # Polaris
        (0.10, 0.05, 235, [255, 250, 230], 4),
        # Cassiopeia (W)
        (0.04, 0.18, 225, [255, 210, 150], 3),
        (0.02, 0.17, 220, [230, 240, 255], 3),
        (0.05, 0.16, 230, [220, 240, 255], 3),
        (0.07, 0.18, 215, [230, 240, 255], 3),
        (0.09, 0.17, 205, [220, 235, 255], 3),
        # Scorpius & Antares
        (0.68, 0.62, 255, [255, 140, 70], 4),
        # Taurus & Aldebaran
        (0.19, 0.42, 245, [255, 175, 90], 4),
        # Lyra (Vega)
        (0.78, 0.31, 255, [210, 235, 255], 4),
        # Cygnus (Deneb)
        (0.84, 0.27, 240, [230, 245, 255], 4),
        # Aquila (Altair)
        (0.82, 0.45, 240, [255, 255, 255], 4),
        # Boötes (Arcturus)
        (0.60, 0.39, 255, [255, 190, 110], 4),
    ]
    
    palette = [
        [255, 255, 255], [200, 230, 255], [255, 220, 160], [255, 180, 120]
    ]
    for _ in range(80):
        bx = float(np.random.uniform(0.02, 0.98))
        by = float(np.random.uniform(0.05, 0.95))
        bcol = palette[int(np.random.randint(0, len(palette)))]
        bright_stars.append((bx, by, float(np.random.uniform(180, 240)), bcol, int(np.random.choice([2, 3]))))
    
    for ux, vy, intensity, color, radius in bright_stars:
        cx = int(ux * width) % width
        cy = int(vy * height) % height
        for dy in range(-radius * 2, radius * 2 + 1):
            for dx in range(-radius * 2, radius * 2 + 1):
                px = (cx + dx) % width
                py = (cy + dy) % height
                dist_sq = dx * dx + dy * dy
                falloff = math.exp(-dist_sq / (2.0 * (radius * 0.6)**2))
                img_data[py, px, 0] += color[0] * falloff * (intensity / 255.0)
                img_data[py, px, 1] += color[1] * falloff * (intensity / 255.0)
                img_data[py, px, 2] += color[2] * falloff * (intensity / 255.0)
                
        if radius >= 4:
            spike_len = radius * 4
            for s in range(1, spike_len + 1):
                s_falloff = (1.0 - s / spike_len) * 0.4
                for dx, dy in [(s, 0), (-s, 0), (0, s), (0, -s)]:
                    px = (cx + dx) % width
                    py = (cy + dy) % height
                    img_data[py, px, 0] += color[0] * s_falloff
                    img_data[py, px, 1] += color[1] * s_falloff
                    img_data[py, px, 2] += color[2] * s_falloff

    # 4. Pleiades Cluster (Seven Sisters in Taurus)
    pl_base_x = int(0.16 * width)
    pl_base_y = int(0.40 * height)
    pleiades_offsets = [(0, 0), (4, -2), (-3, 3), (8, 2), (-6, -4), (12, -1), (5, 6)]
    for dox, doy in pleiades_offsets:
        px = (pl_base_x + dox) % width
        py = (pl_base_y + doy) % height
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                spx = (px + dx) % width
                spy = (py + dy) % height
                falloff = math.exp(-(dx*dx + dy*dy) / 2.0)
                img_data[spy, spx, 0] += 160 * falloff
                img_data[spy, spx, 1] += 210 * falloff
                img_data[spy, spx, 2] += 255 * falloff

    img_data = np.clip(img_data, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_data)
    img.save(os.path.join(OUT_DIR, "starfield.png"), optimize=True)
    print("Starfield texture saved to starfield.png!")

def generate_corona(size=512):
    print("Generating Solar Corona glow texture...")
    y, x = np.mgrid[0:size, 0:size]
    cx = size / 2.0
    cy = size / 2.0
    
    dx = (x - cx) / (size / 2.0)
    dy = (y - cy) / (size / 2.0)
    dist = np.sqrt(dx * dx + dy * dy)
    angle = np.arctan2(dy, dx)
    
    # Coronal flare streamers
    streamers = (
        np.sin(angle * 8.0) * 0.15 +
        np.sin(angle * 16.0 + 1.2) * 0.12 +
        np.cos(angle * 24.0 + 2.5) * 0.08
    )
    
    effective_dist = dist - streamers * 0.15
    alpha = np.exp(-(effective_dist / 0.35)**2) * 1.2
    alpha = np.clip(alpha, 0.0, 1.0)
    
    # Corona color: Golden amber radiating out to soft lemon-yellow
    r = np.full((size, size), 255, dtype=np.uint8)
    g = np.clip(230 - dist * 60, 150, 255).astype(np.uint8)
    b = np.clip(120 - dist * 100, 30, 200).astype(np.uint8)
    a = (alpha * 255).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b, a]))
    img.save(os.path.join(OUT_DIR, "corona.png"), optimize=True)
    print("Solar Corona texture saved to corona.png!")

def generate_moon_earth(width=2048, height=1024):
    print("Generating Photorealistic Earth's Moon texture...")
    from generate_moon_texture import generate_moon_earth as gen_moon
    gen_moon(width, height)

def generate_moon_io(width=512, height=256):
    print("Generating Jupiter's Moon Io texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    sulfur = (
        np.sin(u * 25.0) * np.cos(v * 20.0) * 0.25 +
        np.sin(u * 60.0 + 1.4) * np.sin(v * 40.0 + 0.9) * 0.18
    )
    calderas = [
        (0.28, 0.55, 0.05),
        (0.68, 0.45, 0.07),
        (0.45, 0.52, 0.04),
        (0.85, 0.60, 0.05),
        (0.15, 0.35, 0.04),
    ]
    dark_pits = np.zeros((height, width), dtype=np.float32)
    red_halos = np.zeros((height, width), dtype=np.float32)
    for cu, cv, cr in calderas:
        d = np.sqrt(((u - cu)/cr)**2 + ((v - cv)/cr)**2)
        dark_pits += np.exp(-d**2 * 4.0) * 0.8
        ring_d = np.abs(d - 1.5)
        red_halos += np.exp(-ring_d**2 * 5.0) * 0.6
        
    base_val = np.clip(0.65 + sulfur, 0.0, 1.0)
    r = np.clip(base_val * 245 + red_halos * 180 - dark_pits * 190, 30, 255).astype(np.uint8)
    g = np.clip(base_val * 210 - red_halos * 120 - dark_pits * 180, 25, 235).astype(np.uint8)
    b = np.clip(base_val * 60 - dark_pits * 50, 15, 120).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "moon_io.png"), optimize=True)

def generate_moon_europa(width=512, height=256):
    print("Generating Jupiter's Moon Europa texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    ice_base = np.sin(u * 15.0) * np.sin(v * 15.0) * 0.05
    lineae = (
        np.sin(u * 50.0 + v * 30.0) * 0.25 +
        np.sin(u * 80.0 - v * 60.0 + 1.2) * 0.22 +
        np.cos(u * 120.0 + v * 80.0 + 2.5) * 0.18
    )
    crack_intensity = np.clip(1.0 - np.abs(lineae) / 0.06, 0.0, 1.0)
    
    r = (235 + ice_base * 40 - crack_intensity * 75).astype(np.uint8)
    g = (230 + ice_base * 40 - crack_intensity * 120).astype(np.uint8)
    b = (225 + ice_base * 40 - crack_intensity * 140).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "moon_europa.png"), optimize=True)

def generate_moon_ganymede(width=512, height=256):
    print("Generating Jupiter's Moon Ganymede texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    grooves = np.sin(u * 60.0 + np.sin(v * 25.0) * 2.0) * 0.35
    polygons = np.cos(u * 16.0) * np.sin(v * 14.0)
    is_dark_terrain = polygons > 0.1
    
    val = 0.55 + grooves * 0.25
    val = np.where(is_dark_terrain, val * 0.65, val * 1.1)
    val = np.clip(val, 0.2, 0.95)
    
    r = (val * 185).astype(np.uint8)
    g = (val * 175).astype(np.uint8)
    b = (val * 165).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "moon_ganymede.png"), optimize=True)

def generate_moon_callisto(width=512, height=256):
    print("Generating Jupiter's Moon Callisto texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    crust = (
        np.sin(u * 70.0) * np.cos(v * 50.0) * 0.2 +
        np.sin(u * 140.0 + 1.1) * np.sin(v * 100.0) * 0.15
    )
    valhalla_d = np.sqrt(((u - 0.35)/0.25)**2 + ((v - 0.55)/0.25)**2)
    valhalla_rings = np.cos(valhalla_d * 30.0) * 0.2 * np.exp(-valhalla_d * 2.5)
    
    val = 0.38 + crust + valhalla_rings
    val = np.clip(val, 0.15, 0.85)
    
    r = (val * 150).astype(np.uint8)
    g = (val * 140).astype(np.uint8)
    b = (val * 135).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "moon_callisto.png"), optimize=True)

def generate_moon_titan(width=512, height=256):
    print("Generating Saturn's Moon Titan texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    haze = np.sin(v * 12.0) * 0.08
    equator_dist = np.abs(v - 0.5)
    is_dunes = (equator_dist < 0.12) & (np.sin(u * 35.0) > 0.0)
    is_polar_lake = (v < 0.15) & (np.sin(u * 20.0 + 1.2) > 0.2)
    
    val = 0.65 + haze
    r = (val * 235).astype(np.uint8)
    g = (val * 165).astype(np.uint8)
    b = (val * 65).astype(np.uint8)
    
    r = np.where(is_dunes, (r * 0.68).astype(np.uint8), r)
    g = np.where(is_dunes, (g * 0.65).astype(np.uint8), g)
    b = np.where(is_dunes, (b * 0.60).astype(np.uint8), b)
    
    r = np.where(is_polar_lake, (r * 0.50).astype(np.uint8), r)
    g = np.where(is_polar_lake, (g * 0.55).astype(np.uint8), g)
    b = np.where(is_polar_lake, (b * 0.65).astype(np.uint8), b)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "moon_titan.png"), optimize=True)

def generate_earth_night(width=1024, height=512):
    print("Generating Earth Night City Lights texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    lat = (v - 0.5) * np.pi
    lon = (u - 0.5) * 2 * np.pi
    
    macro_land = (
        np.sin(lon * 1.0 + 1.2) * np.cos(lat) * 0.45 +
        np.sin(lon * 2.0 - 0.5) * np.cos(lat * 1.5) * 0.35 +
        np.sin(lon * 4.0 + 2.0) * np.cos(lat * 2.0) * 0.25 +
        np.sin(lon * 8.0) * np.sin(lat * 4.0) * 0.15
    )
    is_land = macro_land > 0.12
    is_habitable = is_land & (v > 0.12) & (v < 0.82)
    
    density = (
        np.sin(lon * 12.0) * np.cos(lat * 8.0) * 0.35 +
        np.sin(lon * 24.0 + 1.2) * np.sin(lat * 16.0 + 0.8) * 0.25 +
        np.cos(lon * 48.0 + 2.1) * np.cos(lat * 32.0 + 1.4) * 0.20 +
        np.sin(lon * 96.0 + 0.5) * np.sin(lat * 64.0 + 2.3) * 0.15
    )
    
    metro_hubs = [
        (0.24, 0.28, 0.05, 1.2),
        (0.20, 0.30, 0.04, 1.0),
        (0.14, 0.32, 0.04, 1.1),
        (0.51, 0.26, 0.06, 1.4),
        (0.53, 0.28, 0.05, 1.3),
        (0.88, 0.33, 0.05, 1.5),
        (0.82, 0.35, 0.06, 1.4),
        (0.70, 0.40, 0.06, 1.5),
        (0.32, 0.65, 0.04, 1.1),
        (0.54, 0.42, 0.03, 1.3),
    ]
    
    hub_glow = np.zeros((height, width), dtype=np.float32)
    for hx, hy, hr, hi in metro_hubs:
        d = np.sqrt(((u - hx)/hr)**2 + ((v - hy)/hr)**2)
        hub_glow += np.exp(-d**2 * 4.0) * hi
        
    city_intensity = np.where(is_habitable, (density + 0.25).clip(0.0, 1.0)**2.5 + hub_glow * 0.8, 0.0)
    city_intensity = np.clip(city_intensity, 0.0, 1.0)
    
    r = (city_intensity * 255).astype(np.uint8)
    g = (city_intensity * 215).astype(np.uint8)
    b = (city_intensity * 120).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "earth_night.png"), optimize=True)
    print("Earth Night City Lights texture saved to earth_night.png!")

def generate_earth_clouds(width=1024, height=512):
    print("Generating Earth Dynamic Cloud layer texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    itcz = np.exp(-((v - 0.5) / 0.06)**2) * (np.sin(u * 30.0) * 0.2 + 0.7)
    cyclones = (
        np.sin(u * 18.0 + np.sin(v * 12.0) * 2.0) * 0.35 +
        np.sin(u * 36.0 - np.cos(v * 20.0) * 1.5) * 0.25 +
        np.cos(u * 72.0 + v * 40.0) * 0.15 +
        np.sin(u * 144.0 - v * 80.0) * 0.08
    )
    
    total_clouds = itcz * 0.6 + cyclones
    total_clouds = np.clip(total_clouds, 0.0, 1.0)
    
    alpha = np.where(total_clouds > 0.28, (total_clouds - 0.28) / 0.55, 0.0)
    alpha = np.clip(alpha, 0.0, 0.90)
    
    r = np.full((height, width), 255, dtype=np.uint8)
    g = np.full((height, width), 255, dtype=np.uint8)
    b = np.full((height, width), 255, dtype=np.uint8)
    a = (alpha * 255).astype(np.uint8)
    
    img = Image.fromarray(np.dstack([r, g, b, a]))
    img.save(os.path.join(OUT_DIR, "earth_clouds.png"), optimize=True)
    print("Earth Clouds texture saved to earth_clouds.png!")

def generate_ceres(width=512, height=256):
    print("Generating Ceres texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height

    # Cratered rocky noise
    base_cratering = (
        np.sin(u * 28.0) * np.cos(v * 14.0) * 0.25 +
        np.sin(u * 56.0 + 1.2) * np.sin(v * 28.0) * 0.18 +
        np.cos(u * 112.0) * np.cos(v * 56.0) * 0.12 +
        np.sin(u * 224.0) * 0.08
    )
    intensity = 0.42 + base_cratering * 0.25
    intensity = np.clip(intensity, 0.15, 0.70)

    # Occator Crater bright sodium carbonate salt spots
    dx = (u - 0.52)
    dy = (v - 0.42)
    dist_occator = np.sqrt(dx*dx + dy*dy)
    occator_salt = np.exp(-((dist_occator) / 0.025)**2) * 1.8
    # Cerealia Facula bright center + secondary spots
    faculae = np.exp(-((np.sqrt((u - 0.54)**2 + (dy)**2)) / 0.012)**2) * 1.4
    bright_spots = np.clip(occator_salt + faculae, 0.0, 1.0)

    r = np.clip((intensity * 145 + bright_spots * 180), 0, 255).astype(np.uint8)
    g = np.clip((intensity * 145 + bright_spots * 185), 0, 255).astype(np.uint8)
    b = np.clip((intensity * 150 + bright_spots * 195), 0, 255).astype(np.uint8)

    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "ceres.png"), optimize=True)
    print("Ceres texture saved to ceres.png!")

def generate_pluto(width=512, height=256):
    print("Generating Pluto texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height

    # Equatorial dark reddish-brown tholin terrain (Cthulhu Macula)
    equator_band = np.exp(-((v - 0.58) / 0.18)**2) * (np.sin(u * 14.0) * 0.3 + 0.7)

    # Procedural heart-shaped Tombaugh Regio
    # Heart curve math: (x^2 + (y - sqrt(|x|))^2) <= r^2
    hx = (u - 0.48) * 5.5
    hy = -(v - 0.52) * 5.0
    heart_shape = (hx**2 + (hy - 0.6 * np.sqrt(np.abs(hx) + 0.001))**2)
    heart_glacier = np.exp(-(heart_shape / 1.2)**2) * 1.5
    heart_glacier = np.clip(heart_glacier, 0.0, 1.0)

    # Icy nitrogen plains & crater noise
    noise = (
        np.sin(u * 32.0) * np.cos(v * 18.0) * 0.2 +
        np.cos(u * 64.0 + 0.8) * 0.12
    )

    # Base palette: reddish-brown tholins + golden tan + icy cream heart
    r = np.clip(135 + equator_band * 70 - noise * 25 + heart_glacier * 95, 0, 255).astype(np.uint8)
    g = np.clip(85 + equator_band * 25 - noise * 20 + heart_glacier * 125, 0, 255).astype(np.uint8)
    b = np.clip(55 + equator_band * 10 - noise * 15 + heart_glacier * 140, 0, 255).astype(np.uint8)

    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "pluto.png"), optimize=True)
    print("Pluto texture saved to pluto.png!")

def generate_charon(width=512, height=256):
    print("Generating Charon texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height

    # Grey water-ice crust with crater noise
    cratering = (
        np.sin(u * 24.0) * np.cos(v * 16.0) * 0.22 +
        np.sin(u * 48.0 + 1.5) * 0.15 +
        np.cos(u * 96.0) * 0.1
    )
    base_grey = 0.55 + cratering * 0.25

    # Mordor Macula: dark reddish-brown polar hood
    polar_hood = np.clip((0.26 - v) / 0.20, 0.0, 1.0) * (np.sin(u * 12.0) * 0.15 + 0.85)

    # Equatorial chasm canyon belt
    canyon = np.exp(-((v - 0.50) / 0.04)**2) * 0.35

    r = np.clip(base_grey * 175 + polar_hood * 45 - canyon * 40, 0, 255).astype(np.uint8)
    g = np.clip(base_grey * 172 - polar_hood * 25 - canyon * 40, 0, 255).astype(np.uint8)
    b = np.clip(base_grey * 170 - polar_hood * 35 - canyon * 40, 0, 255).astype(np.uint8)

    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "charon.png"), optimize=True)
    print("Charon texture saved to charon.png!")

def generate_eris(width=512, height=256):
    print("Generating Eris texture...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height

    # Brilliant high-albedo methane frost surface (pure white with soft pale-blue tint)
    frost = (
        np.sin(u * 20.0) * np.cos(v * 12.0) * 0.06 +
        np.sin(u * 40.0 + 2.0) * 0.04 +
        np.cos(u * 80.0) * 0.03
    )
    intensity = 0.92 + frost

    r = np.clip(intensity * 238, 0, 255).astype(np.uint8)
    g = np.clip(intensity * 244, 0, 255).astype(np.uint8)
    b = np.clip(intensity * 252, 0, 255).astype(np.uint8)

    img = Image.fromarray(np.dstack([r, g, b]))
    img.save(os.path.join(OUT_DIR, "eris.png"), optimize=True)
    print("Eris texture saved to eris.png!")

if __name__ == "__main__":
    generate_ceres()
    generate_pluto()
    generate_charon()
    generate_eris()
    print("Dwarf planet textures generated successfully!")
