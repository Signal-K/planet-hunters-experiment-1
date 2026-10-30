import BrowserOrientationGuide from '@/components/pwa/BrowserOrientationGuide'

// Every /game route: a phone held sideways in a browser tab is asked to turn upright or install.
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BrowserOrientationGuide />
    </>
  )
}
