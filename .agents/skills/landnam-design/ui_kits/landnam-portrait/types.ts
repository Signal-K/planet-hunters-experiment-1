// Landnam Portrait — shared type declarations.
// This file is NOT loaded as a babel script tag; it exists purely so editors
// (and developers) can reference shared shapes via:
//   /// <reference path="./types.ts" />
// at the top of each .tsx file. Each .tsx file also re-declares the minimal
// global namespace shape it needs on `window` via `declare global`.

// ─── Minerals ────────────────────────────────────────────────────────
type MineralId = 'silicon' | 'iron' | 'ice' | 'carbon' | 'gold' | 'rare';

interface MineralMeta {
  name: string;
  sym: string;
  color: string;
  price: number;
}

type MineralMetaMap = Record<MineralId, MineralMeta>;

// ─── Stars (galaxy atlas) ────────────────────────────────────────────
type StarKind = 'cool' | 'pale' | 'sol' | 'warm' | 'red';

interface Star {
  id: string;
  name: string;
  dist: string;
  x: number;
  y: number;
  kind: StarKind;
}

type StarLink = [string, string];

// ─── Targets (Sol system) ────────────────────────────────────────────
interface Target {
  id: string;
  name: string;
  orbit: number;
  color: string;
  minerals: MineralId[];
  difficulty: number;
  brief: string;
  hub?: boolean;
  recommended?: boolean;
  moonOnly?: boolean;
}

// ─── Parts ───────────────────────────────────────────────────────────
interface ChassisPart {
  id: string;
  name: string;
  tier: number;
  mass: number;
  cargo: number;
  img: string;
  locked?: boolean;
  unlockAt?: string;
}

interface PropulsionPart {
  id: string;
  name: string;
  tier: number;
  power: number;
  max_orbit: number;
  img: string;
  locked?: boolean;
  unlockAt?: string;
}

interface DrillPart {
  id: string;
  name: string;
  tier: number;
  rate: number;
  img: string;
  locked?: boolean;
  unlockAt?: string;
}

interface PartsCatalog {
  chassis: ChassisPart[];
  propulsion: PropulsionPart[];
  drill: DrillPart[];
}

type PartSlot = 'chassis' | 'propulsion' | 'drill';

// ─── Contractors ─────────────────────────────────────────────────────
interface Contractor {
  id: string;
  name: string;
  color: string;
  glyph: string;
  affinity: number;
}

type ContractorId = 'helios' | 'cryos' | 'guild' | 'beacon' | 'sirius';

type ContractorMap = Record<ContractorId, Contractor>;

// ─── Missions ────────────────────────────────────────────────────────
interface MissionRequirements {
  minerals: Partial<Record<MineralId, number>>;
  cargo_min: number;
  drill_tier: number;
  max_orbit: number;
}

interface MissionPayout {
  francs: number;
  xp: number;
  affinity: number;
}

interface Mission {
  id: string;
  contractor: ContractorId;
  title: string;
  brief: string;
  requires: MissionRequirements;
  payout: MissionPayout;
  difficulty: string;
  tag: string;
  hot?: boolean;
  locked?: boolean;
  unlockAt?: string;
}

// ─── Rocket / build state ────────────────────────────────────────────
interface RocketBuild {
  chassis: string;
  propulsion: string;
  drill: string;
}

// ─── Cargo ───────────────────────────────────────────────────────────
type Cargo = Partial<Record<MineralId, number>>;

// ─── Validation ──────────────────────────────────────────────────────
interface ValidateBuildArgs {
  mission?: Mission | null;
  target?: Target | null;
  rocket: RocketBuild;
}

interface ValidateBuildResult {
  ok: boolean;
  problems: string[];
  chassis?: ChassisPart;
  propulsion?: PropulsionPart;
  drill?: DrillPart;
}

interface SuggestBuildArgs {
  mission?: Mission | null;
  target: Target;
  level?: number;
}

interface RateMissionArgs {
  mission?: Mission | null;
  cargo: Cargo;
  elapsed?: number;
}

// ─── window.LandnamData shape ────────────────────────────────────────
interface LandnamDataNamespace {
  MINERAL_META: MineralMetaMap;
  STARS: Star[];
  STAR_LINKS: StarLink[];
  TARGETS: Target[];
  PARTS: PartsCatalog;
  CONTRACTORS: ContractorMap;
  MISSIONS: Mission[];
  compatibleTargetsFor: (mission: Mission | null | undefined) => Target[];
  validateBuild: (args: ValidateBuildArgs) => ValidateBuildResult;
  suggestBuild: (args: SuggestBuildArgs) => RocketBuild;
  sellCargo: (cargo: Cargo) => number;
  rateMission: (args: RateMissionArgs) => number;
}

// ─── Player state (app.tsx) ──────────────────────────────────────────
interface ActiveMission {
  id: string;
  label: string;
}

interface Player {
  francs: number;
  level: number;
  xp: number;
  activeMission: ActiveMission | null;
  missionCount: number;
  pendingLaunch: boolean;
  controlBuilt?: boolean;
  missionsDone?: number;
  placed?: string[];
}

type ScreenId =
  | 'build' | 'hub' | 'missions' | 'targets' | 'fab'
  | 'galaxy' | 'transit' | 'mining' | 'debrief';

// ─── Tutorial ─────────────────────────────────────────────────────────
type PopupKind = 'sr2' | 'freeops' | 'loan';

interface TutorialStepSpot {
  x: number;
  y: number;
  w: number;
  h: number;
}

type CoachAnchor = 'top' | 'bottom' | 'center';

interface TutorialStep {
  id: number;
  screen: ScreenId | string;
  title: string;
  body: string;
  action?: string;
  manual?: boolean;
  anchor: CoachAnchor;
  spot: TutorialStepSpot | null;
  cta: string;
}

type DoneStepsMap = Record<number, boolean>;

interface StartParams {
  screen?: ScreenId;
  built?: boolean;
  activeMission?: ActiveMission | null;
  missionId?: string | null;
  targetId?: string | null;
  cargo?: Cargo | null;
  menu?: boolean;
  tutorial?: boolean;
  doneSteps?: DoneStepsMap;
  popup?: PopupKind | null;
  gate?: boolean;
  hideDev?: boolean;
}

// ─── window.LandnamIcons shape ───────────────────────────────────────
interface LandnamIconsNamespace {
  I: Record<string, () => React.ReactElement>;
  Planet: (props: { id: string; size?: number }) => React.ReactElement;
  Sun: (props: { size?: number }) => React.ReactElement;
  ContractorBadge: (props: { contractor: Contractor; size?: number }) => React.ReactElement;
  MineralGlyph: (props: { id: MineralId; size?: number }) => React.ReactElement;
  Building: (props: Record<string, unknown>) => React.ReactElement;
  BuildingArt: (props: { kind: string; hot?: boolean }) => React.ReactElement;
  lighten: (hex: string, t: number) => string;
  darken: (hex: string, t: number) => string;
}

// ─── window.LandnamChrome shape ──────────────────────────────────────
interface LandnamChromeNamespace {
  TopBar: (props: Record<string, unknown>) => React.ReactElement;
  BottomNav: (props: Record<string, unknown>) => React.ReactElement;
  Panel: (props: Record<string, unknown>) => React.ReactElement;
  GhostBtn: (props: Record<string, unknown>) => React.ReactElement;
  StatusPill: (props: Record<string, unknown>) => React.ReactElement;
  SceneBg: (props: Record<string, unknown>) => React.ReactElement;
  RadialMenu: (props: Record<string, unknown>) => React.ReactElement;
  IconBtn: (props: Record<string, unknown>) => React.ReactElement;
  [key: string]: (props: Record<string, unknown>) => React.ReactElement;
}

// ─── window.LandnamScreensPre / ScreensLoop / Tutorial shapes ────────
interface LandnamScreensPreNamespace {
  HubScreen: (props: Record<string, unknown>) => React.ReactElement;
  MissionBoardScreen: (props: Record<string, unknown>) => React.ReactElement;
  MissionDetailScreen: (props: Record<string, unknown>) => React.ReactElement;
  TargetPickerScreen: (props: Record<string, unknown>) => React.ReactElement;
  FabScreen: (props: Record<string, unknown>) => React.ReactElement;
  GalaxyScreen: (props: Record<string, unknown>) => React.ReactElement;
  BuildPlaceScreen: (props: Record<string, unknown>) => React.ReactElement;
  GameMenu: (props: Record<string, unknown>) => React.ReactElement;
  [key: string]: (props: Record<string, unknown>) => React.ReactElement;
}

interface LandnamScreensLoopNamespace {
  TransitScreen: (props: Record<string, unknown>) => React.ReactElement;
  MiningScreen: (props: Record<string, unknown>) => React.ReactElement;
  DebriefScreen: (props: Record<string, unknown>) => React.ReactElement;
  [key: string]: (props: Record<string, unknown>) => React.ReactElement;
}

interface LandnamTutorialNamespace {
  M1_STEPS: TutorialStep[];
  TutorialCoach: (props: Record<string, unknown>) => React.ReactElement | null;
  UnlockPopup: (props: Record<string, unknown>) => React.ReactElement;
  BuildGatePrompt: (props: Record<string, unknown>) => React.ReactElement;
  CoachAvatar?: (props: Record<string, unknown>) => React.ReactElement;
  [key: string]: unknown;
}

// Ambient script (no imports/exports) — augmenting `Window` directly works
// at the global scope without a `declare global` wrapper.
interface Window {
  LandnamData: LandnamDataNamespace;
  LandnamIcons: LandnamIconsNamespace;
  LandnamChrome: LandnamChromeNamespace;
  LandnamScreensPre: LandnamScreensPreNamespace;
  LandnamScreensLoop: LandnamScreensLoopNamespace;
  LandnamTutorial: LandnamTutorialNamespace;
  LandnamApp: () => unknown;
  LANDNAM_START?: StartParams;

  // iOS device-frame primitives (ios-frame.tsx)
  IOSDevice: (props: Record<string, unknown>) => unknown;
  IOSStatusBar: (props: Record<string, unknown>) => unknown;
  IOSNavBar: (props: Record<string, unknown>) => unknown;
  IOSGlassPill: (props: Record<string, unknown>) => unknown;
  IOSList: (props: Record<string, unknown>) => unknown;
  IOSListRow: (props: Record<string, unknown>) => unknown;
  IOSKeyboard: (props: Record<string, unknown>) => unknown;
}
