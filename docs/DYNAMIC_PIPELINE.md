# Dynamic AI Motion Video Pipeline

The pipeline follows the plan document’s data contracts:

`brief -> research claims -> script -> scene spec -> timing/captions -> QA -> Remotion`

AI or search providers produce structured data. The renderer only consumes validated scene data; video-specific copy does not live in the React components.

## Run it

The localhost UI uses this claim-linked flow by default. Set `GEMINI_API_KEY` and
optionally `ELEVENLABS_API_KEY` (preferred) or `OPENAI_API_KEY` for a more natural voice.
Without a cloud voice key, the UI uses local `espeak-ng` so the MP4 still contains audible narration. Run:

```bash
npm run ui
```

Open `http://localhost:4000`, enter the four-line brief, and click **Research & Generate Video**.
The job panel shows research sources, the generated narration, voice provider, and the final MP4.

Start with a four-line brief and a claim-linked `research.json`:

```bash
npx tsx pipeline.ts briefs/php-shell.example.txt --research=/path/to/research.json
```

Add `--render` to render the validated campaign:

```bash
npx tsx pipeline.ts briefs/php-shell.example.txt \
  --research=/path/to/research.json \
  --render --fps=30 --theme=dark-ember
```

Artifacts are written to `out/<topic-slug>/`:

- `brief.json`
- `research.json`
- `script.json`
- `scenes.json`
- `timing.json`
- `captions.srt`
- `sources.md`
- `qa.json`
- `campaign.json`
- `final.mp4` and `preview.png` when `--render` is used

## Research contract

`research.json` must contain atomic claims with source IDs. Every factual script line must reference a claim, and every claim must reference at least one source. Claims marked `single_source` pass with a QA warning so a human can review them before publishing.

The research stage generates ten focused queries when no research artifact is supplied. If a Gemini key is available, it also extracts structured claims from the retrieved material. Without verified claims, the writer stops instead of inventing facts.

## QA gates

The pipeline rejects:

- missing claim or source links;
- text over the layout limits;
- scenes outside 2.5–6 seconds;
- total duration outside 5% of the brief;
- repeated scene types back to back or more than three times;
- executable exploit examples in security-topic scene props.
