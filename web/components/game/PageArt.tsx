import styles from './PageArt.module.css'

/**
 * A small, semantic scene rather than a texture. It deliberately contains no
 * people or planet imagery: these are the buildings and instruments the player
 * is standing in front of.
 */
export type PageArtScene = 'control' | 'contracts' | 'exchange' | 'workshop' | 'academy' | 'hangar' | 'refinery' | 'field' | 'records'

const ART_BY_AMBIENT: Record<string, PageArtScene> = {
  survey: 'control', industrial: 'refinery', utility: 'workshop', observatory: 'control',
}

export function artForAmbient(ambient: string): PageArtScene { return ART_BY_AMBIENT[ambient] ?? 'workshop' }

export default function PageArt({ scene }: { scene: PageArtScene }) {
  return (
    <div className={`${styles.art} ${styles[`art_${scene}`]}`} data-testid={`page-art-${scene}`}>
      <div className={styles.grid} />
      <svg className={styles.svg} viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className={styles.horizon} d="M0 338 C150 300 270 326 420 308 S710 326 880 300 S1050 310 1200 284 V420 H0Z" />
        <g className={styles.building}>
          {scene === 'control' && <>
            <path d="M500 338V208h200v130M480 208h240v-30H480zM565 338v-60h70v60M600 178v-80m-45 45q45-50 90 0m-120 0q75-82 150 0" />
            <path d="M170 338l25-100 25 100m760 0 25-100 25 100M125 238q70 55 140 0M935 238q70 55 140 0" />
          </>}
          {scene === 'contracts' && <>
            <path d="M430 338V198l170-82 170 82v140M430 198h340M570 338v-92h60v92M600 116V72m-22 20h44" />
            <path d="M790 338V152h42v186m-42-144 42 42m-42 0 42 42m-42 0 42 42" />
          </>}
          {scene === 'exchange' && <>
            <path d="M330 338V202l270-98 270 98v136M310 202h580M360 338V222m80 116V222m80 116V222m80 116V222m80 116V222m80 116V222" />
            <path d="M558 182h84v-44h-84zM570 170l16-14 15 10 16-22 13 8" />
          </>}
          {scene === 'workshop' && <><path d="M360 338V188h480v150M360 188l44-48h392l44 48M430 338v-92h190v92m70 0v-68h92v68" /><path d="M225 338v-94m-24 0h48m-24 0v-42M970 338v-94m-24 0h48m-24 0v-42" /></>}
          {scene === 'academy' && <><path d="M300 338V208h400v130M300 208h400v-30H300zM460 338v-82h80v82M805 338V188q0-85 80-85t80 85v150" /><path d="M885 103V58m-18 20h36" /></>}
          {scene === 'hangar' && <><path d="M200 338V205q0-110 400-110t400 110v133M330 338V236q0-55 270-55t270 55v102M600 338V208" /><path d="M120 338V230m-24 0h48m936 108V230m-24 0h48" /></>}
          {scene === 'refinery' && <><path d="M350 338l12-188h64l12 188m48 0 12-230h64l12 230m48 0 12-170h64l12 170M790 338V232h142v106" /><path d="M350 172h88m48-20h88m48 60h88M440 305h46m72 0h64m76 0h92" /></>}
          {scene === 'field' && <><path d="M420 338v-100h250v100M450 238l34-42h122l34 42M650 338v-44h80v44" /><path d="M90 338q100-48 210 0m610 0q100-48 210 0M540 196v-70m-22 22h44" /></>}
          {scene === 'records' && <><path d="M370 338V150h460v188M400 150h400v-26H400zM450 338v-128h90v128m70 0v-128h90v128" /><path d="M530 94h140m-116-26v52m46-52v52m46-52v52" /></>}
        </g>
        <path className={styles.groundLine} d="M0 338H1200" />
      </svg>
    </div>
  )
}
