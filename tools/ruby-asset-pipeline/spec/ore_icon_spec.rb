require 'spec_helper'
require_relative '../lib/ore_icon'

RSpec.describe OreIcon do
  around do |ex|
    Dir.mktmpdir { |dir| @dir = dir; ex.run }
  end

  it 'generates a 64x64 transparent-background PNG' do
    path = described_class.generate(mineral: 'iron', output_dir: @dir)
    img = ChunkyPNG::Image.from_file(path)
    expect(img.width).to eq(64)
    expect(img.height).to eq(64)
    # Corner pixels should be fully transparent (no background fill)
    expect(ChunkyPNG::Color.a(img[0, 0])).to eq(0)
    expect(ChunkyPNG::Color.a(img[63, 63])).to eq(0)
  end

  it 'generates all 8 minerals without raising' do
    paths = described_class.generate_all(output_dir: @dir)
    expect(paths.length).to eq(8)
    paths.each { |p| expect(File.exist?(p)).to be true }
  end

  it 'names the file ore_<mineral>.png' do
    path = described_class.generate(mineral: 'gold', output_dir: @dir)
    expect(File.basename(path)).to eq('ore_gold.png')
  end

  it 'uses the correct dominant hue for each mineral' do
    # Iron is orange-rust — the body center pixel should have red > blue
    described_class.generate(mineral: 'iron', output_dir: @dir)
    img = ChunkyPNG::Image.from_file(File.join(@dir, 'ore_iron.png'))
    center = img[32, 32]
    expect(ChunkyPNG::Color.r(center)).to be > ChunkyPNG::Color.b(center)

    # Cobalt is blue — center pixel should have blue > red
    described_class.generate(mineral: 'cobalt', output_dir: @dir)
    img2 = ChunkyPNG::Image.from_file(File.join(@dir, 'ore_cobalt.png'))
    center2 = img2[32, 32]
    expect(ChunkyPNG::Color.b(center2)).to be > ChunkyPNG::Color.r(center2)
  end
end
