'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useGame } from '@/game-context'
import { pbShared } from '@/lib/pb'
import PageSurface from '@/components/ui/PageSurface'
import ScenePanel from '@/components/game/ScenePanel'
import FriendAvatar from '@/components/game/FriendAvatar'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import styles from './FriendsSheet.module.css'
import { generateDefaultUsername, isValidUsername } from '@/lib/friends/username'
import {
  FriendsApiError,
  friendGiftInbox,
  listFriendDirectory,
  listFriends,
  removeFriendship,
  respondToFriendRequest,
  searchFriendCandidates,
  sendFriendGift,
  sendFriendRequest,
  setFriendUsername,
  viewFriendBase,
  type FriendEntry,
  type FriendGiftInboxEntry,
  type FriendGiftKind,
  type FriendPublicUser,
  type FriendsListResponse,
  type FriendBaseSnapshot,
} from '@/lib/friends/client'

interface FriendsSheetProps {
  onClose: () => void
}

type Tab = 'friends' | 'requests' | 'find'

const GIFT_KINDS: { kind: FriendGiftKind; label: string }[] = [
  { kind: 'currency', label: 'Francs' },
  { kind: 'resource', label: 'Resource' },
  { kind: 'blueprint', label: 'Blueprint' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
      letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase',
      marginBottom: 10, marginTop: 24,
    }}>
      {children}
    </div>
  )
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
        background: active ? 'var(--ln-cyan-soft)' : 'transparent',
        border: `1px solid ${active ? 'var(--ln-cyan-border)' : 'var(--ln-hairline)'}`,
        color: active ? 'var(--ln-cyan-press)' : 'var(--ln-text-muted)',
        fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  )
}

function SmallButton({
  label, onClick, disabled, tone = 'default',
}: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        background: tone === 'danger' ? 'var(--ln-crimson-soft)' : 'var(--ln-cyan-soft)',
        border: `1px solid ${tone === 'danger' ? 'var(--ln-crimson-border)' : 'var(--ln-cyan-border)'}`,
        color: tone === 'danger' ? 'var(--ln-crimson-press)' : 'var(--ln-cyan-press)',
        fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
        letterSpacing: '0.08em', textTransform: 'uppercase', opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

function FriendRow({
  entry, onViewBase, onSendGift, onRemove, sendingGiftKind, removable,
}: {
  entry: FriendEntry
  onViewBase?: () => void
  onSendGift?: (kind: FriendGiftKind) => void
  onRemove: () => void
  sendingGiftKind?: FriendGiftKind | null
  removable: boolean
}) {
  const [pickingGift, setPickingGift] = useState(false)
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '12px 0', borderBottom: '1px solid var(--ln-divider)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FriendAvatar seed={entry.id} size={36} />
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)', flex: 1 }}>
          {entry.username}
        </div>
        {onViewBase && <SmallButton label="View Base" onClick={onViewBase} />}
        {onSendGift && !pickingGift && (
          <SmallButton
            label={entry.giftSentToday ? 'Sent Today' : 'Send Gift'}
            disabled={entry.giftSentToday}
            onClick={() => setPickingGift(true)}
          />
        )}
        <SmallButton label={removable ? 'Remove' : 'Cancel'} tone="danger" onClick={onRemove} />
      </div>
      {pickingGift && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: 46 }}>
          {GIFT_KINDS.map(g => (
            <SmallButton
              key={g.kind}
              label={sendingGiftKind === g.kind ? 'Sending…' : g.label}
              disabled={!!sendingGiftKind}
              onClick={() => { onSendGift?.(g.kind); setPickingGift(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FriendsSheet({ onClose }: FriendsSheetProps) {
  const game = useGame()
  const [tab, setTab] = useState<Tab>('find')
  const [data, setData] = useState<FriendsListResponse | null>(null)
  const [inbox, setInbox] = useState<FriendGiftInboxEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendPublicUser[]>([])
  const [sendingGiftFor, setSendingGiftFor] = useState<{ id: string; kind: FriendGiftKind } | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [baseView, setBaseView] = useState<{ id: string; snapshot: FriendBaseSnapshot } | null>(null)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const { phase: skyPhase } = useTimeOfDay()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let list = await listFriends()
      // First visit: the backend has no username yet (falls back to the raw
      // user id). Mint a stable default from the account email so the player
      // never has to pick one before the feature is usable.
      if (list.me.username === list.me.id) {
        const email = pbShared.authStore.record?.email as string | undefined
        if (email) {
          try {
            await setFriendUsername(generateDefaultUsername(email))
            list = await listFriends()
          } catch {
            // Non-fatal — the player can still set one manually below.
          }
        }
      }
      setData(list)
      const [inboxRes, directoryRes] = await Promise.all([friendGiftInbox(), listFriendDirectory()])
      setInbox(inboxRes.gifts)
      setResults(directoryRes.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSearch() {
    if (query.trim().length < 2) {
      const directory = await listFriendDirectory()
      setResults(directory.results)
      return
    }
    try {
      const res = await searchFriendCandidates(query.trim())
      setResults(res.results)
    } catch {
      setResults([])
    }
  }

  async function handleSendRequest(username: string) {
    try {
      await sendFriendRequest(username)
      game.addToast(`Friend request sent to ${username}`, 'ok')
      setResults(r => r.filter(u => u.username !== username))
      void load()
    } catch (err) {
      game.addToast(err instanceof FriendsApiError ? err.message : 'Could not send request', 'warn')
    }
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    try {
      await respondToFriendRequest(friendshipId, accept)
      void load()
    } catch {
      game.addToast('Could not update request', 'warn')
    }
  }

  async function handleRemove(friendshipId: string) {
    try {
      await removeFriendship(friendshipId)
      void load()
    } catch {
      game.addToast('Could not remove friend', 'warn')
    }
  }

  async function handleViewBase(friendId: string) {
    try {
      const res = await viewFriendBase(friendId)
      setBaseView({ id: friendId, snapshot: res.base })
    } catch (err) {
      game.addToast(err instanceof FriendsApiError ? err.message : 'Could not load base', 'warn')
    }
  }

  async function handleSendGift(recipientId: string, kind: FriendGiftKind) {
    setSendingGiftFor({ id: recipientId, kind })
    try {
      await sendFriendGift(recipientId, kind)
      game.addToast('Gift sent', 'ok')
      void load()
    } catch (err) {
      game.addToast(err instanceof FriendsApiError ? err.message : 'Could not send gift', 'warn')
    } finally {
      setSendingGiftFor(null)
    }
  }

  async function handleClaim(giftId: string) {
    setClaimingId(giftId)
    try {
      await game.claimFriendGift(giftId)
      setInbox(list => list.filter(g => g.id !== giftId))
    } catch {
      game.addToast('Could not claim gift', 'warn')
    } finally {
      setClaimingId(null)
    }
  }

  async function handleSaveUsername() {
    setUsernameError(null)
    const name = usernameDraft.trim()
    if (!isValidUsername(name)) {
      setUsernameError('3-24 letters, numbers, or underscores')
      return
    }
    try {
      await setFriendUsername(name)
      setEditingUsername(false)
      void load()
    } catch (err) {
      setUsernameError(err instanceof FriendsApiError ? err.message : 'Could not save username')
    }
  }

  return (
    <PageSurface
      className="theme-deep"
      zIndex={210}
      contentTestId="friends-page"
      contentStyle={{
        background: 'transparent',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <ScenePanel ambient="survey" scene={<HubWorldBackground phase={skyPhase} />}>
      <div className={styles.shell}>
      <div className={styles.deck}>
        <aside className={styles.visual} aria-hidden="true">
          <div className={styles.visualLabel}>Earth Base Comms</div>
          <div className={styles.network}>
            <span className={styles.orbitOne} />
            <span className={styles.orbitTwo} />
            <span className={styles.nodeCenter} />
            <span className={`${styles.node} ${styles.nodeOne}`} />
            <span className={`${styles.node} ${styles.nodeTwo}`} />
            <span className={`${styles.node} ${styles.nodeThree}`} />
          </div>
          <p className={styles.visualCopy}>Locate other active crews, form a connection, and exchange field support.</p>
        </aside>
        <div className={styles.content}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.24em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Earth Base · Comms Network
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800,
            color: 'var(--ln-text)', letterSpacing: '-0.01em',
          }}>
            Crew Connections
          </div>
        </div>
        <button
          data-testid="friends-close"
          onClick={onClose}
          style={{
            background: 'var(--ln-surface-2)', border: '1px solid var(--ln-hairline)',
            borderRadius: 8, minHeight: 32, padding: '0 8px', cursor: 'pointer',
            color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.08em',
          }}
        >
          CLOSE
        </button>
      </div>

      {data?.me && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <FriendAvatar seed={data.me.id} size={44} />
          {editingUsername ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={usernameDraft}
                onChange={e => setUsernameDraft(e.target.value)}
                style={{
                  fontFamily: 'var(--ln-font-body)', fontSize: 13, padding: '6px 10px',
                  borderRadius: 6, border: '1px solid var(--ln-hairline)', background: 'var(--ln-surface-2)',
                  color: 'var(--ln-text)',
                }}
              />
              <SmallButton label="Save" onClick={handleSaveUsername} />
              <SmallButton label="Cancel" tone="danger" onClick={() => setEditingUsername(false)} />
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)' }}>
                {data.me.username}
              </div>
              <SmallButton
                label="Edit"
                onClick={() => { setUsernameDraft(data.me.username); setEditingUsername(true); setUsernameError(null) }}
              />
            </>
          )}
        </div>
      )}
      {usernameError && (
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-crimson-press)', marginTop: -12, marginBottom: 12 }}>
          {usernameError}
        </div>
      )}

      {baseView ? (
        <div>
          <SmallButton label="← Back" onClick={() => setBaseView(null)} />
          <SectionLabel>{baseView.snapshot.username}'s Base</SectionLabel>
          <div style={{ display: 'grid', gap: 1, background: 'var(--ln-divider)', borderRadius: 10, overflow: 'hidden' }}>
            <StatRow label="Missions Complete" value={String(baseView.snapshot.missionsDone ?? 0)} />
            <StatRow label="Structures Built" value={String(baseView.snapshot.placed?.length ?? 0)} />
            <StatRow label="Free Operations" value={baseView.snapshot.freeOperations ? 'Unlocked' : 'Locked'} />
            <StatRow label="Blueprints" value={String(baseView.snapshot.unlockedBlueprints?.length ?? 0)} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <TabButton active={tab === 'friends'} label="Friends" onClick={() => setTab('friends')} />
            <TabButton active={tab === 'requests'} label={`Requests${data ? ` (${data.incoming.length})` : ''}`} onClick={() => setTab('requests')} />
            <TabButton active={tab === 'find'} label="Directory" onClick={() => setTab('find')} />
          </div>

          {loading && <div style={{ padding: 20, color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-body)', fontSize: 13 }}>Loading…</div>}
          {error && <div style={{ padding: 20, color: 'var(--ln-crimson-press)', fontFamily: 'var(--ln-font-body)', fontSize: 13 }}>{error}</div>}

          {!loading && !error && tab === 'friends' && (
            <>
              {inbox.length > 0 && (
                <>
                  <SectionLabel>Gift Inbox</SectionLabel>
                  {inbox.map(gift => (
                    <div key={gift.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--ln-divider)',
                    }}>
                      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>
                        {gift.from} sent a {gift.kind} gift
                      </div>
                      <SmallButton
                        label={claimingId === gift.id ? 'Claiming…' : 'Claim'}
                        disabled={claimingId === gift.id}
                        onClick={() => handleClaim(gift.id)}
                      />
                    </div>
                  ))}
                </>
              )}
              <SectionLabel>Friends{data ? ` (${data.friends.length})` : ''}</SectionLabel>
              {data?.friends.length === 0 && (
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-muted)' }}>
                  No connections yet — browse crews in the Directory.
                </div>
              )}
              {data?.friends.map(f => (
                <FriendRow
                  key={f.friendshipId}
                  entry={f}
                  removable
                  onViewBase={() => handleViewBase(f.id)}
                  onSendGift={kind => handleSendGift(f.id, kind)}
                  sendingGiftKind={sendingGiftFor?.id === f.id ? sendingGiftFor.kind : null}
                  onRemove={() => handleRemove(f.friendshipId)}
                />
              ))}
            </>
          )}

          {!loading && !error && tab === 'requests' && (
            <>
              <SectionLabel>Incoming</SectionLabel>
              {data?.incoming.length === 0 && (
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-muted)' }}>No incoming requests.</div>
              )}
              {data?.incoming.map(r => (
                <div key={r.friendshipId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--ln-divider)',
                }}>
                  <FriendAvatar seed={r.id} size={32} />
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)', flex: 1 }}>{r.username}</div>
                  <SmallButton label="Accept" onClick={() => handleRespond(r.friendshipId, true)} />
                  <SmallButton label="Decline" tone="danger" onClick={() => handleRespond(r.friendshipId, false)} />
                </div>
              ))}
              <SectionLabel>Outgoing</SectionLabel>
              {data?.outgoing.length === 0 && (
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-muted)' }}>No outgoing requests.</div>
              )}
              {data?.outgoing.map(r => (
                <div key={r.friendshipId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--ln-divider)',
                }}>
                  <FriendAvatar seed={r.id} size={32} />
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)', flex: 1 }}>{r.username} — pending</div>
                  <SmallButton label="Cancel" tone="danger" onClick={() => handleRemove(r.friendshipId)} />
                </div>
              ))}
            </>
          )}

          {!loading && !error && tab === 'find' && (
            <>
              <SectionLabel>Player Directory</SectionLabel>
              <p className={styles.directoryCopy}>Every provisioned crew is listed here. New accounts appear under a temporary callsign until they choose one.</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleSearch() }}
                  placeholder="Filter crews by callsign"
                  style={{
                    flex: 1, fontFamily: 'var(--ln-font-body)', fontSize: 13, padding: '8px 10px',
                    borderRadius: 6, border: '1px solid var(--ln-hairline)', background: 'var(--ln-surface-2)',
                    color: 'var(--ln-text)',
                  }}
                />
                <SmallButton label="Search" onClick={handleSearch} />
              </div>
              {results.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--ln-divider)',
                }}>
                  <FriendAvatar seed={u.id} size={32} />
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)', flex: 1 }}>{u.username}</div>
                  <SmallButton label="Add" onClick={() => handleSendRequest(u.username)} />
                </div>
              ))}
              {results.length === 0 && (
                <div className={styles.emptyDirectory}>No crews match that callsign.</div>
              )}
            </>
          )}
        </>
      )}
        </div>
      </div>
      </div>
      </ScenePanel>
    </PageSurface>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--ln-surface-2)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: 'var(--ln-text)' }}>{value}</div>
    </div>
  )
}
