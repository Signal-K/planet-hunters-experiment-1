import Link from 'next/link'
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_WORDMARK } from '@/lib/brand'
import styles from './landing.module.css'

export default function Home() {
  return (
    <main className={`theme-deep ${styles.page}`} data-testid="landnam-landing">
      <section className={styles.panel}>
        <div>
          <div className={styles.eyebrow}>{PRODUCT_WORDMARK} · PROGRAM BRIEFING</div>
          <h1 className={styles.title}>{PRODUCT_NAME}</h1>
          <p className={styles.copy}>{PRODUCT_DESCRIPTION} Browse the briefing first. Sign-in is only required when you enter operations.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/game" data-testid="landing-enter-operations">
              Enter Operations
            </Link>
            <Link className={styles.secondary} href="/game?gate=signup" data-testid="landing-create-account">
              Create Account
            </Link>
          </div>
        </div>
        <div className={styles.facts}>
          <article>
            <span>Mission 1</span>
            <p>Pick a client job, choose a target, and send a single-use Explorer.</p>
          </article>
          <article>
            <span>Mission 2</span>
            <p>Unlock the larger Prospector and read the mission-tier indicator before the next haul.</p>
          </article>
          <article>
            <span>Discovery</span>
            <p>Orbit instruments downlink real TESS and NEOCP subjects after free operations open.</p>
          </article>
        </div>
      </section>
    </main>
  )
}
