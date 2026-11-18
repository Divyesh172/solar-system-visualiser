import urllib.request
import os
from PIL import Image

url = 'https://raw.githubusercontent.com/Shriisoot/Planets-texture/main/2k_moon.jpg'
headers = {'User-Agent': 'Mozilla/5.0'}
temp_path = 'temp_2k_moon.jpg'

try:
    print(f'Attempting download from {url}...')
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp, open(temp_path, 'wb') as f:
        f.write(resp.read())
    print('Download successful!')
    img = Image.open(temp_path)
    print(f'Downloaded: {img.size}, {img.format}, {img.mode}')
    
    if img.mode != 'RGB':
        img = img.convert('RGB')

    web_path = 'web/public/textures/moon_earth.png'
    assets_path = 'assets/textures/moon_earth.png'

    img.save(web_path, format='PNG', optimize=True)
    img.save(assets_path, format='PNG', optimize=True)

    print(f'Saved {web_path} ({os.path.getsize(web_path)} bytes)')
    print(f'Saved {assets_path} ({os.path.getsize(assets_path)} bytes)')

    if os.path.exists(temp_path):
        os.remove(temp_path)
    print('Done!')
except Exception as e:
    print(f'Error: {e}')
