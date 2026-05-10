const {
  computeNextReleaseNumber,
  extractReleaseNumber,
  formatReleaseName,
  formatReleaseTag,
} = require("../scripts/release/next-release.js");

describe("release versioning", () => {
  it("extracts release number from tag", () => {
    expect(extractReleaseNumber("landnam-v15")).toBe(15);
  });

  it("extracts release number from release name", () => {
    expect(extractReleaseNumber("Landnám Release 9")).toBe(9);
  });

  it("returns 1 when no release exists", () => {
    expect(computeNextReleaseNumber([])).toBe(1);
  });

  it("returns max+1 from mixed release metadata", () => {
    const releases = [
      { tag_name: "landnam-v2", name: "Landnám Release 2" },
      { tag_name: "landnam-v11", name: "Landnám Release 11" },
      { tag_name: "other-tag", name: "unrelated release" },
    ];
    expect(computeNextReleaseNumber(releases)).toBe(12);
  });

  it("formats release outputs", () => {
    expect(formatReleaseTag(21)).toBe("landnam-v21");
    expect(formatReleaseName(21)).toBe("Landnám Release 21");
  });
});
