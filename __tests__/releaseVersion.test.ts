const {
  computeNextReleaseNumber,
  extractReleaseNumber,
  formatReleaseName,
  formatReleaseTag,
} = require("../scripts/release/next-release.js");

describe("release versioning", () => {
  it("extracts release number from tag", () => {
    expect(extractReleaseNumber("planet-hunters-v15")).toBe(15);
  });

  it("extracts release number from release name", () => {
    expect(extractReleaseNumber("Planet Hunters Release 9")).toBe(9);
  });

  it("returns 1 when no release exists", () => {
    expect(computeNextReleaseNumber([])).toBe(1);
  });

  it("returns max+1 from mixed release metadata", () => {
    const releases = [
      { tag_name: "planet-hunters-v2", name: "Planet Hunters Release 2" },
      { tag_name: "planet-hunters-v11", name: "Planet Hunters Release 11" },
      { tag_name: "other-tag", name: "unrelated release" },
    ];
    expect(computeNextReleaseNumber(releases)).toBe(12);
  });

  it("formats release outputs", () => {
    expect(formatReleaseTag(21)).toBe("planet-hunters-v21");
    expect(formatReleaseName(21)).toBe("Planet Hunters Release 21");
  });
});
