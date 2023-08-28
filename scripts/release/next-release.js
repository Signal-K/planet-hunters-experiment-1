const fs = require("fs");

const TAG_PATTERN = /planet-hunters-v(\d+)/i;
const NAME_PATTERN = /planet\s+hunters\s+release\s+(\d+)/i;

function extractReleaseNumber(value) {
  if (typeof value !== "string") {
    return 0;
  }
  const tagMatch = value.match(TAG_PATTERN);
  if (tagMatch) {
    return Number(tagMatch[1]) || 0;
  }
  const nameMatch = value.match(NAME_PATTERN);
  if (nameMatch) {
    return Number(nameMatch[1]) || 0;
  }
  return 0;
}

function computeNextReleaseNumber(releases) {
  if (!Array.isArray(releases) || releases.length === 0) {
    return 1;
  }
  let maxVersion = 0;
  for (const release of releases) {
    if (typeof release === "string") {
      maxVersion = Math.max(maxVersion, extractReleaseNumber(release));
      continue;
    }
    if (release && typeof release === "object") {
      maxVersion = Math.max(
        maxVersion,
        extractReleaseNumber(release.tag_name),
        extractReleaseNumber(release.name)
      );
    }
  }
  return maxVersion + 1;
}

function formatReleaseTag(versionNumber) {
  return `planet-hunters-v${versionNumber}`;
}

function formatReleaseName(versionNumber) {
  return `Planet Hunters Release ${versionNumber}`;
}

function main() {
  const inputPath = process.argv[2];
  let releases = [];

  if (inputPath) {
    const raw = fs.readFileSync(inputPath, "utf8");
    const parsed = JSON.parse(raw);
    releases = Array.isArray(parsed) ? parsed : [];
  }

  const releaseNumber = computeNextReleaseNumber(releases);
  process.stdout.write(`release_number=${releaseNumber}\n`);
  process.stdout.write(`release_tag=${formatReleaseTag(releaseNumber)}\n`);
  process.stdout.write(`release_name=${formatReleaseName(releaseNumber)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  computeNextReleaseNumber,
  extractReleaseNumber,
  formatReleaseName,
  formatReleaseTag,
};
