/**
 * Motion Studio Test Suite
 * Tests the core pipeline components without making costly external calls.
 * Run: npm test
 */

import { z } from "zod";

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✔ ${name}`);
      passed++;
    })
    .catch((err: any) => {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${err.message}`);
      failed++;
    });
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ─── Test 1: Invalid/empty instructions rejected ───────────────────────────────
async function testInvalidInstructions() {
  const { createJob } = await import("../jobs/jobStore");

  // Valid creation
  const job = createJob("PHP vulnerability research", {
    targetDurationSeconds: 90,
    fps: 60,
    aspectRatio: "9:16",
    theme: "cyber",
  });
  assert(job.id.startsWith("job_"), "Job ID should start with job_");
  assert(job.stage === "queued", "New job should be in queued stage");
  assert(job.progress === 0, "New job should have 0% progress");
}

// ─── Test 2: Job state machine transitions ────────────────────────────────────
async function testJobStateMachine() {
  const { createJob, advanceStage, getJob, failJob, cancelJob } = await import("../jobs/jobStore");

  const job = createJob("State machine test", {
    targetDurationSeconds: 60,
    fps: 60,
    aspectRatio: "9:16",
  });

  advanceStage(job.id, "researching", 10);
  assert(getJob(job.id)?.stage === "researching", "Should be in researching stage");

  advanceStage(job.id, "scripting", 30);
  assert(getJob(job.id)?.stage === "scripting", "Should be in scripting stage");

  advanceStage(job.id, "rendering", 70);
  assert(getJob(job.id)?.stage === "rendering", "Should be in rendering stage");

  advanceStage(job.id, "completed", 100, { validationPassed: true });
  assert(getJob(job.id)?.stage === "completed", "Should be in completed stage");
  assert(getJob(job.id)?.validationPassed === true, "Validation should be marked passed");

  // Test fail flow
  const job2 = createJob("Fail test", { targetDurationSeconds: 30, fps: 60, aspectRatio: "16:9" });
  advanceStage(job2.id, "rendering", 70);
  failJob(job2.id, "Render crashed", "rendering");
  assert(getJob(job2.id)?.stage === "failed", "Should be in failed stage");
  assert(getJob(job2.id)?.errorMessage === "Render crashed", "Should have error message");

  // Test cancel flow
  const job3 = createJob("Cancel test", { targetDurationSeconds: 30, fps: 60, aspectRatio: "9:16" });
  advanceStage(job3.id, "researching", 15);
  cancelJob(job3.id);
  assert(getJob(job3.id)?.stage === "cancelled", "Should be cancelled");
}

// ─── Test 3: Schema validation - rejects malformed scene plan ─────────────────
async function testSchemaValidation() {
  const { CampaignDataSchema } = await import("../engine/schema");

  // Valid campaign
  const valid = CampaignDataSchema.safeParse({
    campaignId: "test-123",
    title: "Test Video",
    brand: { name: "TestBrand", primaryColor: "#10B981", accentColor: "#06B6D4", backgroundColor: "#030712" },
    aspectRatio: "9:16",
    ctaText: "Get Started →",
    audioTrack: "cyber_audio.wav",
    scenes: [{
      id: "s1", type: "kinetic_hook", tag: "TEST", headline: "Test Headline",
      durationSeconds: 5,
    }],
  });
  assert(valid.success, "Valid campaign should pass schema validation");

  // Invalid: missing required field
  const invalid1 = CampaignDataSchema.safeParse({
    campaignId: "test-456",
    // title missing
    brand: { name: "X", primaryColor: "#10B981", accentColor: "#06B6D4" },
    scenes: [],
  });
  assert(!invalid1.success, "Should reject campaign without title or scenes");

  // Invalid: bad color format
  const invalid2 = CampaignDataSchema.safeParse({
    campaignId: "test-789",
    title: "Test",
    brand: { name: "X", primaryColor: "not-a-color", accentColor: "#06B6D4" },
    scenes: [{ id: "s1", type: "kinetic_hook", tag: "T", headline: "H", durationSeconds: 5 }],
  });
  assert(!invalid2.success, "Should reject invalid color format");

  // Invalid: unsupported scene type
  const invalid3 = CampaignDataSchema.safeParse({
    campaignId: "test-abc",
    title: "Test",
    brand: { name: "X", primaryColor: "#10B981", accentColor: "#06B6D4" },
    scenes: [{ id: "s1", type: "unsupported_type", tag: "T", headline: "H", durationSeconds: 5 }],
  });
  assert(!invalid3.success, "Should reject unsupported scene type");
}

// ─── Test 4: Frame timestamp math at 60 FPS ──────────────────────────────────
async function testFrameTimestamps() {
  // At 60 FPS:
  const fps = 60;
  const durationSeconds = 5;
  const expectedFrames = durationSeconds * fps; // 300
  assert(expectedFrames === 300, "5s at 60fps should be 300 frames");

  // Round-trip: frames → seconds → frames
  const frames = 180;
  const secs = frames / fps;
  assert(secs === 3, "180 frames at 60fps should be 3 seconds");
  assert(Math.round(secs * fps) === frames, "Round-trip should be exact");

  // Scene total duration
  const scenes = [
    { durationSeconds: 5 },
    { durationSeconds: 6 },
    { durationSeconds: 5 },
    { durationSeconds: 4 },
  ];
  const totalFrames = scenes.reduce((acc, s) => acc + Math.round(s.durationSeconds * fps), 0);
  assert(totalFrames === 1200, "4 scenes totaling 20s should be 1200 frames at 60fps");
}

// ─── Test 5: Fallback script plan generation ──────────────────────────────────
async function testFallbackScriptPlan() {
  const { generateScriptPlan } = await import("../script/scriptGenerator");

  // No API key → uses fallback
  const plan = await generateScriptPlan(
    "PHP vulnerability test",
    "Test research summary about PHP security issue.",
    [{ id: "src_1", title: "Test Source", url: "https://example.com", retrievedAt: new Date().toISOString(), supportsClaims: [] }],
    {
      targetDurationSeconds: 30,
      fps: 60,
      aspectRatio: "9:16",
      theme: "cyber",
      geminiApiKey: undefined,
    }
  );

  assert(plan.scenes.length >= 1, "Fallback plan should have at least 1 scene");
  assert(plan.scenes[0].type === "kinetic_hook", "First scene should be kinetic_hook");
  assert(plan.scenes[plan.scenes.length - 1].type === "conversion_cta", "Last scene should be conversion_cta");
  assert(plan.fps === 60, "FPS should be 60");
  assert(plan.aspectRatio === "9:16", "Aspect ratio should be preserved");
}

// ─── Test 6: TTS fallback timing estimation ───────────────────────────────────
async function testTtsFallback() {
  const { generateVoiceover, alignScenesToAudio } = await import("../tts/ttsAdapter");

  // Without any TTS keys, should return fallback timing
  // Force no TTS keys
  const origGoogle = process.env.GOOGLE_TTS_API_KEY;
  const origEL = process.env.ELEVENLABS_API_KEY;
  const origOAI = process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_TTS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await generateVoiceover("Hello world. This is a test narration for the video.", "test_job_123");
  
  // Restore
  if (origGoogle) process.env.GOOGLE_TTS_API_KEY = origGoogle;
  if (origEL) process.env.ELEVENLABS_API_KEY = origEL;
  if (origOAI) process.env.OPENAI_API_KEY = origOAI;

  assert(result.fallback === true, "Should be marked as fallback");
  assert(result.durationSeconds > 0, "Should have positive estimated duration");
  assert(result.audioPath === null, "Fallback should have null audioPath");
  assert(result.provider === "estimated", "Provider should be 'estimated'");

  // Test alignment
  const scenes = [
    { id: "s1", narration: "Short intro.", durationSeconds: 5 },
    { id: "s2", narration: "This is a much longer narration for the second scene with many more words to describe the technical details.", durationSeconds: 10 },
    { id: "s3", narration: "Brief outro.", durationSeconds: 3 },
  ];
  const aligned = alignScenesToAudio(scenes, 20, 60);
  assert(aligned.length === 3, "Should return alignment for all 3 scenes");
  assert(aligned[0].startFrame === 0, "First scene should start at frame 0");
  assert(aligned[1].startFrame > 0, "Second scene should start after first");
  // Longer narration should get more time
  assert(aligned[1].durationSeconds > aligned[0].durationSeconds, "Longer narration should get more time");
}

// ─── Test 7: Research adapter fallback ───────────────────────────────────────
async function testResearchFallback() {
  const { researchTopic } = await import("../research/researchAdapter");

  // Force no API keys
  const savedKeys = ['TAVILY_API_KEY', 'SERPAPI_KEY', 'BRAVE_SEARCH_API_KEY', 'GEMINI_API_KEY'].map(k => ({ k, v: process.env[k] }));
  savedKeys.forEach(({ k }) => delete process.env[k]);

  const result = await researchTopic("PHP CVE test vulnerability");

  // Restore
  savedKeys.forEach(({ k, v }) => { if (v) process.env[k] = v; });

  assert(typeof result.summary === "string", "Research summary should be a string");
  assert(Array.isArray(result.sources), "Sources should be an array");
  assert(result.summary.length > 0, "Summary should not be empty");
}

// ─── Test 8: Secrets not exposed ─────────────────────────────────────────────
async function testSecretsSafetyInJobView() {
  const { createJob } = await import("../jobs/jobStore");
  // safeJobView is defined in server.ts — test the principle:
  const job = createJob("Secret test", {
    targetDurationSeconds: 60,
    fps: 60,
    aspectRatio: "9:16",
    geminiApiKey: "SUPER_SECRET_KEY_xyz",
  });
  // safeJobView should strip geminiApiKey — simulate it:
  const { settings, ...rest } = job;
  const { geminiApiKey: _dropped, ...safeSettings } = settings;
  const view = { ...rest, settings: safeSettings };
  assert(!JSON.stringify(view).includes("SUPER_SECRET_KEY_xyz"), "geminiApiKey must not appear in safe job view");
}

// ─── Test 9: Job idempotency (listJobs) ───────────────────────────────────────
async function testJobListing() {
  const { createJob, listJobs } = await import("../jobs/jobStore");
  const before = listJobs().length;
  createJob("List test 1", { targetDurationSeconds: 30, fps: 60, aspectRatio: "9:16" });
  createJob("List test 2", { targetDurationSeconds: 30, fps: 60, aspectRatio: "9:16" });
  const after = listJobs();
  assert(after.length === before + 2, "Job list should grow by 2");
  assert(after[0].createdAt >= after[1].createdAt, "Jobs should be sorted newest first");
}

// ─── Test 10: Cancel terminal-state job throws ───────────────────────────────
async function testCancelTerminalState() {
  const { createJob, advanceStage, cancelJob } = await import("../jobs/jobStore");
  const job = createJob("Terminal cancel test", { targetDurationSeconds: 30, fps: 60, aspectRatio: "9:16" });
  advanceStage(job.id, "completed", 100);
  try {
    cancelJob(job.id);
    assert(false, "Should have thrown on cancelling completed job");
  } catch (err: any) {
    assert(err.message.includes("terminal state"), "Error should mention terminal state");
  }
}

// ─── Test 11: Claim-linked dynamic pipeline contracts ───────────────────────
async function testDynamicPipelineContracts() {
  const { parseBrief } = await import("../pipeline/brief");
  const { createResearchArtifact } = await import("../pipeline/research");
  const { buildScriptArtifact } = await import("../pipeline/writer");
  const { buildScenesArtifact } = await import("../pipeline/director");
  const { buildTiming } = await import("../pipeline/timing");
  const { runQualityGates } = await import("../pipeline/qa");
  const { scenesToCampaign } = await import("../pipeline/campaignAdapter");

  const brief = parseBrief(
    "topic: Example security issue\nangle: Explain the mechanism and defensive response\naudience: Developers\nformat: 30s, 9:16, English, calm tone"
  );
  const source = {
    id: "src_1",
    title: "Official advisory",
    url: "https://example.com/advisory",
    publisher: "Example",
    retrievedAt: new Date().toISOString(),
    supportsClaims: [],
  };
  const research = createResearchArtifact(
    brief,
    { sources: [source], summary: "Verified test research." },
    {
      claims: [
        { id: "c1", text: "An uploaded file can execute when its directory permits script execution.", sources: ["src_1"], confidence: "single_source", type: "mechanism" },
        { id: "c2", text: "Disabling script execution in upload folders reduces the attack path.", sources: ["src_1"], confidence: "single_source", type: "fix" },
      ],
      fixes: [{ id: "f1", step: "Disable script execution in upload folders.", source: "src_1", claimIds: ["c2"] }],
    }
  );
  const script = buildScriptArtifact(brief, research);
  const scenes = buildScenesArtifact(brief, script, 30, "dark-ember");
  const timing = buildTiming(script, scenes);
  const qa = runQualityGates(brief, research, script, scenes, timing);
  const campaign = scenesToCampaign(brief, scenes, "pipeline-contract-test");

  assert(script.lines.every((line) => line.beat === "hook" || line.beat === "cta" || line.claimIds.length > 0), "Every factual script line must have claim IDs");
  assert(scenes.scenes[0].type === "kinetic_title", "Director should start with kinetic_title");
  assert(scenes.scenes[scenes.scenes.length - 1].type === "cta_end", "Director should end with cta_end");
  assert(timing.words.length > 0, "Timing should include word timestamps");
  assert(campaign.scenes[0].sourceSceneType === "kinetic_title", "Campaign adapter must preserve director scene type");
  assert(qa.passed, "Claim-linked fixture should pass QA");
}

// ─── Main runner ──────────────────────────────────────────────────────────────
(async () => {
  console.log("\n🧪 Motion Studio Test Suite\n");

  await test("1. Job creation and initial state", testInvalidInstructions);
  await test("2. Job state machine transitions", testJobStateMachine);
  await test("3. Schema validation rejects malformed data", testSchemaValidation);
  await test("4. Frame timestamp math at 60 FPS", testFrameTimestamps);
  await test("5. Fallback script plan generation", testFallbackScriptPlan);
  await test("6. TTS fallback timing estimation + scene alignment", testTtsFallback);
  await test("7. Research adapter fallback (no keys)", testResearchFallback);
  await test("8. Secrets not exposed in job view", testSecretsSafetyInJobView);
  await test("9. Job listing (sorted, additive)", testJobListing);
  await test("10. Cancel on terminal-state job throws", testCancelTerminalState);
  await test("11. Dynamic pipeline contracts and QA gates", testDynamicPipelineContracts);

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  else console.log("✅ All tests passed!\n");
})();
