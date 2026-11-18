"""
KidStar High-Fidelity Earth Textures Generator
Generates:
1. assets/textures/earth.png - Cloudless Blue Marble with authentic continental geography,
   biomes (rainforests, deserts, temperate forests, mountain snow caps), shallow turquoise
   continental shelves, and deep oceans. ZERO baked-in clouds.
2. assets/textures/earth_clouds.png - Dedicated dynamic atmospheric cloud layer with ITCZ,
   cyclonic storm spirals (comma clouds), hurricanes, and smooth alpha blending.
3. assets/textures/earth_night.png - City lights strictly mapped to real human population centers,
   megacities, and transit corridors with warm golden-amber glow.
"""

import math
import os
import numpy as np
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures")
os.makedirs(OUT_DIR, exist_ok=True)

def generate_earth_textures(width=2048, height=1024):
    print(f"Generating High-Fidelity Earth textures ({width}x{height})...")
    y, x = np.mgrid[0:height, 0:width]
    u = x / width
    v = y / height
    
    # Lat/Lon in degrees and radians
    # v: 0 = +90 deg (North Pole), 1 = -90 deg (South Pole)
    # u: 0 = -180 deg, 0.5 = 0 deg (Prime Meridian), 1.0 = +180 deg
    lat_deg = (0.5 - v) * 180.0
    lon_deg = (u - 0.5) * 360.0
    lat_rad = np.radians(lat_deg)
    lon_rad = np.radians(lon_deg)
    
    # Multi-frequency fractal noise for natural coastline irregularity
    fractal = (
        np.sin(lon_rad * 3.0 + 1.2) * np.cos(lat_rad * 2.5) * 0.35 +
        np.sin(lon_rad * 7.0 - 0.8) * np.sin(lat_rad * 6.0) * 0.20 +
        np.cos(lon_rad * 15.0 + 2.1) * np.cos(lat_rad * 13.0) * 0.12 +
        np.sin(lon_rad * 31.0 + 0.5) * np.cos(lat_rad * 27.0) * 0.07 +
        np.sin(lon_rad * 63.0 + 1.7) * np.sin(lat_rad * 55.0) * 0.04 +
        np.cos(lon_rad * 127.0) * np.sin(lat_rad * 110.0) * 0.02
    )

    # -------------------------------------------------------------
    # 1. CONTINENTAL LANDMASS DEFINITIONS (Distance Field / Blends)
    # -------------------------------------------------------------
    # Helper: smooth rounded box/ellipsoid landmass
    def add_land(clon, clat, rlon, rlat, weight=1.0):
        # accounting for longitude wrap and polar convergence
        cos_lat = np.cos(np.radians(clat))
        dlon = np.minimum(np.abs(lon_deg - clon), 360.0 - np.abs(lon_deg - clon)) * cos_lat
        dlat = np.abs(lat_deg - clat)
        dist_sq = (dlon / rlon)**2 + (dlat / rlat)**2
        return weight * np.clip(1.0 - dist_sq, 0.0, 1.0)

    # North America
    na_main = add_land(-100.0, 48.0, 32.0, 18.0, 1.2)
    na_east = add_land(-80.0, 36.0, 14.0, 14.0, 1.1)
    na_west = add_land(-118.0, 42.0, 14.0, 16.0, 1.1)
    na_alaska = add_land(-150.0, 64.0, 20.0, 8.0, 1.2)
    na_mexico = add_land(-102.0, 24.0, 14.0, 12.0, 1.1)
    na_central = add_land(-88.0, 14.0, 8.0, 6.0, 0.9)
    greenland = add_land(-42.0, 72.0, 16.0, 12.0, 1.3)

    # South America
    sa_north = add_land(-60.0, -5.0, 18.0, 15.0, 1.2)
    sa_brazil = add_land(-48.0, -12.0, 16.0, 14.0, 1.2)
    sa_south = add_land(-65.0, -35.0, 12.0, 20.0, 1.1)

    # Europe
    eu_west = add_land(2.0, 48.0, 12.0, 10.0, 1.1)
    eu_east = add_land(25.0, 52.0, 18.0, 12.0, 1.1)
    eu_spain = add_land(-4.0, 40.0, 8.0, 6.0, 1.0)
    eu_scandi = add_land(16.0, 62.0, 10.0, 10.0, 1.1)
    uk = add_land(-3.0, 54.0, 6.0, 6.0, 0.95)

    # Africa
    af_north = add_land(15.0, 24.0, 26.0, 12.0, 1.3)
    af_west = add_land(-2.0, 12.0, 16.0, 10.0, 1.2)
    af_central = add_land(22.0, 2.0, 16.0, 14.0, 1.2)
    af_south = add_land(25.0, -22.0, 14.0, 14.0, 1.2)
    af_horn = add_land(44.0, 8.0, 10.0, 8.0, 1.0)
    madagascar = add_land(47.0, -19.0, 5.0, 10.0, 0.9)

    # Asia
    as_siberia = add_land(95.0, 60.0, 45.0, 16.0, 1.3)
    as_central = add_land(68.0, 45.0, 25.0, 14.0, 1.2)
    as_arabia = add_land(46.0, 24.0, 12.0, 10.0, 1.1)
    as_india = add_land(78.0, 20.0, 14.0, 14.0, 1.2)
    as_china = add_land(106.0, 34.0, 24.0, 15.0, 1.2)
    as_seasia = add_land(102.0, 14.0, 10.0, 12.0, 1.1)
    as_japan = add_land(138.0, 36.0, 6.0, 10.0, 0.9)
    indonesia = add_land(115.0, -2.0, 22.0, 7.0, 0.9)

    # Australia & Oceania
    aus_main = add_land(134.0, -26.0, 20.0, 14.0, 1.3)
    nz = add_land(173.0, -41.0, 6.0, 9.0, 0.85)

    # Antarctica
    antarctica = np.clip((v - 0.83) / 0.10, 0.0, 1.0) * 1.5

    # Combine landmasses
    land_height = (
        na_main + na_east + na_west + na_alaska + na_mexico + na_central + greenland +
        sa_north + sa_brazil + sa_south +
        eu_west + eu_east + eu_spain + eu_scandi + uk +
        af_north + af_west + af_central + af_south + af_horn + madagascar +
        as_siberia + as_central + as_arabia + as_india + as_china + as_seasia + as_japan + indonesia +
        aus_main + nz + antarctica
    )
    
    # Modulate landmass with fractal noise for realistic coastlines
    raw_land = land_height + fractal * 0.45
    is_land = raw_land > 0.42

    # Shallow water continental shelf mask (fringes around land)
    shelf_mask = (raw_land > 0.28) & (~is_land)
    shelf_strength = np.clip((raw_land - 0.28) / 0.14, 0.0, 1.0)

    # Polar ice caps
    north_ice = (v < 0.075 + 0.015 * np.sin(lon_rad * 5.0))
    south_ice = (v > 0.84 - 0.02 * np.cos(lon_rad * 4.0)) | (raw_land > 0.35) & (v > 0.78)
    is_ice = north_ice | south_ice

    # -------------------------------------------------------------
    # 2. BIOMES & ELEVATION COLORING
    # -------------------------------------------------------------
    # Mountain ranges: Andes, Himalayas, Rockies, Alps
    andes = add_land(-71.0, -22.0, 4.0, 28.0, 1.0)
    himalayas = add_land(85.0, 31.0, 16.0, 5.0, 1.2)
    rockies = add_land(-112.0, 44.0, 6.0, 18.0, 1.0)
    alps = add_land(11.0, 46.0, 6.0, 4.0, 1.0)
    mountains = np.clip(andes + himalayas + rockies + alps, 0.0, 1.0)

    # Arid / Desert zones (Sahara, Arabia, Gobi, Outback, US Southwest)
    sahara = add_land(18.0, 24.0, 20.0, 8.0, 1.0)
    arabian_desert = add_land(48.0, 23.0, 10.0, 7.0, 1.0)
    gobi_desert = add_land(100.0, 42.0, 14.0, 6.0, 0.9)
    aus_desert = add_land(132.0, -24.0, 14.0, 9.0, 1.0)
    deserts = np.clip(sahara + arabian_desert + gobi_desert + aus_desert, 0.0, 1.0)

    # Rainforest zones (Amazon, Congo, Southeast Asia)
    amazon = add_land(-62.0, -4.0, 14.0, 10.0, 1.0)
    congo = add_land(22.0, 0.0, 10.0, 8.0, 1.0)
    se_asia_rainforest = add_land(108.0, 4.0, 14.0, 8.0, 1.0)
    rainforests = np.clip(amazon + congo + se_asia_rainforest, 0.0, 1.0)

    # Base Deep Ocean colors
    # Latitude temperature tint (polar waters slightly deeper indigo, tropical waters vibrant royal blue)
    ocean_r = np.clip(10 + 12 * np.cos(lat_rad), 6, 25).astype(np.float32)
    ocean_g = np.clip(38 + 24 * np.cos(lat_rad), 24, 68).astype(np.float32)
    ocean_b = np.clip(95 + 35 * np.cos(lat_rad), 75, 145).astype(np.float32)

    # Blend Shallow Coastal Waters / Coral Reefs (Turquoise / Cyan glow)
    reef_r = 24.0
    reef_g = 145.0
    reef_b = 180.0
    ocean_r = ocean_r * (1.0 - shelf_strength) + reef_r * shelf_strength
    ocean_g = ocean_g * (1.0 - shelf_strength) + reef_g * shelf_strength
    ocean_b = ocean_b * (1.0 - shelf_strength) + reef_b * shelf_strength

    # Land Biome Colors:
    # 1. Temperate default green/forest
    land_r = np.full((height, width), 48.0, dtype=np.float32)
    land_g = np.full((height, width), 108.0, dtype=np.float32)
    land_b = np.full((height, width), 42.0, dtype=np.float32)

    # 2. Lush tropical rainforests (deep rich emerald)
    land_r = land_r * (1.0 - rainforests) + 26.0 * rainforests
    land_g = land_g * (1.0 - rainforests) + 88.0 * rainforests
    land_b = land_b * (1.0 - rainforests) + 32.0 * rainforests

    # 3. Golden arid deserts
    land_r = land_r * (1.0 - deserts) + 198.0 * deserts
    land_g = land_g * (1.0 - deserts) + 162.0 * deserts
    land_b = land_b * (1.0 - deserts) + 104.0 * deserts

    # 4. Rugged mountains (brown/grey granite)
    land_r = land_r * (1.0 - mountains) + 120.0 * mountains
    land_g = land_g * (1.0 - mountains) + 102.0 * mountains
    land_b = land_b * (1.0 - mountains) + 84.0 * mountains

    # 5. Snow peaks on high mountains
    snow_mask = (mountains > 0.65) | ((mountains > 0.35) & (np.abs(lat_deg) > 40.0))
    land_r = np.where(snow_mask, 235.0, land_r)
    land_g = np.where(snow_mask, 240.0, land_g)
    land_b = np.where(snow_mask, 248.0, land_b)

    # Merge ocean and land
    r = np.where(is_land, land_r, ocean_r)
    g = np.where(is_land, land_g, ocean_g)
    b = np.where(is_land, land_b, ocean_b)

    # Polar Ice (Antarctica, Greenland, Arctic)
    ice_r = 242.0
    ice_g = 248.0
    ice_b = 255.0
    r = np.where(is_ice, ice_r, r)
    g = np.where(is_ice, ice_g, g)
    b = np.where(is_ice, ice_b, b)

    # Save Cloudless Earth
    earth_img = Image.fromarray(np.dstack([
        np.clip(r, 0, 255).astype(np.uint8),
        np.clip(g, 0, 255).astype(np.uint8),
        np.clip(b, 0, 255).astype(np.uint8)
    ]))
    earth_path = os.path.join(OUT_DIR, "earth.png")
    earth_img.save(earth_path, optimize=True)
    print(f"Saved: {earth_path} ({os.path.getsize(earth_path) // 1024} KB)")

    # -------------------------------------------------------------
    # 3. DYNAMIC ATMOSPHERIC CLOUDS (Dedicated Weather Layer)
    # -------------------------------------------------------------
    # Equatorial ITCZ (Intertropical Convergence Zone)
    itcz = np.exp(-((lat_deg - 4.0) / 7.0)**2) * (
        0.55 + 0.35 * np.sin(lon_rad * 8.0) * np.cos(lon_rad * 14.0 + 1.2)
    )

    # Mid-latitude storm spirals (comma clouds) in North Atlantic & North Pacific
    storm_atl = np.exp(-(((lon_deg - (-35.0)) / 22.0)**2 + ((lat_deg - 48.0) / 12.0)**2)) * (
        np.sin(lon_rad * 12.0 + lat_rad * 8.0) * 0.4 + 0.6
    )
    storm_pac = np.exp(-(((lon_deg - (-160.0)) / 28.0)**2 + ((lat_deg - 45.0) / 14.0)**2)) * (
        np.sin(lon_rad * 10.0 + lat_rad * 6.0) * 0.4 + 0.6
    )

    # Southern Ocean circumpolar storm swirl
    roaring_forties = np.exp(-((lat_deg - (-52.0)) / 10.0)**2) * (
        0.50 + 0.30 * np.sin(lon_rad * 16.0 + np.sin(lat_rad * 10.0) * 2.0)
    )

    # Tropical cyclone / hurricane vortex in Caribbean and West Pacific
    hurricane_carib = np.exp(-(((lon_deg - (-72.0)) / 6.0)**2 + ((lat_deg - 22.0) / 6.0)**2)) * 1.3
    hurricane_typhoon = np.exp(-(((lon_deg - 132.0) / 8.0)**2 + ((lat_deg - 18.0) / 7.0)**2)) * 1.4

    # Planetary cloud noise
    synoptic_noise = (
        np.sin(lon_rad * 18.0 + np.sin(lat_rad * 12.0) * 2.5) * 0.25 +
        np.cos(lon_rad * 36.0 - np.sin(lat_rad * 20.0) * 2.0) * 0.18 +
        np.sin(lon_rad * 72.0 + lat_rad * 40.0) * 0.12
    )

    total_clouds = np.clip(
        itcz * 0.60 + storm_atl * 0.70 + storm_pac * 0.70 + roaring_forties * 0.65 +
        hurricane_carib + hurricane_typhoon + synoptic_noise * 0.45,
        0.0, 1.2
    )

    # Alpha mask: feathered transparency
    cloud_alpha = np.clip((total_clouds - 0.28) / 0.52, 0.0, 0.92)

    cloud_r = np.full((height, width), 255, dtype=np.uint8)
    cloud_g = np.full((height, width), 255, dtype=np.uint8)
    cloud_b = np.full((height, width), 255, dtype=np.uint8)
    cloud_a = (cloud_alpha * 255).astype(np.uint8)

    clouds_img = Image.fromarray(np.dstack([cloud_r, cloud_g, cloud_b, cloud_a]))
    clouds_path = os.path.join(OUT_DIR, "earth_clouds.png")
    clouds_img.save(clouds_path, optimize=True)
    print(f"Saved: {clouds_path} ({os.path.getsize(clouds_path) // 1024} KB)")

    # -------------------------------------------------------------
    # 4. CITY LIGHTS AT NIGHT (Human Civilization Centers)
    # -------------------------------------------------------------
    # Real population centers: (lon_deg, lat_deg, radius_deg, intensity)
    cities = [
        # North America
        (-74.0, 40.7, 4.0, 1.6),   # New York / BosWash
        (-87.6, 41.8, 3.5, 1.3),   # Chicago
        (-118.2, 34.0, 4.0, 1.4),  # Los Angeles
        (-122.4, 37.7, 3.0, 1.2),  # San Francisco Bay
        (-95.3, 29.7, 3.5, 1.2),   # Houston / Texas
        (-99.1, 19.4, 3.5, 1.3),   # Mexico City
        (-79.4, 43.6, 3.0, 1.1),   # Toronto

        # Europe
        (-0.1, 51.5, 3.5, 1.6),    # London
        (2.3, 48.8, 3.5, 1.5),     # Paris
        (6.8, 51.2, 4.0, 1.6),     # Rhine-Ruhr / Benelux
        (9.2, 45.5, 3.0, 1.3),     # Milan / Po Valley
        (-3.7, 40.4, 2.5, 1.2),    # Madrid
        (37.6, 55.7, 3.5, 1.4),    # Moscow

        # Asia
        (139.7, 35.7, 5.0, 1.8),   # Tokyo / Kanto
        (121.5, 31.2, 5.5, 1.8),   # Shanghai / Yangtze Delta
        (116.4, 39.9, 4.5, 1.7),   # Beijing
        (113.3, 23.1, 5.0, 1.8),   # Pearl River Delta / Hong Kong
        (127.0, 37.5, 3.5, 1.6),   # Seoul
        (77.2, 28.6, 4.5, 1.7),    # Delhi
        (72.8, 19.0, 4.0, 1.7),    # Mumbai
        (88.3, 22.5, 3.5, 1.4),    # Kolkata
        (77.6, 12.9, 3.0, 1.4),    # Bengaluru
        (100.5, 13.7, 3.5, 1.4),   # Bangkok
        (106.8, -6.2, 4.0, 1.5),   # Jakarta

        # Middle East & Africa
        (31.2, 30.0, 4.0, 1.7),    # Cairo / Nile Delta
        (55.3, 25.2, 3.0, 1.4),    # Dubai / UAE
        (3.4, 6.5, 3.5, 1.3),      # Lagos
        (28.0, -26.2, 3.5, 1.3),   # Johannesburg

        # South America & Oceania
        (-46.6, -23.5, 4.5, 1.6),  # São Paulo
        (-43.2, -22.9, 3.5, 1.4),  # Rio de Janeiro
        (-58.4, -34.6, 4.0, 1.4),  # Buenos Aires
        (151.2, -33.8, 3.5, 1.3),  # Sydney
        (144.9, -37.8, 3.0, 1.2),  # Melbourne
    ]

    city_grid = np.zeros((height, width), dtype=np.float32)
    for clon, clat, rad, intense in cities:
        cos_c = np.cos(np.radians(clat))
        dlon = np.minimum(np.abs(lon_deg - clon), 360.0 - np.abs(lon_deg - clon)) * cos_c
        dlat = np.abs(lat_deg - clat)
        dist = np.sqrt((dlon/rad)**2 + (dlat/rad)**2)
        city_grid += np.exp(-dist**2 * 3.0) * intense

    # Regional web networks along populated continents
    web_noise = (
        np.sin(lon_rad * 32.0) * np.cos(lat_rad * 24.0) * 0.25 +
        np.sin(lon_rad * 64.0 + 1.2) * np.sin(lat_rad * 48.0) * 0.20 +
        np.cos(lon_rad * 128.0) * np.cos(lat_rad * 96.0) * 0.15
    )
    
    # Population density envelope: only on habitable land
    habitable_land = is_land & (~is_ice) & (np.abs(lat_deg) < 62.0)
    web_light = np.clip((web_noise + 0.35) * 0.40, 0.0, 0.6)

    # Nile River ribbon
    nile_mask = (lon_deg > 30.5) & (lon_deg < 32.5) & (lat_deg > 22.0) & (lat_deg < 31.5)
    city_grid[nile_mask] += 1.2

    total_night_light = np.where(habitable_land, city_grid + web_light, 0.0)
    total_night_light = np.clip(total_night_light, 0.0, 1.0)

    # Warm golden-amber glowing light
    night_r = (total_night_light * 255.0).astype(np.uint8)
    night_g = (total_night_light * 210.0).astype(np.uint8)
    night_b = (total_night_light * 120.0).astype(np.uint8)

    night_img = Image.fromarray(np.dstack([night_r, night_g, night_b]))
    night_path = os.path.join(OUT_DIR, "earth_night.png")
    night_img.save(night_path, optimize=True)
    print(f"Saved: {night_path} ({os.path.getsize(night_path) // 1024} KB)")

if __name__ == "__main__":
    generate_earth_textures()
