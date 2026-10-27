# Motion video agent rules (for agy / Claude Code)

Goal: turn the user's idea into a Claude-style vertical motion video.

1. Run: `npx tsx make.ts "<idea>"`. This generates the campaign JSON, validates it
   with src/schema.ts, and renders out/<name>.mp4.
2. Edit only campaigns/*.json. Never edit src/ unless the user asks.
3. After rendering, check the output. If text overflows or timing feels rushed,
   fix the JSON (shorter text, more seconds) and re-render. Max 2 re-renders.
4. Use a quick preview first: add `--scale=0.5` to the remotion render command.
5. Style: warm clay accent, serif headlines, mono terminal text, one idea per
   scene, calm easing, no bounce.
6. Report the output path when done.
