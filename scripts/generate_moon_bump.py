import numpy as np
from PIL import Image, ImageFilter
import os

print("Generating 2K Moon Bump Map...")
color_img = Image.open("web/public/textures/moon_earth.png").convert("L")
arr = np.array(color_img, dtype=np.float32) / 255.0

# Base elevation: low for dark maria (0.2-0.4), high for highlands (0.6-0.8)
base_elevation = arr * 0.75 + 0.15

# Edge/Crater relief enhancement using high-pass filtering
blurred = np.array(color_img.filter(ImageFilter.GaussianBlur(radius=3)), dtype=np.float32) / 255.0
high_pass = arr - blurred

# Micro-texture relief
fine_blurred = np.array(color_img.filter(ImageFilter.GaussianBlur(radius=1)), dtype=np.float32) / 255.0
fine_relief = (arr - fine_blurred) * 0.8

# Combine base topography with sharp crater rim relief
bump = base_elevation + high_pass * 0.45 + fine_relief * 0.25
bump = np.clip(bump, 0.0, 1.0)

# Convert to 8-bit grayscale
bump_img = Image.fromarray((bump * 255.0).astype(np.uint8), mode="L")

web_bump = "web/public/textures/moon_bump.png"
assets_bump = "assets/textures/moon_bump.png"

bump_img.save(web_bump, optimize=True)
bump_img.save(assets_bump, optimize=True)

print(f"Generated {web_bump} ({os.path.getsize(web_bump)} bytes)")
print(f"Generated {assets_bump} ({os.path.getsize(assets_bump)} bytes)")
print("Done!")
