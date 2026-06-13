require 'json'
require 'fileutils'

# Imports astronomy catalog data and writes PocketBase-compatible collection
# seed JSON to backend/migrations/. Run via `rake seed:import[source,collection]`.
module SeedImporter
  OUTPUT_DIR = File.join(__dir__, '..', '..', '..', 'backend', 'migrations')

  def self.import(source:, collection:)
    records = load_source(source)

    FileUtils.mkdir_p(OUTPUT_DIR)
    output_path = File.join(OUTPUT_DIR, "#{collection}.seed.json")
    File.write(output_path, JSON.pretty_generate(records))
    output_path
  end

  def self.load_source(source)
    return [] unless File.exist?(source)

    JSON.parse(File.read(source))
  end
end
