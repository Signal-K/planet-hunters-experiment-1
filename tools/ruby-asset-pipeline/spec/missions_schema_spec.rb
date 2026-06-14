require 'yaml'

RSpec.describe 'missions-schema.yml' do
  let(:schema_path) { File.join(__dir__, '..', 'missions-schema.yml') }
  let(:data) { YAML.load_file(schema_path) }

  it 'has a top-level missions array' do
    expect(data['missions']).to be_an(Array)
    expect(data['missions']).not_to be_empty
  end

  it 'has resource collection mission templates' do
    expect(data['mission_templates']).to be_an(Array)
    expect(data['mission_templates']).not_to be_empty
    data['mission_templates'].each do |template|
      expect(template['id']).to be_a(String)
      expect(template['mineral_keys']).to be_an(Array)
      expect(template['payout_formula']).to include('mineral price')
    end
  end

  it 'requires id, template, title, sequence and requires for each mission' do
    template_ids = data['mission_templates'].map { |t| t['id'] }
    data['missions'].each do |mission|
      expect(mission['id']).to be_a(String)
      expect(template_ids).to include(mission['template'])
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
