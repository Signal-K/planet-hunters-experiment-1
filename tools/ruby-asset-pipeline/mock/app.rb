require 'sinatra/base'
require 'json'

# Lightweight stub server for prototyping new Star Sailors compute API
# endpoints before they're implemented in Go/Elixir.
class MockApi < Sinatra::Base
  set :show_exceptions, false

  post '/api/ss/compute/orbital-position' do
    content_type :json
    body = JSON.parse(request.body.read)

    {
      x: 1000.0,
      y: 0.0,
      z: 0.0,
      epoch: body['epoch'] || 0
    }.to_json
  end

  # Add new stub routes here while prototyping. Once the shape is validated
  # against the Next.js client, implement the real endpoint in Go/Elixir and
  # remove the stub.

  get '/health' do
    content_type :json
    { status: 'ok' }.to_json
  end
end
