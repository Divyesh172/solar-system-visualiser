import os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

print("Starting Realistic Triton Texture Generation...")

# Load downloaded 4K seamless master map
source_path = "temp_triton.jpg"
if not os.path.exists(source_path):
    raise FileNotFoundError(f"Missing {source_path}")

base_img = Image.open(source_path).convert("RGB")
width, height = base_img.size
print(f"Loaded master texture: {width}x{height}")

# Convert to float array [0..1]
arr = np.array(base_img, dtype=np.float32) / 255.0

# 1. Scientific Color Calibration (NASA Voyager 2 Color Balance)
# Triton's latitude grid:
# y=0 is North Pole (lat = +90 deg)
# y=height is South Pole (lat = -90 deg)
y, x = np.mgrid[0:height, 0:width]
lat_norm = y / float(height) # 0 at North pole, 1 at South pole

# Regional masks based on Voyager 2 observations:
# A. South Polar Nitrogen-Methane Ice Cap (lat_norm from 0.62 to 1.0)
south_polar_weight = np.clip((lat_norm - 0.58) / 0.22, 0.0, 1.0)
# Soft tholin nitrogen-methane frost: warm peach / salmon pink tint (RGB shift: +R, subtle +G, -B)
# Reference: Voyager 2 south polar pinkish deposit
pink_r_boost = south_polar_weight * 0.09
pink_g_boost = south_polar_weight * 0.03
pink_b_reduction = south_polar_weight * 0.04

# B. Equatorial Nitrogen Frost Band (lat_norm around 0.45 to 0.58)
equator_dist = np.abs(lat_norm - 0.52)
equator_band = np.exp(-(equator_dist / 0.07)**2)
# Reference: Voyager 2 subtle pale bluish-green / cyan frost band
cyan_g_boost = equator_band * 0.04
cyan_b_boost = equator_band * 0.05

# C. Northern Cantaloupe Terrain (lat_norm from 0.15 to 0.48)
cantaloupe_weight = np.clip((0.52 - lat_norm) / 0.25, 0.0, 1.0) * np.clip((lat_norm - 0.08) / 0.15, 0.0, 1.0)
# Reference: Silvery-blue icy crust with crisp cellular contrast
ice_b_boost = cantaloupe_weight * 0.035
ice_g_boost = cantaloupe_weight * 0.02

# Apply color transformations
r = np.clip(arr[:,:,0] * 1.05 + pink_r_boost, 0.0, 1.0)
g = np.clip(arr[:,:,1] * 1.03 + pink_g_boost + cyan_g_boost + ice_g_boost, 0.0, 1.0)
b = np.clip(arr[:,:,2] * 1.01 - pink_b_reduction + cyan_b_boost + ice_b_boost, 0.0, 1.0)

# D. Cryovolcanic Geyser Plumes (Hili & Mahilani dark dust streaks)
# In South polar cap: long, narrow dark streaks blown toward northeast by nitrogen winds
np.random.seed(42)
geyser_mask = np.zeros((height, width), dtype=np.float32)

# Specific prominent Voyager 2 geysers around south pole
plume_sources = [
    (0.82, 0.22, 0.015, 0.08, -0.05),
    (0.85, 0.28, 0.012, 0.07, -0.04),
    (0.78, 0.45, 0.014, 0.09, -0.06),
    (0.88, 0.55, 0.010, 0.06, -0.04),
    (0.80, 0.72, 0.016, 0.10, -0.06),
    (0.84, 0.82, 0.013, 0.08, -0.05),
]

u = x / float(width)
v = lat_norm

for py, px, radius, plume_len_x, plume_len_y in plume_sources:
    # Plume vent
    dx = (u - px)
    dy = (v - py)
    # Distance along wind streak (tilted streak)
    along_streak = (dx * plume_len_x + dy * plume_len_y) / (plume_len_x**2 + plume_len_y**2)
    perp_streak = (-dx * plume_len_y + dy * plume_len_x) / np.sqrt(plume_len_x**2 + plume_len_y**2)
    
    in_plume = (along_streak >= 0.0) & (along_streak <= 1.0) & (np.abs(perp_streak) < radius * (1.0 + along_streak * 1.8))
    streak_intensity = np.where(in_plume, (1.0 - along_streak) * np.exp(-(perp_streak / radius)**2), 0.0)
    geyser_mask += streak_intensity * 0.42

geyser_mask = np.clip(geyser_mask, 0.0, 0.55)

# Darken surface where geyser dust fell
r = np.clip(r * (1.0 - geyser_mask * 0.65), 0.0, 1.0)
g = np.clip(g * (1.0 - geyser_mask * 0.68), 0.0, 1.0)
b = np.clip(b * (1.0 - geyser_mask * 0.65), 0.0, 1.0)

# Reassemble calibrated color image
calibrated_rgb = np.dstack([r, g, b])
color_img = Image.fromarray((calibrated_rgb * 255.0).astype(np.uint8), mode="RGB")

# Gentle micro-contrast boost for the cantaloupe melon ridges
enhancer = ImageEnhance.Contrast(color_img)
color_img = enhancer.enhance(1.12)
sharpener = ImageEnhance.Sharpness(color_img)
color_img = sharpener.enhance(1.18)

# 2. Generate High-Fidelity 3D Topographic Bump Map
# Extract luminosity channel
gray = np.array(color_img.convert("L"), dtype=np.float32) / 255.0

# Base elevation: low for cryovolcanic caldera depressions, high for ridges and caps
base_elevation = gray * 0.65 + 0.20

# High-pass filter for cantaloupe melon cell walls and ridge networks
blurred = np.array(color_img.convert("L").filter(ImageFilter.GaussianBlur(radius=4)), dtype=np.float32) / 255.0
ridge_relief = (gray - blurred) * 0.60

# Fine fracture lines (grabens and fault scarps)
fine_blurred = np.array(color_img.convert("L").filter(ImageFilter.GaussianBlur(radius=1.5)), dtype=np.float32) / 255.0
fine_scarps = (gray - fine_blurred) * 0.35

bump = np.clip(base_elevation + ridge_relief + fine_scarps, 0.0, 1.0)
bump_img = Image.fromarray((bump * 255.0).astype(np.uint8), mode="L")

# Save outputs (2048x1024 for optimal GPU memory and high resolution)
target_res = (2048, 1024)
color_resized = color_img.resize(target_res, Image.Resampling.LANCZOS)
bump_resized = bump_img.resize(target_res, Image.Resampling.LANCZOS)

web_color = "web/public/textures/moon_triton.png"
web_bump = "web/public/textures/moon_triton_bump.png"
assets_color = "assets/textures/moon_triton.png"
assets_bump = "assets/textures/moon_triton_bump.png"

os.makedirs("assets/textures", exist_ok=True)
os.makedirs("web/public/textures", exist_ok=True)

color_resized.save(web_color, format="PNG", optimize=True)
color_resized.save(assets_color, format="PNG", optimize=True)
bump_resized.save(web_bump, format="PNG", optimize=True)
bump_resized.save(assets_bump, format="PNG", optimize=True)

print(f"Successfully generated photorealistic Triton textures:")
print(f"  Color: {web_color} ({os.path.getsize(web_color)} bytes)")
print(f"  Bump:  {web_bump} ({os.path.getsize(web_bump)} bytes)")

# Clean up temp file
if os.path.exists("temp_triton.jpg"):
    os.remove("temp_triton.jpg")
print("Cleaned up temp files. Done!")
