defmodule GeometryService.GeometryTest do
  use ExUnit.Case, async: true

  alias GeometryService.Geometry

  describe "equatorial_to_cartesian/2" do
    test "north pole (RA=0, Dec=90) maps to (0,0,1)" do
      {x, y, z} = Geometry.equatorial_to_cartesian(0.0, 90.0)
      assert_in_delta x, 0.0, 1.0e-10
      assert_in_delta y, 0.0, 1.0e-10
      assert_in_delta z, 1.0, 1.0e-10
    end

    test "vernal equinox (RA=0, Dec=0) maps to (1,0,0)" do
      {x, y, z} = Geometry.equatorial_to_cartesian(0.0, 0.0)
      assert_in_delta x, 1.0, 1.0e-10
      assert_in_delta y, 0.0, 1.0e-10
      assert_in_delta z, 0.0, 1.0e-10
    end

    test "unit vector: x^2 + y^2 + z^2 == 1 for arbitrary input" do
      {x, y, z} = Geometry.equatorial_to_cartesian(123.4, -45.6)
      norm_sq = x * x + y * y + z * z
      assert_in_delta norm_sq, 1.0, 1.0e-10
    end
  end

  describe "angular_distance/4" do
    test "same point has zero distance" do
      assert_in_delta Geometry.angular_distance(45.0, 30.0, 45.0, 30.0), 0.0, 1.0e-10
    end

    test "90-degree separation along equator" do
      assert_in_delta Geometry.angular_distance(0.0, 0.0, 90.0, 0.0), 90.0, 1.0e-6
    end

    test "poles are 180 degrees apart" do
      assert_in_delta Geometry.angular_distance(0.0, 90.0, 0.0, -90.0), 180.0, 1.0e-6
    end
  end

  describe "sector_for/2" do
    test "origin (RA=0, Dec=0) maps to sector 0" do
      assert Geometry.sector_for(0.0, -90.0) == 0
    end

    test "sector index is in range 0..31" do
      for ra <- Enum.map(0..7, &(&1 * 45.0)),
          dec <- Enum.map(0..3, &(&1 * 45.0 - 90.0)) do
        sector = Geometry.sector_for(ra, dec)
        assert sector >= 0 and sector <= 31
      end
    end
  end
end
