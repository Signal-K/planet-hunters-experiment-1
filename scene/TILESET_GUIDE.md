# Tileset Replacement & Customization Guide

## Current Setup

Your game currently uses `tileset.png` (UID: `uid://cr3xo3yott6bg`) as the main tileset texture in `main.tscn`.

## Method 1: Quick Swap - Replace with Pixil Frame 0

### Option A: Replace the File Directly (Easiest)
1. **Backup your original:**
   - Rename `tileset.png` to `tileset_backup.png`
   
2. **Swap the file:**
   - Rename `Pixil Frame 0.png` to `tileset.png`
   - Godot will automatically detect the change and reimport
   
3. **Verify in Godot:**
   - Open the project
   - The tileset should now use your new texture
   - All existing tile configurations are preserved

**Pros:** Instant, no scene editing needed  
**Cons:** Overwrites original file

### Option B: Update the Scene Reference
1. **Open `main.tscn` in a text editor**
2. **Find line 3:**
   ```gdscript
   [ext_resource type="Texture2D" uid="uid://cr3xo3yott6bg" path="res://assets/TileSheet/tileset.png" id="1_h40pt"]
   ```

3. **Replace with:**
   ```gdscript
   [ext_resource type="Texture2D" uid="uid://dyoktg8ogm7r6" path="res://assets/TileSheet/Pixil Frame 0.png" id="1_h40pt"]
   ```

4. **Save and reload in Godot**

**Pros:** Keeps both files  
**Cons:** Manual file editing required

## Method 2: Create New Tileset from Scratch (Learning Method)

### Understanding Tile Dimensions
Your current tileset uses **16x16 pixel tiles**.

```
Current Tileset Grid:
- Tile Size: 16x16 pixels
- Atlas Columns: ~23 tiles wide
- Atlas Rows: ~6 tiles tall
- Total Image: ~368x96 pixels
```

### Step 1: Prepare Your Image

**Requirements:**
- Image dimensions should be multiples of tile size (16x16)
- Example: 320x160 (20x10 tiles), 368x96 (23x6 tiles)
- PNG format recommended
- Transparent background for non-solid tiles

**Layout Example:**
```
Row 0: Ground tiles (grass, dirt variations)
Row 1: Ground transitions/borders
Row 2: More ground variations
Row 3: Water tiles
Row 4: Water transitions/borders
Row 5: Objects/decorations
```

### Step 2: Import Your Tileset Image

1. **Place your image in:**
   ```
   assets/TileSheet/your_new_tileset.png
   ```

2. **Godot will auto-generate an import file**
3. **Set import settings:**
   - Filter: Off (for pixel art)
   - Mipmaps: Off
   - Compression: Lossless or Off

### Step 3: Create TileSet in Godot Editor

#### Using the TileSet Editor (Recommended for Beginners)

1. **Open your Main scene** (`main.tscn`)
2. **Select the TileMap node**
3. **In the TileSet property panel:**
   - Click the TileSet dropdown
   - Select "New TileSet"
   
4. **Open TileSet Editor** (bottom panel)
5. **Add Atlas Source:**
   - Click "+" button
   - Choose "Atlas"
   - Select your tileset image
   
6. **Configure Atlas:**
   - **Texture Region Size:** 16x16 (your tile size)
   - **Separation:** 0 (pixels between tiles)
   - **Texture Region Offset:** 0, 0
   
7. **Select Tiles:**
   - Click and drag to select all tiles you want to use
   - Selected tiles will be available for painting

### Step 4: Configure Tile Properties

#### Basic Tile Setup
```
For each tile coordinate (e.g., 0:0, 1:0, 2:0):
├── Enable/Disable tile
├── Set collision shapes (optional)
├── Add to terrain sets
└── Set custom data
```

#### Current Project Uses:
- **Terrain Set 0** with 2 terrains:
  - Terrain 0: "Dirt" (grass/ground)
  - Terrain 1: "River" (water)
  
- **Custom Data Layer:**
  - `garden` (bool) - marks plantable tiles

#### Adding Terrains (For Auto-tiling)

1. **In TileSet Editor, select "TileSet" tab**
2. **Add Terrain Set:**
   - Name: "Ground"
   - Mode: "Match Corners and Sides"
   
3. **Add Terrains to Set:**
   - Terrain 0: "Grass" (color: green)
   - Terrain 1: "Water" (color: blue)
   
4. **Configure Tiles:**
   - Select tile in atlas
   - Set "Terrain Set" dropdown
   - Set "Terrain" type
   - Paint peering bits (edges/corners)

#### Adding Custom Data

1. **In TileSet tab, find "Custom Data Layers"**
2. **Click "+" to add layer:**
   - Name: "garden" (or "walkable", "buildable", etc.)
   - Type: Boolean
   
3. **For each tile:**
   - Select tile in atlas
   - Check/uncheck custom data properties

### Step 5: Paint Your Tilemap

1. **Select TileMap node**
2. **Bottom panel → TileMap tab**
3. **Choose layer** (layer 0 = base, layer 1 = objects)
4. **Select tile from atlas**
5. **Click to paint tiles**

### Step 6: Test Terrain Auto-tiling

1. **In TileMap editor, select "Terrains" tab**
2. **Choose terrain type** (e.g., "Grass")
3. **Paint with terrain mode**
   - Godot automatically picks correct transition tiles
   - Creates smooth borders between terrain types

## Understanding Your Current TileSet Structure

### Tile Coordinates Explained
```
Format: column:row/variant
Example: 2:0/0 = column 2, row 0, variant 0

Your layout:
0:0 = Top-left tile (grass)
2:0 = Ground transition (right edge)
3:0 = Ground middle
7:0 = Water corner
9:0 = Water transition
```

### Current Terrain Configuration
```
Terrain 0 (Dirt/Grass):
- Used for: Ground, grass, paths
- Custom data: garden = true (plantable)

Terrain 1 (River/Water):
- Used for: Water, rivers
- Custom data: garden = false (not plantable)
```

### Peering Bits Explanation
```
Peering bits define how tiles connect:

     top_side
        ↓
left ← TILE → right
        ↑
   bottom_side

Corners:
- top_left_corner
- top_right_corner
- bottom_left_corner
- bottom_right_corner
```

## Experiment: Creating Your First Custom Tileset

### Exercise 1: Simple 2-Color Tileset

**Create a test image (64x64 pixels = 4x4 tiles):**

```
Pixel art layout (16x16 per tile):
[Grass1][Grass2][Water1][Water2]
[Grass3][Grass4][Water3][Water4]
[Trans1][Trans2][Trans3][Trans4]
[Obj1  ][Obj2  ][Obj3  ][Obj4  ]
```

**Steps:**
1. Draw in your favorite pixel editor (Aseprite, Pixilart, etc.)
2. Save as PNG
3. Import to Godot
4. Create new TileSet as described above
5. Set 16x16 tile size
6. Select all 16 tiles
7. Test painting in your scene

### Exercise 2: Add Simple Collision

1. Select a tile in TileSet editor
2. Go to "Physics" section
3. Click "+" to add physics layer
4. Draw collision shape:
   - Click "Create" → "New Rectangle"
   - Adjust size to tile edges
5. Test: Your player should collide with these tiles

### Exercise 3: Create Auto-tiling Grass/Water

**You need at minimum:**
- 1 full grass tile
- 4 edge tiles (top, right, bottom, left)
- 4 corner tiles
- 1 full water tile
- 4 water edge tiles
- 4 water corner tiles

**Total: 18 tiles minimum for basic auto-tiling**

## Advanced: Multi-layer Tilemaps

Your current scene uses layers:
```
Layer 0 (green_grass): Base ground layer
Layer 1: Garden/decoration layer
```

**To add more layers:**
1. Select TileMap node
2. Inspector → Layers
3. Add layer
4. Name it (e.g., "Decorations", "Collisions")
5. Set Z-index for draw order

## Troubleshooting

### Tiles appear blurry
- Import Settings → Filter: Off
- TileSet → Rendering → Texture Filter: Nearest

### Tiles have white lines between them
- Import Settings → Fix Alpha Border: On
- Use even tile dimensions
- Avoid scaling the tilemap node

### Terrains not connecting properly
- Check peering bits are set correctly
- Ensure terrain set/type matches
- Verify tile coordinates are correct

### Custom data not working
- Verify custom data layer exists
- Check data type matches script (bool, int, string)
- Ensure tiles have data set in TileSet editor

## Quick Reference: Common Tile Sizes

```
8x8   = Retro games, Game Boy style
16x16 = Your current size, NES/SNES style
32x32 = Modern pixel art, more detail
48x48 = High detail pixel art
```

## Files You'll Work With

```
Project Structure:
assets/TileSheet/
├── tileset.png           (current texture)
├── Pixil Frame 0.png     (your new texture)
└── your_tileset.png      (future custom)

main.tscn                 (contains TileMap with TileSet)
```

## Next Steps

1. **Start Simple:** Swap `Pixil Frame 0.png` using Method 1A
2. **Experiment:** Create a small 64x64 test tileset
3. **Learn Terrains:** Set up basic grass/water auto-tiling
4. **Add Data:** Use custom data for game logic
5. **Go Big:** Create your full custom tileset

## Resources for Learning

- **Godot Docs:** TileMap and TileSet documentation
- **Pixel Art Tools:**
  - Aseprite (paid, best for animation)
  - Pixilart (free, web-based) - what you're using
  - GIMP/Krita (free, full-featured)
  
- **Tileset References:**
  - OpenGameArt.org
  - itch.io (search "tileset")
  - Kenney.nl (free game assets)
