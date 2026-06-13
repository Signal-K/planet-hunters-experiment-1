require 'spec_helper'
require_relative '../lib/sprite_generator'

RSpec.describe SpriteGenerator do
  it 'generates a 512x512 PNG sprite' do
    Dir.mktmpdir do |dir|
      path = described_class.generate(part_type: 'hull', variant: 't1', output_dir: dir)
      image = ChunkyPNG::Image.from_file(path)

      expect(image.width).to eq(512)
      expect(image.height).to eq(512)
    end
  end
end
