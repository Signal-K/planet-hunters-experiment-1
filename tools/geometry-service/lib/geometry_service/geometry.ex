defmodule GeometryService.Geometry do
  @moduledoc """
  Tier 1 geometry operations: coordinate conversion, angular distance, and
  sector lookup. Spike implementation for @task-e2f4a1; pure functions so
  they can be unit tested and benchmarked independently of the HTTP layer.
  """

  @doc "Converts equatorial (RA/Dec, degrees) to unit Cartesian coordinates."
  def equatorial_to_cartesian(ra_deg, dec_deg) do
    ra = deg_to_rad(ra_deg)
    dec = deg_to_rad(dec_deg)

    x = :math.cos(dec) * :math.cos(ra)
    y = :math.cos(dec) * :math.sin(ra)
    z = :math.sin(dec)

    {x, y, z}
  end

  @doc "Great-circle angular distance (degrees) between two RA/Dec points."
  def angular_distance(ra1_deg, dec1_deg, ra2_deg, dec2_deg) do
    {x1, y1, z1} = equatorial_to_cartesian(ra1_deg, dec1_deg)
    {x2, y2, z2} = equatorial_to_cartesian(ra2_deg, dec2_deg)

    dot = x1 * x2 + y1 * y2 + z1 * z2
    clamped = dot |> max(-1.0) |> min(1.0)

    rad_to_deg(:math.acos(clamped))
  end

  @doc "Coarse 8x4 RA/Dec sector grid lookup, returns a sector index 0..31."
  def sector_for(ra_deg, dec_deg) do
    ra_bucket = trunc(:math.fmod(ra_deg, 360.0) / 45.0)
    dec_bucket = trunc((dec_deg + 90.0) / 45.0)

    ra_bucket * 4 + dec_bucket
  end

  defp deg_to_rad(deg), do: deg * :math.pi() / 180.0
  defp rad_to_deg(rad), do: rad * 180.0 / :math.pi()
end
