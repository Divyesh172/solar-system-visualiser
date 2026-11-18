"""
Generates a scientifically accurate, faint, delicate ring texture for Neptune.
Neptune's rings are extremely tenuous, dark, and mostly empty space (normal optical depth ~0.0001 - 0.01).
Composed of dark carbonaceous and silicate dust (albedo ~0.04).

Rings mapped from inner radius (1.55 R_N) to outer radius (2.65 R_N):
1. Galle Ring (broad, faint sheet at ~1.70 R_N, x ~ 0.14)
2. Le Verrier Ring (narrow ring at ~2.18 R_N, x ~ 0.57)
3. Lassell Ring (faint plateau sheet from 2.18 to 2.27 R_N, x ~ 0.57 - 0.65)
4. Arago Ring (narrow ring at ~2.31 R_N, x ~ 0.69)
5. Adams Ring (outer ring at ~2.57 R_N, x ~ 0.92, with subtle bright arcs)
"""

import os
import numpy as np
from PIL import Image

OUT_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures", "neptune_ring.png"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "public", "textures", "neptune_ring.png"),
]

def generate_neptune_ring(width=2048, height=64):
    print(f"Generating realistic faint Neptune Ring texture ({width}x{height})...")
    # x goes from 0.0 (inner ring edge = 1.55 R_N) to 1.0 (outer ring edge = 2.65 R_N)
    x = np.linspace(0.0, 1.0, width)
    
    alpha = np.zeros(width, dtype=np.float32)
    
    # 1. Galle Ring (faint, broad, diffuse: center x ~ 0.14, width ~ 0.06)
    # R_N: ~1.70. (1.70 - 1.55) / (2.65 - 1.55) = 0.15 / 1.10 = 0.136
    galle = np.exp(-((x - 0.136) / 0.025)**2) * 0.14
    
    # 2. Le Verrier Ring (narrow, sharp: center x ~ 0.57)
    # R_N: ~2.18. (2.18 - 1.55) / 1.10 = 0.63 / 1.10 = 0.573
    leverrier = np.exp(-((x - 0.573) / 0.006)**2) * 0.32
    
    # 3. Lassell Ring (very faint plateau sheet from Le Verrier to Arago: x ~ 0.57 to 0.68)
    lassell = np.where((x >= 0.573) & (x <= 0.685), 0.08 * (1.0 - (x - 0.573) / 0.112 * 0.4), 0.0)
    # Smooth edges of Lassell sheet
    lassell *= np.clip((x - 0.565) / 0.008, 0.0, 1.0) * np.clip((0.692 - x) / 0.008, 0.0, 1.0)
    
    # 4. Arago Ring (narrow faint thread at x ~ 0.69)
    # R_N: ~2.31. (2.31 - 1.55) / 1.10 = 0.76 / 1.10 = 0.691
    arago = np.exp(-((x - 0.691) / 0.005)**2) * 0.22
    
    # 5. Adams Ring (narrow outer ring at x ~ 0.925)
    # R_N: ~2.57. (2.57 - 1.55) / 1.10 = 1.02 / 1.10 = 0.927
    adams = np.exp(-((x - 0.927) / 0.006)**2) * 0.38
    
    # Combine rings: notice >80% of radial space is near zero (empty space)
    alpha = galle + leverrier + lassell + arago + adams
    
    # Subtle micro-dust grain noise
    dust_noise = (np.sin(x * 600.0) * 0.02 + np.cos(x * 1400.0) * 0.015) * (alpha > 0.02)
    alpha = np.clip(alpha + dust_noise, 0.0, 1.0)
    
    # Color: realistic cool neutral/silver dusty tones (dark organic tholins & silicates)
    # RGB around (160, 175, 195) - delicate silvery-slate, NOT saturated glowing electric cyan!
    r = np.full((height, width), 160, dtype=np.uint8)
    g = np.full((height, width), 175, dtype=np.uint8)
    b = np.full((height, width), 195, dtype=np.uint8)
    a = np.tile((alpha * 255.0).astype(np.uint8), (height, 1))
    
    img = Image.fromarray(np.dstack([r, g, b, a]))
    for p in OUT_PATHS:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        img.save(p, optimize=True)
        print(f"Saved: {p} ({os.path.getsize(p)} bytes)")

if __name__ == "__main__":
    generate_neptune_ring()
