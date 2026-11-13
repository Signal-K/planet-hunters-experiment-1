# Takeon shared Go core

SSL-778 moves Landnám to one shared Go simulation, with platform-owned rendering.
The existing engine/Pixi APIs remain available through the 0.2.4 packages.

| Piece | Location | Ownership |
| --- | --- | --- |
| Browser/Node engine | `web/vendor/takeon/*0.2.4.tgz` | Built from Takeon's canonical Go runtime; TS keeps the synchronous facade and render projection |
| Pixi renderer | `@takeon/pixi` | Canvas/texture presentation and input, sharing the engine's Go simulation |
| Swift | `native/TakeonKit` | Compatibility re-export of Takeon's `TakeonCore` package; only Landnám target aliases remain here |
| Kotlin | Takeon `go/android` | Wrapper over the AAR built from the same `go/mobile` |
| Game glue | `web/lib/takeon` | Target/material mapping, presentation and offline persistence; no separate WASM loader |

## Boundary

Takeon owns world generation, rover/part stats, fixed ticks, commands, weather,
mining, structures/power/outposts, crafting, upgrades, scan/photo, objective
transitions and snapshots. Rendering, cameras, audio, input planning,
authentication, offline storage and Landnám progression remain host-owned.
Host registries resolve to declarative data before crossing the boundary.
Canonical bodies, parts, materials, biomes and rules live in Takeon's `go/data`;
its build generates the JS catalog from those same files.

The audit corrected the earlier assumption of a separate Swift implementation:
`GoTakeonEngine` already called the shared Go runtime. Its portable protocol,
models and bindings now live in Takeon, while this app retains its target aliases.

## Persistence

New engine saves add an opaque `coreSnapshot` while keeping the existing mission
fields. `LandnamSync` writes that UTF-8 Go JSON to the existing
`voxel_worlds.snapshot` base64 field, using native's established wire format, and
reads it on load. Legacy saves without it still resume; malformed optional
snapshots fall back to their legacy host fields. No old records are deleted.

The older `web/lib/takeon/goRuntime.ts` side-by-side loader and feature flag are
removed: the main package now runs the core directly, without a shadow sim.

## Builds and source identity

Refresh vendored artifacts by building/packing from the Takeon checkout, never
by editing a tarball. The default entry lazily initializes one embedded WASM VM
on its first core operation; imports remain inert during SSR. The optional
`@takeon/engine/go` entry supports explicit async standalone WASM loading.
`coreCapabilities().sourceHash` identifies the canonical runtime source digest
also embedded by Takeon's iOS and Android build commands.

`native/TakeonKit/Package.swift` prefers the sibling Takeon checkout when present
(or `TAKEON_PACKAGE_PATH`) and otherwise uses a pinned source revision. Run its
`sync-xcframework.sh` against that checkout before a native build. This compiles
Takeon's `go/mobile` into the framework used by its shared Swift package; it no
longer downloads the retired Go-runtime release.

## Verification scope

SSL-835 covered source promotion and the browser/Node boundary; SSL-836 covered
missing rules and parity; SSL-837 covered compatibility and this consumer switch;
SSL-838 covered portable mobile binding ownership. Details and verification are
recorded on those Linear tickets and SSL-778. Native build/runtime verification
was explicitly waived by the user; mobile artifacts must be rebuilt from the
pinned shared source before shipping native. See Takeon's `docs/go-runtime.md`
for the full contract and reproducible checks.
