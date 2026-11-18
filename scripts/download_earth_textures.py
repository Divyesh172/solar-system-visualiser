import urllib.request
import os
import numpy as np
from PIL import Image

headers = {'User-Agent': 'Mozilla/5.0'}

base_url = 'https://raw.githubusercontent.com/Shriisoot/Planets-texture/main/'

files = [
    ('8k_earth_daymap.jpg', 'earth.png', (2048, 1024)),
    ('8k_earth_nightmap.jpg', 'earth_night.png', (2048, 1024)),
    ('2k_earth_clouds.jpg', 'earth_clouds.png', (2048, 1024)),
]

os.makedirs('web/public/textures', exist_ok=True)
os.makedirs('assets/textures', exist_ok=True)

for remote_name, local_name, target_size in files:
    url = base_url + remote_name
    temp_path = f'temp_{remote_name}'
    print(f'Downloading {remote_name} from {url}...')
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp, open(temp_path, 'wb') as f:
        f.write(resp.read())
    
    img = Image.open(temp_path)
    print(f'  Downloaded {remote_name}: {img.size}, {img.mode}')
    
    if local_name == 'earth_clouds.png':
        # Clouds texture: convert grayscale map to RGBA
        # Pure white RGB with alpha proportional to cloud density
        img_gray = img.convert('L')
        if img_gray.size != target_size:
            img_gray = img_gray.resize(target_size, Image.Resampling.LANCZOS)
        
        arr = np.array(img_gray, dtype=np.float32) / 255.0
        # Contrast curve: transparent over clear oceans, vivid over dense clouds
        # Smooth floor so clear skies are truly transparent
        alpha = np.clip((arr - 0.08) / 0.85, 0.0, 1.0)
        alpha = np.power(alpha, 1.2) * 0.92
        
        h, w = arr.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, 0] = 255
        rgba[:, :, 1] = 255
        rgba[:, :, 2] = 255
        rgba[:, :, 3] = (alpha * 255.0).astype(np.uint8)
        
        processed_img = Image.fromarray(rgba, mode='RGBA')
    else:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        if img.size != target_size:
            processed_img = img.resize(target_size, Image.Resampling.LANCZOS)
        else:
            processed_img = img

    web_path = os.path.join('web/public/textures', local_name)
    assets_path = os.path.join('assets/textures', local_name)
    
    processed_img.save(web_path, format='PNG', optimize=True)
    processed_img.save(assets_path, format='PNG', optimize=True)
    
    print(f'  Saved {web_path} ({os.path.getsize(web_path)} bytes)')
    
    if os.path.exists(temp_path):
        os.remove(temp_path)

print('All Earth textures downloaded and processed successfully!')
