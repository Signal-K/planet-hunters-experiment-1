# Portrait Base draws at full scale and pans (2026-11-10)

On a phone in portrait the Base is drawn at the full phone kit scale (2), so the structures stand tall, and the camera pans along the strip by dragging. It starts centred on the pad. Fitting four structures across 390pt made them too small. This replaces the "phones keep the Base still" rule (SSL-787) for portrait only. Landscape phones stay fixed.

The ground line sits at 46% from the bottom on portrait phones so the sky takes under half the screen. Persistent UI (the data-ready chip, the orbital tag) is fixed to the screen, not placed in the pannable world.
