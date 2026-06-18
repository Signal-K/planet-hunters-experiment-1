require 'chunky_png'
require 'fileutils'

# Procedural space background generator — Master of Orion colour palette.
# Produces dark navy base + greeblie speckle texture + soft nebula blobs + glowing stars.
# All output is deterministic given the same seed, so assets can be regenerated identically.
module SpaceBackground
  # Palette anchors (Master of Orion / Stellaris reference)
  BASE_R, BASE_G, BASE_B = 0x0a, 0x0f, 0x1e

  NEBULA_DEFS = [
    # [r, g, b, max_alpha, size_factor]
    [0x0d, 0x1a, 0x5c, 55, 1.0],   # deep cobalt blue
    [0x2d, 0x0a, 0x5c, 40, 0.8],   # deep purple
    [0x1a, 0x2a, 0x6b, 50, 1.2],   # medium blue
    [0x4a, 0x10, 0x0a, 35, 0.7],   # dark red-orange (warm accent)
    [0x0a, 0x3a, 0x5c, 45, 0.9],   # teal blue
    [0x3b, 0x1f, 0x7a, 30, 0.6],   # violet
    [0x0a, 0x2a, 0x3e, 60, 1.4],   # very dark blue (large, dense)
  ].freeze

  STAR_COLORS = [
    [0xff, 0xff, 0xff],  # white (most common)
    [0xff, 0xff, 0xff],  # white (double weight)
    [0x87, 0xce, 0xeb],  # blue-white
    [0xff, 0xf0, 0x80],  # yellow dwarf
    [0xff, 0xa5, 0x00],  # orange giant
  ].freeze

  # Generate a seamlessly-tileable space background PNG.
  # width and height should be multiples of 8.
  def self.generate(width: 1024, height: 512, seed: 42, output_path:)
    rng = Random.new(seed)
    png = ChunkyPNG::Image.new(width, height, ChunkyPNG::Color.rgb(BASE_R, BASE_G, BASE_B))

    paint_greeblies(png, rng, width, height)
    paint_nebulae(png, rng, width, height)
    paint_stars(png, rng, width, height)

    FileUtils.mkdir_p(File.dirname(output_path))
    png.save(output_path, interlace: false)
    output_path
  end

  # Scatter fine speckle pixels — slight navy-blue variants slightly lighter than the base.
  # This is the "greeblie" micro-texture that reads as cosmic depth at a glance.
  def self.paint_greeblies(png, rng, w, h)
    count = (w * h * 0.022).to_i  # ~2.2% of pixels
    count.times do
      x = rng.rand(w)
      y = rng.rand(h)
      # Speckle is slightly lighter and bluer than the base
      v = 0x10 + rng.rand(0x1e)
      r2 = v
      g2 = [(v * 1.07).to_i, 255].min
      b2 = [(v * 1.22).to_i, 255].min
      color = ChunkyPNG::Color.rgb(r2, g2, b2)
      png[x, y] = color
      # ~20% are 2×2 micro-clusters
      if rng.rand(5) == 0
        png[x + 1, y]     = color if x + 1 < w
        png[x,     y + 1] = color if     y + 1 < h
        png[x + 1, y + 1] = color if x + 1 < w && y + 1 < h
      end
    end
  end

  # Place soft nebula blobs: layered concentric semi-transparent circles that ChunkyPNG
  # alpha-composes over the background, building up cloud density.
  def self.paint_nebulae(png, rng, w, h)
    count = 10 + rng.rand(6)  # 10-15 blobs
    count.times do
      cx = rng.rand(w)
      cy = rng.rand(h)
      base_r = 80 + rng.rand(130)
      defn   = NEBULA_DEFS[rng.rand(NEBULA_DEFS.size)]
      nr, ng, nb, alpha, sf = defn
      radius = (base_r * sf).to_i

      paint_soft_blob(png, cx, cy, radius, nr, ng, nb, alpha)

      # Secondary smaller sub-cloud nearby (more often than not)
      next if rng.rand(3) == 0
      ox = cx + rng.rand(radius) - radius / 2
      oy = cy + rng.rand(radius / 2) - radius / 4
      paint_soft_blob(png, ox, oy, (radius * 0.5).to_i, nr, ng, nb, (alpha * 0.6).to_i)
    end
  end

  # Soft blob: four concentric passes from outer haze → bright core.
  def self.paint_soft_blob(png, cx, cy, radius, r, g, b, max_alpha)
    [[1.00, (max_alpha * 0.25).to_i],
     [0.62, (max_alpha * 0.52).to_i],
     [0.35, (max_alpha * 0.78).to_i],
     [0.16, max_alpha]].each do |scale, alpha|
      rr = (radius * scale).to_i
      next if rr < 3
      s = rr * 2 + 2
      blob = ChunkyPNG::Image.new(s, s, ChunkyPNG::Color::TRANSPARENT)
      blob.circle(rr, rr, rr, ChunkyPNG::Color::TRANSPARENT, ChunkyPNG::Color.rgba(r, g, b, alpha))
      compose_clipped(png, blob, cx - rr, cy - rr)
    end
  end

  # Draw a glowing star: outer glow → inner glow → bright core.
  def self.paint_star_glow(png, x, y, r, g, b)
    [[14, 6], [8, 18], [4, 50], [2, 130]].each do |radius, alpha|
      s = radius * 2 + 2
      blob = ChunkyPNG::Image.new(s, s, ChunkyPNG::Color::TRANSPARENT)
      blob.circle(radius, radius, radius, ChunkyPNG::Color::TRANSPARENT, ChunkyPNG::Color.rgba(r, g, b, alpha))
      compose_clipped(png, blob, x - radius, y - radius)
    end
    png[x, y] = ChunkyPNG::Color.rgb(255, 255, 255) if x >= 0 && y >= 0 && x < png.width && y < png.height
  end

  # ChunkyPNG::Canvas#compose! requires offset >= 0 and blob fully within canvas.
  # This method clips the blob to the visible region before composing.
  def self.compose_clipped(canvas, blob, ox, oy)
    src_x = [0, -ox].max
    src_y = [0, -oy].max
    dst_x = [ox, 0].max
    dst_y = [oy, 0].max
    src_w = [blob.width  - src_x, canvas.width  - dst_x].min
    src_h = [blob.height - src_y, canvas.height - dst_y].min
    return if src_w <= 0 || src_h <= 0

    if src_x == 0 && src_y == 0 && src_w == blob.width && src_h == blob.height
      canvas.compose!(blob, dst_x, dst_y)
    else
      canvas.compose!(blob.crop(src_x, src_y, src_w, src_h), dst_x, dst_y)
    end
  end

  # Scatter stars: small bright dots, with ~5% getting a multi-ring glow.
  def self.paint_stars(png, rng, w, h)
    count = 350 + rng.rand(200)
    count.times do
      x = rng.rand(w)
      y = rng.rand(h)
      sc = STAR_COLORS[rng.rand(STAR_COLORS.size)]
      sr, sg, sb = sc

      if rng.rand(20) == 0
        # Bright star with glow halo
        paint_star_glow(png, x, y, sr, sg, sb)
      else
        bri = 150 + rng.rand(105)
        cr = [(sr * bri / 255).to_i, 255].min
        cg = [(sg * bri / 255).to_i, 255].min
        cb = [(sb * bri / 255).to_i, 255].min
        png[x, y] = ChunkyPNG::Color.rgb(cr, cg, cb) if x < w && y < h
        # ~30% are 2-pixel stars
        png[x + 1, y] = ChunkyPNG::Color.rgb(cr, cg, cb) if rng.rand(3) == 0 && x + 1 < w
      end
    end
  end


end
