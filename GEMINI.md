# Gemini CLI Guidelines

## Deferred Feature Tracking
- **Scan Requirement:** At the start of every session or when discussing project roadmap/sprints, I MUST scan the `.knowns/` directory for any "Spec" files or documents containing **"Deferred"** notes.
- **Trigger Logic:** 
    - If a deferred item has a specific revisit date or sprint (e.g., "Revisit in 2 weeks" or "Sprint 2"), I MUST compare this against the current date/context.
    - If the criteria are met, I MUST proactively surface these items in the chat to ensure they are not forgotten.
- **Persistence:** When deferring a new idea or mechanic, I MUST create a corresponding spec sheet in `.knowns/tasks/` or `.knowns/prompts/` with a clear "Status: Deferred" header and "Revisit" criteria.

## Engineering Standards
- Adhere to the Star Sailors ecosystem architecture: shared Supabase instance, unified player profiles, and cross-game XP.
- Prioritize Godot-React Native bridge stability and efficient state synchronization.
