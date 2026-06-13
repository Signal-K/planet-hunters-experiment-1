# Mock API prototyping stubs

Sinatra-based mock server for rapid endpoint prototyping.

## Workflow

1. Add a stub route to `app.rb` returning a representative mock JSON response.
2. Boot the server (`rake mock:start` or `rackup`) and point the Next.js
   client at it to validate the request/response shape.
3. Once the shape is validated, implement the real endpoint in Go
   (PocketBase hook) or Elixir (geometry service) and remove the stub.

## Quick start

```bash
cd tools/ruby-asset-pipeline/mock
bundle install
rackup -p 4500
```

Or via Rake from `tools/ruby-asset-pipeline/`:

```bash
rake mock:start
```
