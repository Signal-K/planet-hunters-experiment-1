import type { ReactNode } from 'react'
import styles from './PageArt.module.css'

/**
 * Themed scene art behind an internal page (Control Station, Mission board, Market, ...).
 *
 * Light blueprint line art in the Omega style: thin ink outlines, pale fills, no people, no planet and no
 * named places. Each scene is a building or piece of equipment from the base that the page belongs to; the page
 * panels sit on top of it. Mounted through `ScenePanel`'s `art` prop.
 */
export type PageArtScene =
  | 'control'
  | 'contracts'
  | 'exchange'
  | 'workshop'
  | 'academy'
  | 'hangar'
  | 'refinery'
  | 'field'
  | 'records'
  | 'construction'
  | 'plaza'

export const PAGE_ART_SCENES: readonly PageArtScene[] = [
  'control', 'contracts', 'exchange', 'workshop', 'academy', 'hangar', 'refinery', 'field', 'records', 'construction', 'plaza',
]

const GROUND_Y = 640
const SCENE_H = 664

function Backdrop() {
  return (
    <g>
      <path className={`${styles.line} ${styles.tint}`} d={`M0 ${GROUND_Y - 70} C 120 ${GROUND_Y - 130} 240 ${GROUND_Y - 120} 360 ${GROUND_Y - 80} S 560 ${GROUND_Y - 110} 700 ${GROUND_Y - 70} S 960 ${GROUND_Y - 130} 1200 ${GROUND_Y - 60} V ${GROUND_Y} H0 Z`} />
      <g className={styles.cloud}>
        <path className={`${styles.line} ${styles.paper}`} d="M110 170 q10 -34 46 -30 q16 -30 56 -12 q40 -8 48 28 q26 4 22 28 H98 q-14 -4 12 -14 Z" />
        <path className={`${styles.line} ${styles.paper}`} d="M860 120 q10 -30 42 -26 q14 -26 50 -10 q36 -6 42 26 q22 4 20 24 H852 q-12 -4 8 -14 Z" />
      </g>
      <rect className={`${styles.line} ${styles.ground}`} x="-4" y={GROUND_Y} width="1208" height={SCENE_H - GROUND_Y + 4} />
    </g>
  )
}

function Dish({ x, y, s = 1, tilt = -28 }: { x: number; y: number; s?: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className={`${styles.line} ${styles.paper}`} d="M-14 0 L0 -44 L14 0 Z" />
      <g transform={`rotate(${tilt} 0 -44)`}>
        <path className={`${styles.line} ${styles.tintHi}`} d="M-58 -44 Q0 10 58 -44 Q0 -22 -58 -44 Z" />
        <path className={styles.line} d="M0 -34 V-84 M-8 -84 H8" />
      </g>
    </g>
  )
}

function Windows({ x, y, cols, rows, w = 22, h = 28, gap = 14 }: { x: number; y: number; cols: number; rows: number; w?: number; h?: number; gap?: number }) {
  const cells: ReactNode[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    cells.push(<rect key={`${r}-${c}`} className={`${styles.line} ${styles.glass}`} x={x + c * (w + gap)} y={y + r * (h + gap)} width={w} height={h} />)
  }
  return <g>{cells}</g>
}

function Gear({ x, y, r }: { x: number; y: number; r: number }) {
  const teeth = 10
  const pts: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const a = (Math.PI * i) / teeth
    const rr = i % 2 === 0 ? r : r * 0.82
    pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`)
  }
  return (
    <g>
      <polygon className={`${styles.line} ${styles.tintHi}`} points={pts.join(' ')} />
      <circle className={`${styles.line} ${styles.paper}`} cx={x} cy={y} r={r * 0.34} />
    </g>
  )
}

function Control() {
  return (
    <g>
      <Dish x={210} y={GROUND_Y} s={1.15} tilt={-24} />
      <Dish x={990} y={GROUND_Y} s={1.3} tilt={24} />
      <rect className={`${styles.line} ${styles.paper}`} x="470" y="500" width="260" height="140" />
      <rect className={`${styles.line} ${styles.tint}`} x="470" y="500" width="260" height="26" />
      <Windows x={496} y={552} cols={5} rows={1} w={30} h={36} gap={14} />
      <rect className={`${styles.line} ${styles.paper}`} x="574" y="596" width="52" height="44" />
      <path className={styles.line} d="M600 500 V400 M584 424 H616 M590 448 H610" />
      <circle className={`${styles.line} ${styles.mint}`} cx="600" cy="394" r="9" />
      <path className={`${styles.line} ${styles.dash}`} d="M560 372 q40 -34 80 0 M540 348 q60 -60 120 0 M520 324 q80 -86 160 0" />
      <g transform="translate(860 190)">
        <rect className={`${styles.line} ${styles.paper}`} x="-14" y="-12" width="28" height="24" />
        <rect className={`${styles.line} ${styles.tintHi}`} x="-60" y="-8" width="40" height="16" />
        <rect className={`${styles.line} ${styles.tintHi}`} x="20" y="-8" width="40" height="16" />
      </g>
      <path className={`${styles.line} ${styles.dash}`} d="M760 250 Q 860 130 980 220" />
    </g>
  )
}

function Contracts() {
  return (
    <g>
      <rect className={`${styles.line} ${styles.ice}`} x="360" y="620" width="480" height="20" />
      <g>
        <rect className={`${styles.line} ${styles.paper}`} x="720" y="330" width="40" height="290" />
        <path className={styles.line} d="M720 330 L760 400 M760 330 L720 400 M720 400 L760 470 M760 400 L720 470 M720 470 L760 540 M760 470 L720 540 M720 540 L760 610 M760 540 L720 610" />
        <path className={`${styles.line} ${styles.tintHi}`} d="M640 360 H720 V376 H640 Z" />
      </g>
      <g>
        <path className={`${styles.line} ${styles.paper}`} d="M560 620 V420 Q560 350 600 310 Q640 350 640 420 V620 Z" />
        <circle className={`${styles.line} ${styles.glass}`} cx="600" cy="430" r="16" />
        <rect className={`${styles.line} ${styles.tintHi}`} x="560" y="500" width="80" height="22" />
        <path className={`${styles.line} ${styles.paper}`} d="M560 560 L520 630 H560 Z M640 560 L680 630 H640 Z" />
      </g>
      <rect className={`${styles.line} ${styles.paper}`} x="380" y="560" width="110" height="60" />
      <Windows x={394} y={576} cols={3} rows={1} w={22} h={20} gap={12} />
      <path className={styles.line} d="M450 560 V510 M450 510 L430 524" />
      <path className={`${styles.line} ${styles.dash}`} d="M600 300 Q 640 200 740 150" />
    </g>
  )
}

function Exchange() {
  const cols = [0, 1, 2, 3, 4, 5]
  return (
    <g>
      <rect className={`${styles.line} ${styles.paper}`} x="330" y="610" width="540" height="30" />
      <rect className={`${styles.line} ${styles.ice}`} x="360" y="584" width="480" height="26" />
      <path className={`${styles.line} ${styles.tint}`} d="M340 400 L600 300 L860 400 Z" />
      <rect className={`${styles.line} ${styles.paper}`} x="360" y="400" width="480" height="26" />
      {cols.map(i => (
        <rect key={i} className={`${styles.line} ${styles.paper}`} x={384 + i * 84} y="426" width="30" height="158" />
      ))}
      <rect className={`${styles.line} ${styles.glass}`} x="566" y="346" width="68" height="40" />
      <path className={`${styles.line} ${styles.trace}`} d="M574 378 L588 364 L600 372 L612 354 L626 360" />
      <g>
        <rect className={`${styles.line} ${styles.paper}`} x="900" y="520" width="90" height="120" />
        <path className={styles.line} d="M900 560 H990 M900 600 H990 M945 520 V640" />
        <rect className={`${styles.line} ${styles.tintHi}`} x="1000" y="580" width="110" height="60" />
        <path className={styles.line} d="M1000 600 H1110 M1000 620 H1110" />
      </g>
      <g>
        <rect className={`${styles.line} ${styles.tintHi}`} x="110" y="580" width="100" height="60" />
        <path className={styles.line} d="M110 600 H210 M110 620 H210" />
        <rect className={`${styles.line} ${styles.paper}`} x="226" y="560" width="70" height="80" />
        <path className={styles.line} d="M226 600 H296" />
      </g>
    </g>
  )
}

function Workshop() {
  return (
    <g>
      <rect className={`${styles.line} ${styles.paper}`} x="380" y="480" width="440" height="160" />
      <path className={`${styles.line} ${styles.tint}`} d="M380 480 L420 430 H780 L820 480 Z" />
      <rect className={`${styles.line} ${styles.glass}`} x="420" y="508" width="200" height="90" />
      <path className={styles.line} d="M470 508 V598 M520 508 V598 M570 508 V598 M420 553 H620" />
      <rect className={`${styles.line} ${styles.paper}`} x="660" y="540" width="110" height="100" />
      <Gear x={250} y={540} r={64} />
      <Gear x={940} y={500} r={84} />
      <Gear x={1040} y={590} r={40} />
      <path className={styles.line} d="M600 430 V340 M584 360 H616" />
      <circle className={`${styles.line} ${styles.mint}`} cx="600" cy="332" r="9" />
      <path className={`${styles.line} ${styles.dash}`} d="M880 250 H1060 M880 280 H1010 M880 310 H1100" />
    </g>
  )
}

function Academy() {
  return (
    <g>
      <rect className={`${styles.line} ${styles.paper}`} x="260" y="520" width="520" height="120" />
      <rect className={`${styles.line} ${styles.tint}`} x="260" y="520" width="520" height="22" />
      <Windows x={290} y={566} cols={8} rows={1} w={28} h={40} gap={20} />
      <rect className={`${styles.line} ${styles.paper}`} x="590" y="590" width="44" height="50" />
      <path className={`${styles.line} ${styles.paper}`} d="M860 640 V500 Q860 420 940 420 Q1020 420 1020 500 V640 Z" />
      <path className={`${styles.line} ${styles.tintHi}`} d="M860 500 Q860 420 940 420 Q1020 420 1020 500 Z" />
      <path className={styles.line} d="M940 420 V380 M940 380 l10 -20" />
      <path className={styles.line} d="M820 640 V430" />
      <path className={`${styles.line} ${styles.tintHi}`} d="M820 430 H880 V460 H820 Z" />
      <circle className={`${styles.line} ${styles.glass}`} cx="940" cy="520" r="22" />
      <path className={`${styles.line} ${styles.dash}`} d="M100 700 H1100" />
    </g>
  )
}

function Hangar() {
  return (
    <g>
      <path className={`${styles.line} ${styles.paper}`} d="M200 640 V480 Q200 360 600 340 Q1000 360 1000 480 V640 Z" />
      <path className={`${styles.line} ${styles.tint}`} d="M200 480 Q200 360 600 340 Q1000 360 1000 480 Z" />
      <path className={`${styles.line} ${styles.glass}`} d="M340 640 V520 Q340 470 600 460 Q860 470 860 520 V640 Z" />
      <path className={styles.line} d="M470 640 V478 M600 640 V460 M730 640 V478" />
      <path className={`${styles.line} ${styles.paper}`} d="M560 640 V560 Q560 520 600 500 Q640 520 640 560 V640 Z" />
      <path className={styles.line} d="M130 640 V430 M110 430 H150 M1070 640 V430 M1050 430 H1090" />
      <rect className={`${styles.line} ${styles.mint}`} x="100" y="414" width="60" height="16" />
      <rect className={`${styles.line} ${styles.mint}`} x="1040" y="414" width="60" height="16" />
      <path className={`${styles.line} ${styles.dash}`} d="M120 414 L300 480 M1080 414 L900 480" />
    </g>
  )
}

function Refinery() {
  return (
    <g>
      {[330, 430, 530].map((x, i) => (
        <g key={x}>
          <path className={`${styles.line} ${styles.paper}`} d={`M${x} 640 L${x + 8} ${380 + i * 20} H${x + 52} L${x + 60} 640 Z`} />
          <rect className={`${styles.line} ${styles.tintHi}`} x={x + 6} y={380 + i * 20} width="48" height="22" />
          <circle className={`${styles.line} ${styles.paper} ${styles.cloud}`} cx={x + 30} cy={340 + i * 20} r={20 + i * 4} />
        </g>
      ))}
      <rect className={`${styles.line} ${styles.paper}`} x="620" y="520" width="160" height="120" />
      <Windows x={640} y={546} cols={3} rows={1} w={30} h={30} gap={14} />
      <ellipse className={`${styles.line} ${styles.paper}`} cx="900" cy="560" rx="70" ry="22" />
      <path className={`${styles.line} ${styles.tint}`} d="M830 560 V630 Q900 660 970 630 V560 Q900 590 830 560 Z" />
      <ellipse className={`${styles.line} ${styles.paper}`} cx="1060" cy="580" rx="50" ry="16" />
      <path className={`${styles.line} ${styles.tint}`} d="M1010 580 V632 Q1060 654 1110 632 V580 Q1060 604 1010 580 Z" />
      <path className={styles.pipe} d="M780 600 H830 M970 600 H1010 M250 620 H330" />
      <rect className={`${styles.line} ${styles.paper}`} x="150" y="560" width="100" height="80" />
      <path className={styles.line} d="M150 590 H250" />
    </g>
  )
}

function Field() {
  return (
    <g>
      <ellipse className={`${styles.line} ${styles.tint}`} cx="260" cy="690" rx="120" ry="18" />
      <ellipse className={`${styles.line} ${styles.tint}`} cx="930" cy="720" rx="170" ry="22" />
      <g transform="translate(560 600)">
        <rect className={`${styles.line} ${styles.paper}`} x="-70" y="-44" width="140" height="44" />
        <rect className={`${styles.line} ${styles.glass}`} x="-52" y="-34" width="44" height="20" />
        <path className={styles.line} d="M30 -44 L50 -80 M50 -80 H80" />
        <circle className={`${styles.line} ${styles.tintHi}`} cx="-46" cy="6" r="18" />
        <circle className={`${styles.line} ${styles.tintHi}`} cx="0" cy="6" r="18" />
        <circle className={`${styles.line} ${styles.tintHi}`} cx="46" cy="6" r="18" />
      </g>
      <g transform="translate(900 640)">
        <path className={`${styles.line} ${styles.glass}`} d="M-90 0 L-60 -60 H-10 L-40 0 Z M-10 0 L20 -60 H70 L40 0 Z M70 0 L100 -60 H150 L120 0 Z" />
        <path className={styles.line} d="M-40 0 V30 M40 0 V30 M120 0 V30" />
      </g>
      <path className={styles.line} d="M300 640 V560 M300 560 H340 V590 H300" />
      <path className={`${styles.line} ${styles.dash}`} d="M120 700 Q 400 670 700 706" />
    </g>
  )
}

function Records() {
  return (
    <g>
      <rect className={`${styles.line} ${styles.paper}`} x="380" y="440" width="440" height="200" />
      <path className={`${styles.line} ${styles.tint}`} d="M360 440 L600 360 L840 440 Z" />
      <circle className={`${styles.line} ${styles.glass}`} cx="600" cy="410" r="20" />
      <path className={styles.line} d="M600 410 V398 M600 410 L610 416" />
      <Windows x={410} y={470} cols={6} rows={2} w={36} h={36} gap={20} />
      <rect className={`${styles.line} ${styles.paper}`} x="560" y="584" width="80" height="56" />
      <rect className={`${styles.line} ${styles.paper}`} x="140" y="520" width="150" height="120" />
      <path className={styles.line} d="M140 560 H290 M140 600 H290 M215 520 V640" />
      <rect className={`${styles.line} ${styles.paper}`} x="910" y="540" width="140" height="100" />
      <path className={styles.line} d="M910 574 H1050 M910 608 H1050" />
    </g>
  )
}

function Construction() {
  return (
    <g>
      <rect className={`${styles.line} ${styles.paper}`} x="300" y="330" width="30" height="310" />
      <path className={styles.line} d="M300 330 L330 390 M330 330 L300 390 M300 390 L330 450 M330 390 L300 450 M300 450 L330 510 M330 450 L300 510 M300 510 L330 570 M330 510 L300 570 M300 570 L330 630 M330 570 L300 630" />
      <path className={`${styles.line} ${styles.paper}`} d="M220 330 H760 V350 H220 Z" />
      <path className={styles.line} d="M315 330 L440 270 L640 330 M440 270 V330" />
      <path className={styles.line} d="M690 350 V440" />
      <rect className={`${styles.line} ${styles.tintHi}`} x="662" y="440" width="56" height="30" />
      <rect className={`${styles.line} ${styles.dash} ${styles.plot}`} x="420" y="580" width="180" height="60" />
      <rect className={`${styles.line} ${styles.dash} ${styles.plot}`} x="840" y="580" width="180" height="60" />
      <rect className={`${styles.line} ${styles.paper}`} x="860" y="500" width="110" height="80" />
      <path className={styles.line} d="M860 540 H970" />
      <rect className={`${styles.line} ${styles.tintHi}`} x="480" y="610" width="60" height="30" />
    </g>
  )
}

function Plaza() {
  return (
    <g>
      <rect className={`${styles.line} ${styles.paper}`} x="420" y="500" width="360" height="140" />
      <path className={`${styles.line} ${styles.tint}`} d="M400 500 Q600 400 800 500 Z" />
      <circle className={`${styles.line} ${styles.glass}`} cx="500" cy="560" r="24" />
      <circle className={`${styles.line} ${styles.glass}`} cx="600" cy="560" r="24" />
      <circle className={`${styles.line} ${styles.glass}`} cx="700" cy="560" r="24" />
      <rect className={`${styles.line} ${styles.paper}`} x="570" y="590" width="60" height="50" />
      <path className={styles.line} d="M300 640 V520 M280 520 H320 M900 640 V520 M880 520 H920" />
      <circle className={`${styles.line} ${styles.mint}`} cx="300" cy="512" r="10" />
      <circle className={`${styles.line} ${styles.mint}`} cx="900" cy="512" r="10" />
      <path className={`${styles.line} ${styles.dash}`} d="M300 512 Q 600 380 900 512" />
    </g>
  )
}

const SCENES: Record<PageArtScene, () => ReactNode> = {
  control: Control,
  contracts: Contracts,
  exchange: Exchange,
  workshop: Workshop,
  academy: Academy,
  hangar: Hangar,
  refinery: Refinery,
  field: Field,
  records: Records,
  construction: Construction,
  plaza: Plaza,
}

export default function PageArt({ scene }: { scene: PageArtScene }) {
  const Scene = SCENES[scene]
  return (
    <div className={`ln-page-art ${styles.art}`} data-page-art={scene} aria-hidden="true">
      <div className={styles.sky}>
        <svg className={styles.svg} viewBox={`0 0 1200 ${SCENE_H}`} preserveAspectRatio="xMidYMax slice" focusable="false">
          <Backdrop />
          <Scene />
        </svg>
      </div>
    </div>
  )
}
