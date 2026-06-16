defmodule GeometryService.Metrics do
  @moduledoc """
  Minimal in-process request counter used by GET /metrics.
  Exports Prometheus text exposition format with request_total and
  error_total counters. Suitable for scraping by Prometheus or a
  prometheus_ex sidecar; does not require the full telemetry stack in
  the spike.
  """

  use Agent

  def start_link(_opts) do
    Agent.start_link(fn -> %{requests: 0, errors: 0} end, name: __MODULE__)
  end

  def increment_requests, do: Agent.update(__MODULE__, &Map.update!(&1, :requests, fn n -> n + 1 end))
  def increment_errors, do: Agent.update(__MODULE__, &Map.update!(&1, :errors, fn n -> n + 1 end))

  def prometheus_text do
    %{requests: req, errors: err} = Agent.get(__MODULE__, & &1)

    """
    # HELP geometry_requests_total Total HTTP requests handled by the geometry service.
    # TYPE geometry_requests_total counter
    geometry_requests_total #{req}
    # HELP geometry_errors_total Total failed requests (non-2xx responses).
    # TYPE geometry_errors_total counter
    geometry_errors_total #{err}
    """
  end
end
