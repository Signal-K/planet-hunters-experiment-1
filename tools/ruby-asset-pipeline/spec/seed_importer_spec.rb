require 'spec_helper'
require 'json'
require 'tmpdir'
require_relative '../lib/seed_importer'

RSpec.describe SeedImporter do
  describe '.load_source' do
    it 'returns an empty array when the source file does not exist' do
      expect(described_class.load_source('/nonexistent/path.json')).to eq([])
    end

    it 'parses a JSON array from the source file' do
      Dir.mktmpdir do |dir|
        source = File.join(dir, 'catalog.json')
        records = [{ 'id' => '1', 'name' => 'Alpha Centauri' }]
        File.write(source, JSON.generate(records))

        expect(described_class.load_source(source)).to eq(records)
      end
    end
  end

  describe '.import' do
    it 'writes PocketBase-compatible seed JSON to the output directory' do
      Dir.mktmpdir do |dir|
        source = File.join(dir, 'astronomy.json')
        records = [
          { 'id' => 'abc1', 'name' => 'Proxima Centauri', 'type' => 'star' },
          { 'id' => 'abc2', 'name' => 'Kepler-452b',      'type' => 'planet' }
        ]
        File.write(source, JSON.generate(records))

        stub_const('SeedImporter::OUTPUT_DIR', dir)

        output_path = described_class.import(source: source, collection: 'celestial_bodies')

        expect(File.exist?(output_path)).to be true
        expect(output_path).to end_with('celestial_bodies.seed.json')

        written = JSON.parse(File.read(output_path))
        expect(written).to eq(records)
      end
    end

    it 'creates the output directory if it does not exist' do
      Dir.mktmpdir do |dir|
        nested_output = File.join(dir, 'nested', 'migrations')
        source = File.join(dir, 'data.json')
        File.write(source, '[]')

        stub_const('SeedImporter::OUTPUT_DIR', nested_output)

        described_class.import(source: source, collection: 'test_collection')

        expect(Dir.exist?(nested_output)).to be true
      end
    end
  end
end
