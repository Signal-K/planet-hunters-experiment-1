import Link from 'next/link'
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_WORDMARK } from '@/lib/brand'
import styles from './landing.module.css'

export default function Home() {
  return (
    <main className={`theme-deep ${styles.page}`} data-testid="landnam-landing">
      <section className={styles.intro} aria-labelledby="landing-title">
        <div className={styles.copyPanel}>
          <div className={styles.eyebrow}>{PRODUCT_WORDMARK} · BASE ONLINE</div>
          <h1 className={styles.title} id="landing-title">Run a space program from the ground up.</h1>
          <p className={styles.copy}>{PRODUCT_DESCRIPTION} Build the base, run client missions, and use real science instruments once the programme is ready.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/game" data-testid="landing-enter-operations">
              Continue
            </Link>
            <Link className={styles.secondary} href="/game?gate=signup" data-testid="landing-create-account">
              Start new game
            </Link>
          </div>
          <p className={styles.note}>Sign in when you enter operations. The briefing stays open to everyone.</p>
        </div>

        <div className={styles.yard} aria-label="Earth Base growing from one launchpad into an operating space programme">
          <div className={styles.sky} aria-hidden="true">
            <span className={`${styles.star} ${styles.starOne}`} />
            <span className={`${styles.star} ${styles.starTwo}`} />
            <span className={`${styles.star} ${styles.starThree}`} />
            <span className={styles.rocket} />
          </div>
          <div className={styles.horizon} aria-hidden="true" />
          <div className={styles.ground} aria-hidden="true">
            <span className={`${styles.structure} ${styles.launchpad}`}><i /><b /></span>
            <span className={`${styles.structure} ${styles.silo}`}><i /><b /></span>
            <span className={`${styles.structure} ${styles.hangar}`}><i /><b /></span>
            <span className={`${styles.structure} ${styles.telescope}`}><i /><b /></span>
            <span className={styles.crane}><i /><b /></span>
          </div>
          <ol className={styles.progress}>
            <li><span>01</span> LAUNCHPAD</li>
            <li><span>02</span> STORAGE</li>
            <li><span>03</span> INSTRUMENTS</li>
          </ol>
        </div>
      </section>
    </main>
  )
}
