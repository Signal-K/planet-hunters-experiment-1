FROM elixir:1.16-alpine AS build

WORKDIR /app
ENV MIX_ENV=prod

COPY mix.exs ./
RUN mix local.hex --force && mix local.rebar --force && mix deps.get --only prod

COPY lib lib
RUN mix compile

FROM elixir:1.16-alpine

WORKDIR /app
ENV MIX_ENV=prod PORT=4002

COPY --from=build /app /app
RUN mix local.hex --force && mix local.rebar --force

EXPOSE 4002
CMD ["mix", "run", "--no-halt"]
