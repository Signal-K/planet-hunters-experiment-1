import { redirect } from 'next/navigation'

// SSL-35: the landing is one flow inside the game (base yard, Continue /
// Start new game, then sign in). The root URL goes straight into it.
export default function Home() {
  redirect('/game')
}
