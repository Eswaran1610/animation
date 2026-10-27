import { researchTopic, ResearchResult } from "../research/researchAdapter";
import { openAIResponses } from "../ai/openai";
import { Brief, ClaimSchema, ResearchArtifact, ResearchArtifactSchema, ResearchSource } from "./schema";

export function generateResearchQueries(brief: Brief): string[] {
  const queries = [
    `${brief.topic} official advisory`,
    `${brief.topic} how it works mechanism`,
    `${brief.topic} who is affected`,
    `${brief.topic} detection indicators`,
    `${brief.topic} mitigation fix official documentation`,
    `${brief.topic} timeline disclosure patch`,
    `${brief.topic} CVE NVD CERT`,
    `${brief.topic} vendor security bulletin`,
    `${brief.topic} security researcher analysis`,
    `${brief.topic} impact statistics`,
  ];
  return [...new Set(queries)].slice(0, 15);
}

function normalizeSources(result: ResearchResult): ResearchSource[] {
  return result.sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    publicationDate: source.publicationDate,
    retrievedAt: source.retrievedAt,
    supportsClaims: source.supportsClaims || [],
  }));
}

async function fetchPageExcerpt(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "MotionStudioResearch/1.0" } });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    const raw = await response.text();
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&amp;|&quot;|&#39;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 4000) || null;
  } catch {
    return null;
  }
}

export function createResearchArtifact(
  brief: Brief,
  result: ResearchResult,
  structured: Partial<ResearchArtifact> = {}
): ResearchArtifact {
  const sourceMap = new Map(normalizeSources(result).map((source) => [source.id, source]));
  const claims = structured.claims || [];
  const sources = [...sourceMap.values()].map((source) => ({ ...source, supportsClaims: [...source.supportsClaims] }));

  for (const claim of claims) {
    for (const sourceId of claim.sources) {
      const source = sources.find((candidate) => candidate.id === sourceId);
      if (source && !source.supportsClaims.includes(claim.id)) source.supportsClaims.push(claim.id);
    }
  }

  return ResearchArtifactSchema.parse({
    generatedAt: new Date().toISOString(),
    queries: structured.queries?.length ? structured.queries : generateResearchQueries(brief),
    summary: structured.summary ?? result.summary,
    sources,
    claims,
    stats: structured.stats || [],
    timeline: structured.timeline || [],
    fixes: structured.fixes || [],
  });
}

export async function researchBrief(brief: Brief, geminiApiKey?: string): Promise<ResearchArtifact> {
  const requestedQueryCount = Number(process.env.GEMINI_RESEARCH_QUERIES || 6);
  const queries = generateResearchQueries(brief).slice(0, Math.min(15, Math.max(3, requestedQueryCount)));
  const results: ResearchResult[] = [];
  // Keep Gemini requests below burst/rate limits. The previous Promise.all
  // launched ten grounded searches at once, which easily exhausted free-tier
  // quotas before claim extraction even started.
  for (let index = 0; index < queries.length; index += 2) {
    const batch = queries.slice(index, index + 2);
    const batchResults = await Promise.all(
      batch.map((query) => researchTopic(query, geminiApiKey, { preferGemini: Boolean(geminiApiKey || process.env.GEMINI_API_KEY) }))
    );
    results.push(...batchResults);
    if (index + 2 < queries.length) await new Promise((resolve) => setTimeout(resolve, 350));
  }
  const sourceByUrl = new Map<string, ResearchSource>();
  const summaries: string[] = [];
  for (const result of results) {
    summaries.push(result.summary);
    for (const source of normalizeSources(result)) {
      if (!sourceByUrl.has(source.url)) sourceByUrl.set(source.url, source);
    }
  }

  const excerpts = await Promise.all(
    [...sourceByUrl.values()].slice(0, 30).map(async (source) => ({
      source,
      excerpt: await fetchPageExcerpt(source.url),
    }))
  );
  const pageMaterial = excerpts
    .filter((item) => item.excerpt)
    .map((item) => `\nSOURCE ${item.source.id} (${item.source.title}):\n${item.excerpt}`)
    .join("\n")
    .slice(0, 30000);

  const merged: ResearchResult = {
    sources: [...sourceByUrl.values()],
    summary: `${summaries.filter(Boolean).join("\n\n")}\n\nFULL PAGE MATERIAL${pageMaterial}`.slice(0, 40000),
  };
  const extracted = geminiApiKey || process.env.GEMINI_API_KEY
    ? await extractClaimsWithGemini(brief, merged, geminiApiKey || process.env.GEMINI_API_KEY || "")
    : process.env.OPENAI_API_KEY
      ? await extractClaimsWithOpenAI(brief, merged)
      : {};
  return createResearchArtifact(brief, merged, { ...extracted, queries });
}

async function extractClaimsWithOpenAI(
  brief: Brief,
  result: ResearchResult,
): Promise<Partial<ResearchArtifact>> {
  try {
    const sourceList = result.sources.map((source) => `- ${source.id}: ${source.title} (${source.url})`).join("\n");
    const response = await openAIResponses(`Extract only verifiable atomic claims for this video brief. Never invent facts, dates, numbers, or URLs. Every claim must cite exact source IDs from the list. Return JSON only with this shape: {"claims":[{"id":"c1","text":"...","sources":["source-id"],"date":"","confidence":"high|medium|low|single_source","type":"context|mechanism|impact|indicator|fix|timeline|other"}],"stats":[],"timeline":[],"fixes":[]}.

Brief topic: ${brief.topic}
Angle: ${brief.angle}
Research:
${result.summary}

Sources:
${sourceList}`, { maxOutputTokens: 5000 });
    const parsed = JSON.parse(response.text.replace(/```json|```/g, "").trim());
    const validSourceIds = new Set(result.sources.map((source) => source.id));
    const claims = Array.isArray(parsed.claims)
      ? parsed.claims
        .map((claim: unknown) => ClaimSchema.safeParse(claim))
        .filter((claim: any) => claim.success)
        .map((claim: any) => claim.data)
        .filter((claim: any) => claim.sources.every((sourceId: string) => validSourceIds.has(sourceId)))
      : [];
    return {
      claims,
      stats: Array.isArray(parsed.stats) ? parsed.stats : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
    };
  } catch (error: any) {
    throw new Error(`OpenAI claim extraction failed: ${error.message?.slice(0, 240)}`);
  }
}

/**
 * Turns retrieved source material into atomic, source-linked records.
 * This is deliberately separate from the writer: prose generation never gets
 * access to an unstructured research response as its only source of truth.
 */
async function extractClaimsWithGemini(
  brief: Brief,
  result: ResearchResult,
  apiKey: string,
): Promise<Partial<ResearchArtifact>> {
  try {
    const sourceList = result.sources.map((source) => `- ${source.id}: ${source.title} (${source.url})`).join("\n");
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Extract only verifiable atomic claims for this brief. Never invent facts, dates, numbers, or URLs. Every claim must cite one or more source IDs from the list. Flag confidence as single_source when only one source supports it.\n\nBrief topic: ${brief.topic}\nAngle: ${brief.angle}\nResearch material:\n${result.summary}\n\nSources:\n${sourceList}\n\nReturn JSON only: {"claims":[{"id":"c1","text":"...","sources":["source-id"],"date":"...","confidence":"high|medium|low|single_source","type":"context|mechanism|impact|indicator|fix|timeline|other"}],"stats":[],"timeline":[],"fixes":[]}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 5000 },
      }),
    });
    if (!response.ok) {
      const details = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
      console.error(`[Research][Claims] ${response.status} using ${model}: ${details}`);
      if ([400, 401, 403, 429].includes(response.status)) {
        throw new Error(`Gemini claim extraction API ${response.status}: ${details}`);
      }
      return {};
    }
    const payload: any = await response.json();
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      console.error(`[Research][Claims] Empty Gemini response using ${model}.`);
      return {};
    }
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const validSourceIds = new Set(result.sources.map((source) => source.id));
    const claims = Array.isArray(parsed.claims)
      ? parsed.claims
        .map((claim: unknown) => ClaimSchema.safeParse(claim))
        .filter((claim: any) => claim.success)
        .map((claim: any) => claim.data)
        .filter((claim: any) => claim.sources.every((sourceId: string) => validSourceIds.has(sourceId)))
      : [];
    return {
      claims,
      stats: Array.isArray(parsed.stats) ? parsed.stats : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Gemini claim extraction API")) throw error;
    console.error(`[Research][Claims] Could not parse Gemini claims: ${error instanceof Error ? error.message.slice(0, 160) : "unknown error"}`);
    return {};
  }
}
