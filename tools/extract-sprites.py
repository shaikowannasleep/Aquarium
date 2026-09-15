# Script to extract sprite sheets into individual PNGs and generate sprites.json atlas
import os, json
from PIL import Image

SHEET1_NAMES = [
    ['blue_shark', 'spotted_shark', 'orca', 'blue_dolphin', 'pink_dolphin', 'blue_whale', 'beluga', 'stingray', 'spotted_ray', 'swordfish'],
    ['clownfish', 'blue_tang', 'yellow_tang', 'purple_fish', 'flame_angelfish', 'moorish_idol', 'damselfish', 'butterflyfish', 'striped_angelfish', 'lionfish'],
    ['green_turtle', 'brown_turtle', 'green_pufferfish', 'orange_pufferfish', 'blue_porcupinefish', 'orange_seahorse', 'pink_seahorse', 'red_octopus', 'pink_squid', 'moray_eel'],
    ['red_lobster', 'red_crab', 'mantis_shrimp', 'blue_jellyfish', 'pink_jellyfish', 'sea_anemone', 'sea_urchin', 'orange_starfish', 'blue_starfish', 'sea_cucumber'],
    ['pink_clam', 'brown_clam', 'banded_shrimp', 'orange_shrimp', 'yellow_striped_fish', 'parrotfish', 'cyan_fish', 'pink_fish', 'multicolor_fish', 'violet_fish']
]

SHEET2_NAMES = [
    ['grey_shark', 'hammerhead_shark', 'whale_shark', 'killer_whale', 'dolphin', 'beluga_whale', 'blue_whale_v2', 'humpback_whale', 'narwhal', 'manta_ray'],
    ['electric_ray', 'spotted_eagle_ray', 'sawfish', 'spotted_moray', 'electric_eel', 'octopus_v2', 'blue_ringed_octopus', 'squid_v2', 'cuttlefish', 'nautilus'],
    ['yellow_pufferfish', 'spiny_pufferfish', 'clownfish_v2', 'blue_tang_v2', 'yellow_tang_v2', 'angelfish_v2', 'butterflyfish_v2', 'lionfish_v2', 'rainbow_fish', 'black_triggerfish'],
    ['seahorse_v2', 'green_turtle_v2', 'leatherback_turtle', 'spiny_lobster', 'king_prawn', 'hermit_crab', 'shore_crab', 'blue_crab', 'mantis_shrimp_v2', 'horseshoe_crab'],
    ['pink_jellyfish_v2', 'blue_jellyfish_v2', 'moon_jellyfish', 'red_anemone', 'starfish_v2', 'purple_urchin', 'sea_cucumber_v2', 'giant_clam', 'cleaner_shrimp', 'peppermint_shrimp']
]

def process(img_path, sheet_key, names_grid, target_dirs):
    im = Image.open(img_path).convert('RGBA')
    w, h = im.size
    alpha = list(im.split()[-1].getdata())
    visited = [False] * (w * h)
    boxes = []
    
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if not visited[idx] and alpha[idx] > 15:
                queue = [idx]
                visited[idx] = True
                min_x, max_x = x, x
                min_y, max_y = y, y
                pixels = 0
                while queue:
                    curr = queue.pop()
                    cx = curr % w
                    cy = curr // w
                    pixels += 1
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            nidx = ny * w + nx
                            if not visited[nidx] and alpha[nidx] > 15:
                                visited[nidx] = True
                                queue.append(nidx)
                if pixels > 150:
                    boxes.append({'bbox': (min_x, min_y, max_x + 1, max_y + 1), 'center': ((min_x+max_x)/2, (min_y+max_y)/2)})
    
    boxes.sort(key=lambda b: b['center'][1])
    sheet_sprites = []
    
    for r in range(5):
        row_items = boxes[r*10:(r+1)*10]
        row_items.sort(key=lambda b: b['center'][0])
        for c, item in enumerate(row_items):
            bx0, by0, bx1, by1 = item['bbox']
            px0 = max(0, bx0 - 1)
            py0 = max(0, by0 - 1)
            px1 = min(w, bx1 + 1)
            py1 = min(h, by1 + 1)
            
            crop = im.crop((px0, py0, px1, py1))
            name = names_grid[r][c]
            sprite_id = f'{sheet_key}_{r}_{c}'
            fname = f'{name}.png'
            
            for tdir in target_dirs:
                crop.save(os.path.join(tdir, fname), optimize=True)
                crop.save(os.path.join(tdir, f'{sprite_id}.png'), optimize=True)
            
            sheet_sprites.append({
                'id': sprite_id,
                'name': name,
                'sheet': sheet_key,
                'file': fname,
                'x': px0,
                'y': py0,
                'w': px1 - px0,
                'h': py1 - py0
            })
            
    for tdir in target_dirs:
        im.save(os.path.join(tdir, f'{sheet_key}.png'), optimize=True)
        
    return sheet_sprites

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    user_up = 'C:/Users/namvh/.gemini/antigravity-ide/brain/816f97ab-d32f-44a6-a0a3-8716a3b42e45/.user_uploaded'
    img1 = os.path.join(user_up, 'media_1789444356620.png')
    img2 = os.path.join(user_up, 'media_1789444356669.png')
    
    dirs = [
        os.path.join(base_dir, 'docs/assets/sprites'),
        os.path.join(base_dir, 'docs/apps/aquarium/assets/sprites'),
        os.path.join(base_dir, 'apps/aquarium/docs/assets/sprites')
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        
    s1 = process(img1, 'sheet1', SHEET1_NAMES, dirs)
    s2 = process(img2, 'sheet2', SHEET2_NAMES, dirs)
    
    atlas = {
        'sheet1': {'width': 1024, 'height': 512, 'file': 'sheet1.png', 'sprites': s1},
        'sheet2': {'width': 1024, 'height': 512, 'file': 'sheet2.png', 'sprites': s2}
    }
    
    for d in dirs:
        with open(os.path.join(d, 'sprites.json'), 'w') as f:
            json.dump(atlas, f, indent=2)
            
    print(f'Successfully extracted {len(s1) + len(s2)} sprites into asset directories.')

if __name__ == '__main__':
    main()
