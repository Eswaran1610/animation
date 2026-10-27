/**
 * Research adapter: fetches current, factual information about a topic.
 *
 * Priority:
 *   1. Tavily Search API  (TAVILY_API_KEY)
 *   2. SerpAPI            (SERPAPI_KEY)
 *   3. Brave Search API   (BRAVE_SEARCH_API_KEY)
 *   4. DuckDuckGo instant-answer (no key needed, limited)
 *   5. Gemini grounded search    (GEMINI_API_KEY with google search grounding)
 *
 * Returns structured SourceReference[] + a plain-text research summary.
 * Never invents URLs, CVEs, or dates.
 */

import { SourceReference } from "../jobs/jobStore";
import { openAIResponses } from "../ai/openai";

export interface ResearchResult {
  sources: SourceReference[];
  summary: string;
}

let sourceCounter = 0;
function makeSourceId() {
  return `src_${++sourceCounter}_${Date.now()}`;
}

// ─── Tavily ──────────────────────────────────────────────────────────────────
async function searchTavily(
  query: string,
  apiKey: string
): Promise<ResearchResult | null> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: true,
        max_results: 8,
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const retrievedAt = new Date().toISOString();
    const sources: SourceReference[] = (data.results || []).map((r: any) => ({
      id: makeSourceId(),
      title: r.title || "Untitled",
      url: r.url,
      publisher: new URL(r.url).hostname.replace("www.", ""),
      publicationDate: r.published_date || undefined,
      retrievedAt,
      supportsClaims: [],
    }));
    const summary =
      data.answer ||
      sources
        .slice(0, 4)
        .map((s) => s.title)
        .join(". ");
    return { sources, summary };
  } catch {
    return null;
  }
}

// ─── SerpAPI ─────────────────────────────────────────────────────────────────
async function searchSerpApi(
  query: string,
  apiKey: string
): Promise<ResearchResult | null> {
  try {
    const url = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=8&hl=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();
    const retrievedAt = new Date().toISOString();
    const organic = data.organic_results || [];
    const sources: SourceReference[] = organic.map((r: any) => ({
      id: makeSourceId(),
      title: r.title || "Untitled",
      url: r.link,
      publisher: r.displayed_link || new URL(r.link).hostname,
      retrievedAt,
      supportsClaims: [],
    }));
    const summary =
      data.answer_box?.answer ||
      data.knowledge_graph?.description ||
      organic
        .slice(0, 3)
        .map((r: any) => r.snippet)
        .join(" ");
    return { sources, summary };
  } catch {
    return null;
  }
}

// ─── Brave Search ─────────────────────────────────────────────────────────────
async function searchBrave(
  query: string,
  apiKey: string
): Promise<ResearchResult | null> {
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const retrievedAt = new Date().toISOString();
    const webResults = data.web?.results || [];
    const sources: SourceReference[] = webResults.map((r: any) => ({
      id: makeSourceId(),
      title: r.title || "Untitled",
      url: r.url,
      publisher: r.meta_url?.hostname || new URL(r.url).hostname,
      retrievedAt,
      supportsClaims: [],
    }));
    const summary = webResults
      .slice(0, 4)
      .map((r: any) => r.description || r.title)
      .join(" ");
    return { sources, summary };
  } catch {
    return null;
  }
}

// ─── DuckDuckGo instant answer (no key) ───────────────────────────────────────
async function searchDDG(query: string): Promise<ResearchResult | null> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`,
      { headers: { "User-Agent": "MotionStudio/1.0" } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const retrievedAt = new Date().toISOString();
    const sources: SourceReference[] = [];
    const summary = data.Abstract || data.Answer || "";
    if (data.AbstractURL && data.AbstractSource) {
      sources.push({
        id: makeSourceId(),
        title: data.AbstractSource,
        url: data.AbstractURL,
        publisher: data.AbstractSource,
        retrievedAt,
        supportsClaims: [],
      });
    }
    for (const rel of data.RelatedTopics?.slice(0, 5) || []) {
      if (rel.FirstURL) {
        sources.push({
          id: makeSourceId(),
          title: rel.Text?.slice(0, 80) || "Related",
          url: rel.FirstURL,
          publisher: "duckduckgo.com",
          retrievedAt,
          supportsClaims: [],
        });
      }
    }
    return summary ? { sources, summary } : null;
  } catch {
    return null;
  }
}

// ─── Gemini with Google Search grounding ─────────────────────────────────────
async function searchViaGemini(
  query: string,
  apiKey: string,
  strict = false,
): Promise<ResearchResult | null> {
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Research the following topic thoroughly and provide a structured summary with factual information. Include relevant statistics, key facts, and important context. Topic: ${query}`,
              },
            ],
          },
        ],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.1 },
      }),
    });
    if (!res.ok) {
      const details = (await res.text()).replace(/\s+/g, " ").slice(0, 300);
      console.error(`[Research][Gemini] ${res.status} using ${model}: ${details}`);
      if (strict && [400, 401, 403, 429].includes(res.status)) {
        throw new Error(`Gemini research API ${res.status}: ${details}`);
      }
      return null;
    }
    const data: any = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join("") || "";
    const groundingMetadata = candidate?.groundingMetadata;
    const retrievedAt = new Date().toISOString();

    const sources: SourceReference[] = [];
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            id: makeSourceId(),
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
            publisher: new URL(chunk.web.uri).hostname.replace("www.", ""),
            retrievedAt,
            supportsClaims: [],
          });
        }
      }
    }

    if (!text) {
      console.error(`[Research][Gemini] Empty response using ${model} for query: ${query.slice(0, 80)}`);
      return null;
    }
    if (!sources.length) console.warn(`[Research][Gemini] Text returned without grounding sources for query: ${query.slice(0, 80)}`);
    return { sources, summary: text.slice(0, 3000) };
  } catch (error) {
    if (strict) throw error;
    return null;
  }
}

async function searchViaOpenAI(query: string): Promise<ResearchResult | null> {
  try {
    const response = await openAIResponses(
      `Research this topic for a factual video. Return a concise evidence-based summary with key facts, dates, mechanisms, impact, and mitigations. Do not invent facts. Topic: ${query}`,
      { webSearch: true, maxOutputTokens: 2500 },
    );
    const retrievedAt = new Date().toISOString();
    const sources: SourceReference[] = response.citations.map((citation, index) => ({
      id: `openai_src_${Date.now()}_${index}`,
      title: citation.title,
      url: citation.url,
      publisher: new URL(citation.url).hostname.replace("www.", ""),
      retrievedAt,
      supportsClaims: [],
    }));
    return response.text ? { sources, summary: response.text.slice(0, 5000) } : null;
  } catch (error: any) {
    console.error(`[Research][OpenAI] ${error.message?.slice(0, 300)}`);
    return null;
  }
}

// ─── Main research function ────────────────────────────────────────────────────
export async function researchTopic(
  topic: string,
  geminiApiKey?: string,
  options: { preferGemini?: boolean } = {}
): Promise<ResearchResult> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const serpKey = process.env.SERPAPI_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  console.log(`[Research] Searching for: "${topic.slice(0, 60)}..."`);

  // Try providers in priority order
  let result: ResearchResult | null = null;

  // The claim-linked pipeline explicitly requests Gemini grounding first. This
  // keeps the web research provider deterministic for the UI workflow while
  // preserving the older provider fallback behavior for existing callers.
  if (options.preferGemini && gemKey) {
    console.log("[Research] Trying Gemini grounded search first...");
    result = await searchViaGemini(topic, gemKey, true);
    if (result) console.log(`[Research] Gemini grounding returned ${result.sources.length} sources.`);
  }

  if (openaiKey && !result && !gemKey) {
    console.log("[Research] Trying OpenAI web search...");
    result = await searchViaOpenAI(topic);
    if (result) console.log(`[Research] OpenAI returned ${result.sources.length} sources.`);
  }

  if (tavilyKey && !result) {
    console.log("[Research] Trying Tavily...");
    result = await searchTavily(topic, tavilyKey);
    if (result) console.log(`[Research] Tavily returned ${result.sources.length} sources.`);
  }

  if (serpKey && !result) {
    console.log("[Research] Trying SerpAPI...");
    result = await searchSerpApi(topic, serpKey);
    if (result) console.log(`[Research] SerpAPI returned ${result.sources.length} sources.`);
  }

  if (braveKey && !result) {
    console.log("[Research] Trying Brave Search...");
    result = await searchBrave(topic, braveKey);
    if (result) console.log(`[Research] Brave returned ${result.sources.length} sources.`);
  }

  if (gemKey && !result) {
    console.log("[Research] Trying Gemini grounded search...");
    result = await searchViaGemini(topic, gemKey);
    if (result) console.log(`[Research] Gemini grounding returned ${result.sources.length} sources.`);
  }

  // DuckDuckGo as last resort
  if (!result) {
    console.log("[Research] Trying DuckDuckGo instant answer...");
    result = await searchDDG(topic);
  }

  // Final fallback: return empty result with clear indication
  if (!result) {
    console.warn("[Research] All providers failed. Using topic-only research.");
    result = {
      sources: [],
      summary: `Topic under research: ${topic}. Note: No external search provider was available. Configure TAVILY_API_KEY, SERPAPI_KEY, BRAVE_SEARCH_API_KEY, or GEMINI_API_KEY for live web research.`,
    };
  }

  return result;
}
