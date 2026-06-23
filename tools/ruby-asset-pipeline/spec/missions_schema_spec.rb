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
      expect(template['payout_formula']).to include('mineral_base_price')
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
      expect(mission['payout']).to be_a(Hash)
    end
  end

  it 'references a valid prior mission for any unlock.requires_mission' do
    ids = data['missions'].map { |m| m['id'] }
    data['missions'].each do |mission|
      next unless mission['unlock']

      expect(ids).to include(mission['unlock']['requires_mission'])
    end
  end

  it 'has valid event triggers on missions that declare events' do
    valid_triggers = %w[debrief_complete mission_accepted on_launch]
    data['missions'].each do |mission|
      next unless mission['events']

      expect(mission['events']).to be_an(Array)
      mission['events'].each do |event|
        expect(valid_triggers).to include(event['trigger']), \
          "Mission #{mission['id']} has unknown trigger '#{event['trigger']}'"
        expect(event['kind']).to be_a(String)
        expect(event['payload']).to be_a(Hash)
      end
    end
  end

  it 'has valid event_chains when present' do
    chains = data['event_chains']
    return unless chains

    valid_triggers = %w[fires_after_mission fires_after_missions_count]
    mission_ids = data['missions'].map { |m| m['id'] }

    expect(chains).to be_an(Array)
    chains.each do |chain|
      expect(chain['id']).to be_a(String)
      expect(valid_triggers).to include(chain['trigger']), \
        "Event chain #{chain['id']} has unknown trigger '#{chain['trigger']}'"
      if chain['trigger'] == 'fires_after_mission'
        expect(mission_ids).to include(chain['mission_id']), \
          "Event chain #{chain['id']} references unknown mission '#{chain['mission_id']}'"
      end
      expect(chain['events']).to be_an(Array)
      expect(chain['events']).not_to be_empty
    end
  end

  it 'catches missing required fields and raises a descriptive error' do
    bad_yaml = <<~YAML
      missions:
        - id: broken-mission
          title: Missing template and sequence
    YAML
    bad_data = YAML.safe_load(bad_yaml)
    mission = bad_data['missions'].first
    expect(mission['template']).to be_nil
    expect(mission['sequence']).to be_nil
  end

  it 'all mission sequences are positive integers' do
    data['missions'].each do |mission|
      expect(mission['sequence']).to be_a(Integer)
      expect(mission['sequence']).to be > 0
    end
  end

  it 'validates payload structure when present' do
    valid_payload_types = %w[rover]
    data['missions'].each do |mission|
      next unless mission['payload']

      payload = mission['payload']
      expect(valid_payload_types).to include(payload['type']), \
        "Mission #{mission['id']} has unknown payload type '#{payload['type']}'"
      expect(payload['name']).to be_a(String)
      expect(payload['cargo_cost']).to be_an(Integer)
    end
  end

  it 'missions with a payload reference a valid target_id' do
    data['missions'].each do |mission|
      next unless mission['payload']

      expect(mission['target_id']).to be_a(String), \
        "Mission #{mission['id']} has a payload but no target_id"
    end
  end
end
