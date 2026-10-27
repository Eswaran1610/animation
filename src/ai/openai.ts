export interface OpenAIUrlCitation {
  url: string;
  title: string;
}

export interface OpenAIResponse {
  text: string;
  citations: OpenAIUrlCitation[];
}

function responseText(payload: any): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || [])
    .flatMap((item: any) => item.content || [])
    .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n");
}

function responseCitations(payload: any): OpenAIUrlCitation[] {
  const found = new Map<string, OpenAIUrlCitation>();
  for (const item of payload.output || []) {
    for (const source of item.action?.sources || []) {
      if (source.url) found.set(source.url, { url: source.url, title: source.title || source.url });
    }
    for (const part of item.content || []) {
      for (const annotation of part.annotations || []) {
        const url = annotation.url || annotation.url_citation?.url;
        if (url) found.set(url, { url, title: annotation.title || annotation.url_citation?.title || url });
      }
    }
  }
  return [...found.values()];
}

export async function openAIResponses(
  input: string,
  options: { webSearch?: boolean; maxOutputTokens?: number } = {},
): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const body: any = {
    model,
    input,
    max_output_tokens: options.maxOutputTokens || 4000,
  };
  if (options.webSearch) body.tools = [{ type: "web_search", search_context_size: "low" }];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const details = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
    throw new Error(`OpenAI API ${response.status}: ${details}`);
  }
  const payload: any = await response.json();
  return { text: responseText(payload), citations: responseCitations(payload) };
}
