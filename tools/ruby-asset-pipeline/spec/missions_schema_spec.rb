require 'yaml'

RSpec.describe 'missions-schema.yml' do
  let(:schema_path) { File.join(__dir__, '..', 'missions-schema.yml') }
  let(:data) { YAML.load_file(schema_path) }

  it 'has a top-level missions array' do
    expect(data['missions']).to be_an(Array)
    expect(data['missions']).not_to be_empty
  end

  it 'requires id, title, sequence and requires for each mission' do
    data['missions'].each do |mission|
      expect(mission['id']).to be_a(String)
      expect(mission['title']).to be_a(String)
      expect(mission['sequence']).to be_an(Integer)
      expect(mission['requires']).to be_a(Hash)
      expect(mission['reward']).to be_a(Hash)
    end
  end

  it 'references a valid prior mission for any unlock.requires_mission' do
    ids = data['missions'].map { |m| m['id'] }
    data['missions'].each do |mission|
      next unless mission['unlock']

      expect(ids).to include(mission['unlock']['requires_mission'])
    end
  end
end
