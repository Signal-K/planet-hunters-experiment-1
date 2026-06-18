require 'chunky_png'
require 'fileutils'

# Procedural ore-node icon generator for the mining minigame.
# Each ore type gets a 64×64 transparent PNG: a mineral-coloured sphere with
# crystalline facet highlights and a shadow — consistent style, no AI needed.
module OreIcon
  SIZE = 64

  # Matches MINERAL_META in web/lib/data/minerals.ts
  MINERAL_COLORS = {
    'iron'    => [0xd9, 0x71, 0x50],  # orange-rust
    'silicon' => [0xb9, 0xd8, 0xff],  # pale blue
    'ice'     => [0x9b, 0xec, 0xff],  # cyan
    'carbon'  => [0x6a, 0x72, 0x80],  # dark grey
    'nickel'  => [0xb0, 0xb8, 0xc4],  # light steel
    'cobalt'  => [0x4f, 0x9c, 0xf7],  # blue
    'gold'    => [0xff, 0xd1, 0x66],  # gold
    'rare'    => [0xc0, 0x84, 0xff],  # purple (Xenon)
  }.freeze

  def self.generate(mineral:, output_dir:)
    base = MINERAL_COLORS[mineral] || [0xff, 0xff, 0xff]
    r, g, b = base

    png = ChunkyPNG::Image.new(SIZE, SIZE, ChunkyPNG::Color::TRANSPARENT)
    cx, cy, radius = SIZE / 2, SIZE / 2, 26

    # 1. Dark outline ring (1px wider than main body)
    outline = ChunkyPNG::Color.rgb(0x08, 0x08, 0x14)
    png.circle(cx, cy, radius + 1, outline, outline)

    # 2. Main mineral body
    png.circle(cx, cy, radius, ChunkyPNG::Color::TRANSPARENT, ChunkyPNG::Color.rgb(r, g, b))

    # 3. Bottom-right shadow — darker shade, composited as a semi-transparent blob
    paint_circle_blob(png, cx + 8, cy + 8, 18,
                      [(r * 0.45).to_i, 0].max, [(g * 0.45).to_i, 0].max, [(b * 0.45).to_i, 0].max,
                      155)

    # 4. Upper-left highlight facet — lighter shade, smaller blob
    paint_circle_blob(png, cx - 9, cy - 9, 14,
                      [(r * 1.45).to_i, 255].min, [(g * 1.45).to_i, 255].min, [(b * 1.45).to_i, 255].min,
                      170)

    # 5. Tiny specular glint — near-white dot, top-left of highlight
    glint = ChunkyPNG::Color.rgba(255, 255, 255, 200)
    paint_circle_blob(png, cx - 11, cy - 11, 5, 255, 255, 255, 200)

    FileUtils.mkdir_p(output_dir)
    path = File.join(output_dir, "ore_#{mineral}.png")
    png.save(path, interlace: false)
    path
  end

  def self.generate_all(output_dir:)
    MINERAL_COLORS.keys.map { |m| generate(mineral: m, output_dir: output_dir) }
  end

  private

  # Compose a semi-transparent filled circle onto png at (cx, cy) with given radius + alpha.
  def self.paint_circle_blob(png, cx, cy, radius, r, g, b, alpha)
    s = radius * 2 + 2
    blob = ChunkyPNG::Image.new(s, s, ChunkyPNG::Color::TRANSPARENT)
    blob.circle(radius, radius, radius, ChunkyPNG::Color::TRANSPARENT, ChunkyPNG::Color.rgba(r, g, b, alpha))
    png.compose!(blob, cx - radius, cy - radius)
  end
end
