# Weekly research passport

SSL-849 makes the main Community research view a weekly passport. Monday–Sunday are seven stamp places. The first research action in a UTC day determines its ink; later actions keep their existing task stamps and other rewards. New saves retain that first action and its time, and cross-device merges keep the earlier action. Older pages use the first saved kind when no timestamp exists.

Implementation choices: the shared goal is 100 player-days per UTC week (one contribution per player per day, across all research stamp kinds). Saved contributions are counted on the authenticated PocketBase passport endpoint, then retained in a private weekly ledger so stale saves cannot erase them. When the goal is reached, every player with at least one confirmed stamp for that week earns its part. Local stamps awaiting the outbox may preview progress but cannot grant a part. An eligible player returning later receives past rewards too.

Each week has a distinct permanent issue ID. Issues rotate through existing tier-2 engine, cargo, laser, fuel and booster mechanics/art, identified by the week; they are free to refit and never create cash refunds. Pages begin with the first full research week of October, 5 October 2026, and stay in the passport archive. The workshop accepts only earned issues.

This supersedes the provisional SSL-850 rule that granted new parts from personal path milestones 2/4/5. Parts explicitly stored as earned remain owned; paths still grant their fragments and badge. Existing monthly bonuses, events, votes, consensus and paths remain behind Activities & community. The passport is the default page and does not require choosing a path.

The ticket explicitly defers iOS until after web. The web/authenticated backend implementation ships first; no native passport UI is claimed here.
