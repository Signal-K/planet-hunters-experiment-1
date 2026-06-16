defmodule GeometryService.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    port = String.to_integer(System.get_env("PORT", "4002"))

    children = [
      GeometryService.Metrics,
      {Plug.Cowboy, scheme: :http, plug: GeometryService.Router, options: [port: port]}
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: GeometryService.Supervisor)
  end
end
