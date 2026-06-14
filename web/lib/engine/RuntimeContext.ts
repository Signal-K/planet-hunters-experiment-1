/** Auth/session info forwarded from the React layer at mount time. The runtime
 * does not fetch or refresh this itself — React owns the PocketBase session. */
export interface AuthContext {
  userId: string | null
  token: string | null
}

/** Mount-time context handed to ScriptBehaviour components so game logic can
 * associate entities/actions with the logged-in user without the runtime
 * holding its own auth state. */
export class RuntimeContext {
  auth: AuthContext

  constructor(auth: AuthContext = { userId: null, token: null }) {
    this.auth = auth
  }
}
