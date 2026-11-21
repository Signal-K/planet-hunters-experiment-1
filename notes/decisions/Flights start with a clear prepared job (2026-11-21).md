# Flights start with a clear prepared job

Liam, 21 November 2026: Haphazard Martians' short feedback cycles and being able to jump into a new level with everything there are the reference for improving Landnam's guidance.

A player should see what to do next, what the job asks for, and an action that takes them there. Repeating destination and equipment decisions between short runs breaks that rhythm. Keep feedback close to the action, and keep a next attempt easy to start.

SSL-873 applies the first slice to the existing Base:

- One persistent action resumes a live flight, continues an unfinished setup, or prepares a short reachable mining contract. It never replaces an unfinished job.
- The recommendation comes from the normal mission board's eligible list. Prefer the smallest single-stop mineral order, choose its feasible destination, and use normal suggested equipment.
- Show the job, destination and units before accepting. The launch review remains editable. Paid vehicles and launch still require the normal explicit actions; recommendations grant no money, unlocks or equipment.
- Missing pads point to building; worn pads on web point to the existing service confirmation. iOS does not yet implement pad wear/service, and keeps its existing rules.
- This is an actual Base control, not a welcome-back or repeating guidance popup. It steps aside for placement, homecoming, menus and visible telescope callouts. The first mining coach points to the same control.

Web fixtures: `hub` (`m1-hub`) for a first mission and `hub-first-run` for Free Ops. Native: `hub-phone`. This does not introduce story chapters or complete SSL-870's separate mission-flow and art reset.
