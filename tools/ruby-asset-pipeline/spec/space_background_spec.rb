require 'spec_helper'
require_relative '../lib/space_background'

RSpec.describe SpaceBackground do
  around do |ex|
    Dir.mktmpdir { |dir| @dir = dir; ex.run }
  end

  it 'generates a PNG at the requested dimensions' do
    path = described_class.generate(width: 200, height: 100, seed: 1, output_path: File.join(@dir, 'bg.png'))
    img = ChunkyPNG::Image.from_file(path)
    expect(img.width).to eq(200)
    expect(img.height).to eq(100)
  end

  it 'is deterministic: same seed produces identical output' do
    path1 = described_class.generate(width: 100, height: 60, seed: 42, output_path: File.join(@dir, 'a.png'))
    path2 = described_class.generate(width: 100, height: 60, seed: 42, output_path: File.join(@dir, 'b.png'))
    expect(File.binread(path1)).to eq(File.binread(path2))
  end

  it 'produces different output for different seeds' do
    path1 = described_class.generate(width: 100, height: 60, seed: 1, output_path: File.join(@dir, 'a.png'))
    path2 = described_class.generate(width: 100, height: 60, seed: 2, output_path: File.join(@dir, 'b.png'))
    expect(File.binread(path1)).not_to eq(File.binread(path2))
  end

  it 'does not raise on edge-positioned nebula blobs (compose_clipped boundary check)' do
    # Force seed 999 which historically triggered the ChunkyPNG OutOfBounds error
    expect {
      described_class.generate(width: 100, height: 60, seed: 999, output_path: File.join(@dir, 'edge.png'))
    }.not_to raise_error
  end

  it 'uses the MoO dark base color — no fully-white pixels' do
    path = described_class.generate(width: 120, height: 80, seed: 7, output_path: File.join(@dir, 'dark.png'))
    img = ChunkyPNG::Image.from_file(path)
    white = ChunkyPNG::Color.rgb(255, 255, 255)
    white_count = (0...img.width).sum { |x| (0...img.height).count { |y| img[x, y] == white } }
    # Pure white pixels should be rare (only star cores) — less than 1% of total
    expect(white_count).to be < (img.width * img.height * 0.01)
  end
end
