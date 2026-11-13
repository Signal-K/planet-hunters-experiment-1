# Selling surplus to a client at affinity level 3 (2026-11-12)

From Liam (1 Nov, SSL-734): once a player reaches a high enough affinity with a client, they can sell surplus mined minerals to that client. The ticket's open questions were answered with these defaults. Liam to confirm or change them.

| Question | Default |
| --- | --- |
| Which affinity tier unlocks it? | Affinity level 3, which is ten jobs for that client. |
| A premium over the Exchange? | Yes, 10% over what that client-preferred sale would fetch at the Exchange. |
| A per-client demand list? | The client's mineral preferences. It buys nothing else. |
| How much? | Up to 10 units a day per client, so the Exchange stays the main market. |
| Where is it sold? | On the client's card, on the Mission Board's Clients tab. |
| Research node or affinity alone? | Affinity alone. A sale is an Exchange-sale research stamp, so it counts toward the Trader path. |

A direct sale never reaches the open market, so it does not push the Exchange price down.

Code: `web/lib/client-sales.ts`.
