/** Minimal, dependency-free website research for a user-supplied public URL. */
export type WebsiteBrief = {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
  text: string;
};

const URL_PATTERN = /(?:https?:\/\/[^\s<>"]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s<>"]*)?)/i;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const decode = (value: string) => value.replace(/&quot;/gi, '"').replace(/&amp;/gi, "&").replace(/&#39;/gi, "'");

const meta = (html: string, name: string) => {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  return patterns.map((pattern) => pattern.exec(html)?.[1]).find(Boolean);
};

/** Fetches only explicit http(s) URLs; private/local hosts are never fetched. */
export const researchWebsite = async (content: string): Promise<WebsiteBrief | undefined> => {
  const candidate = content.match(URL_PATTERN)?.[0];
  if (!candidate) return undefined;

  let url: URL;
  try {
    const rawUrl = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }
  if (!/^https?:$/.test(url.protocol) || /^(localhost|0\.0\.0\.0|127\.|::1$)/i.test(url.hostname)) return undefined;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": "MotionStudioWebsiteBrief/1.0" },
  });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
  const html = await response.text();
  const withoutNoise = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  const visibleText = clean(withoutNoise.replace(/<[^>]+>/g, " ")).slice(0, 3_000);
  const title = decode(meta(html, "og:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = decode(meta(html, "og:description") ?? meta(html, "description") ?? "");
  const image = meta(html, "og:image");

  return {
    url: url.toString(),
    title: clean(title) || undefined,
    description: clean(description) || undefined,
    siteName: clean(meta(html, "og:site_name") ?? "") || undefined,
    image: image ? new URL(image, url).toString() : undefined,
    text: visibleText,
  };
};

export const websiteBriefForPrompt = (brief: WebsiteBrief) => JSON.stringify({
  url: brief.url,
  title: brief.title,
  siteName: brief.siteName,
  description: brief.description,
  representativeImage: brief.image,
  visiblePageText: brief.text,
}, null, 2);
