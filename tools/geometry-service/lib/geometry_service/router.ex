defmodule GeometryService.Router do
  @moduledoc """
  Tier 1 geometry "math co-processor" endpoints, spike implementation.
  See @task-b7c8d3 for the formal API spec covering Tier 1-3 operations.
  """
  use Plug.Router

  plug(Plug.Logger)
  plug(:match)
  plug(Plug.Parsers, parsers: [:json], json_decoder: Jason)
  plug(:dispatch)

  get "/health" do
    send_json(conn, 200, %{status: "ok"})
  end

  post "/coordinate-conversion" do
    %{"ra_deg" => ra, "dec_deg" => dec} = conn.body_params
    {x, y, z} = GeometryService.Geometry.equatorial_to_cartesian(ra, dec)
    send_json(conn, 200, %{x: x, y: y, z: z})
  end

  post "/angular-distance" do
    %{"a" => [ra1, dec1], "b" => [ra2, dec2]} = conn.body_params
    distance = GeometryService.Geometry.angular_distance(ra1, dec1, ra2, dec2)
    send_json(conn, 200, %{distance_deg: distance})
  end

  post "/sector-lookup" do
    %{"ra_deg" => ra, "dec_deg" => dec} = conn.body_params
    sector = GeometryService.Geometry.sector_for(ra, dec)
    send_json(conn, 200, %{sector: sector})
  end

  match _ do
    send_json(conn, 404, %{error: "not_found"})
  end

  defp send_json(conn, status, body) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(body))
  end
end
