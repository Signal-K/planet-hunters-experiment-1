require 'chunky_png'

# Generates 512x512 procedural rocket part sprites from spec parameters using ChunkyPNG.
# See @doc/Landnam-docs_game-art_rocket-part-sprite-generation-spec for the parameter contract.
module SpriteGenerator
  SIZE = 512

  DEFAULT_SPEC = {
    hull_color: ChunkyPNG::Color.rgb(0xc8, 0xd4, 0xe0),
    panel_color: ChunkyPNG::Color.rgb(0x8a, 0x9b, 0xad),
    window_color: ChunkyPNG::Color.rgb(0x3f, 0xa9, 0xff),
    panel_lines: [128, 256, 384],
    windows: [[160, 96, 64, 64]]
  }.freeze

  def self.generate(part_type:, variant:, spec: DEFAULT_SPEC, output_dir: File.join(__dir__, '..', 'output', 'sprites'))
    png = ChunkyPNG::Image.new(SIZE, SIZE, ChunkyPNG::Color::TRANSPARENT)

    draw_hull(png, spec[:hull_color])
    draw_panel_lines(png, spec[:panel_lines], spec[:panel_color])
    draw_windows(png, spec[:windows], spec[:window_color])

    FileUtils.mkdir_p(output_dir)
    output_path = File.join(output_dir, "#{part_type}_#{variant}.png")
    png.save(output_path, interlace: false)
    output_path
  end

  def self.draw_hull(png, color)
    png.rect(64, 0, SIZE - 64, SIZE, color, color)
  end

  def self.draw_panel_lines(png, positions, color)
    positions.each do |x|
      png.line(x, 0, x, SIZE - 1, color)
    end
  end

  def self.draw_windows(png, windows, color)
    windows.each do |(x, y, w, h)|
      png.rect(x, y, x + w, y + h, color, color)
    end
  end
end

require 'fileutils'
