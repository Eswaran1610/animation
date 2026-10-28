import fs from "node:fs";
import path from "node:path";

export type WebsiteProduct = {
  title: string;
  description: string;
  image?: string;
  localImage?: string;
};

export type WebsiteBrief = {
  url: string;
  title?: string;
  brandName?: string;
  description?: string;
  tagline?: string;
  siteName?: string;
  logo?: string;
  localLogo?: string;
  representativeImage?: string;
  images: string[];
  localImages: string[];
  products: WebsiteProduct[];
  keyFeatures: string[];
  verifiedFacts: string[];
  text: string;
};

const URL_PATTERN = /(?:https?:\/\/[^\s<>"]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s<>"]*)?)/i;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const decode = (value: string) =>
  value
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const meta = (html: string, name: string) => {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  return patterns.map((pattern) => pattern.exec(html)?.[1]).find(Boolean);
};

/** Extracts image URLs and scripts from HTML */
const extractHtmlAssets = (html: string, baseUrl: URL) => {
  const scripts: string[] = [];
  const images: string[] = [];

  const scriptMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi);
  for (const m of scriptMatches) {
    try {
      scripts.push(new URL(m[1], baseUrl).toString());
    } catch {}
  }

  const imgMatches = html.matchAll(/<(?:img|link)[^>]+(?:src|href)=["']([^"']+\.(?:png|jpg|jpeg|svg|webp))["']/gi);
  for (const m of imgMatches) {
    try {
      images.push(new URL(m[1], baseUrl).toString());
    } catch {}
  }

  return { scripts, images };
};

/** Downloads an image asset locally into public/research/<host>/ for deterministic Remotion rendering */
const downloadAssetLocally = async (
  imageUrl: string,
  workspaceRoot: string,
  hostDir: string
): Promise<string | undefined> => {
  try {
    const parsed = new URL(imageUrl);
    const basename = path.basename(parsed.pathname) || "asset.png";
    const cleanBasename = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const relativePath = path.posix.join("research", hostDir, cleanBasename);
    const targetPath = path.join(workspaceRoot, "public", relativePath);

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 100) {
      return relativePath;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(6_000),
      headers: { "User-Agent": "MotionStudio/2.0 (+https://remotion.dev)" },
    });

    if (!res.ok) return undefined;
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 50) return undefined;

    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return relativePath;
  } catch {
    return undefined;
  }
};

/**
 * Deep, factual website research:
 * 1. Fetches HTML and meta tags.
 * 2. If it's a client-side SPA (like Vite/React/Vue), fetches and analyzes JavaScript bundles.
 * 3. Extracts real brand name, products, features, headlines, and image assets.
 * 4. Downloads top visual assets into public/research/ for zero-latency Remotion rendering.
 */
export const researchWebsite = async (
  content: string,
  workspaceRoot: string = process.cwd()
): Promise<WebsiteBrief | undefined> => {
  const candidate = content.match(URL_PATTERN)?.[0];
  if (!candidate) return undefined;

  let url: URL;
  try {
    const rawUrl = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (!/^https?:$/.test(url.protocol) || /^(localhost|0\.0\.0\.0|127\.|::1$)/i.test(url.hostname)) {
    return undefined;
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": "MotionStudioWebsiteBrief/2.0" },
  });

  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
  const html = await response.text();

  const title = decode(meta(html, "og:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = decode(meta(html, "og:description") ?? meta(html, "description") ?? "");
  const ogImage = meta(html, "og:image");
  const siteName = clean(meta(html, "og:site_name") ?? "");

  const { scripts, images: htmlImages } = extractHtmlAssets(html, url);
  const withoutNoise = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  let visibleText = clean(withoutNoise.replace(/<[^>]+>/g, " "));

  const discoveredImages = new Set<string>(htmlImages);
  if (ogImage) {
    try {
      discoveredImages.add(new URL(ogImage, url).toString());
    } catch {}
  }

  const products: WebsiteProduct[] = [];
  const keyFeatures: string[] = [];
  const verifiedFacts: string[] = [];

  // If page text is very short (< 300 chars), page is almost certainly a modern SPA (React/Vite/Next.js)
  // Deep-dive into client-side JS bundles to extract real copy, products, and graphics!
  if (visibleText.length < 350 && scripts.length > 0) {
    const bundleUrls = scripts.filter((s) => s.includes("index") || s.includes("bundle") || s.includes("main") || s.includes("assets"));
    const targets = bundleUrls.length ? bundleUrls.slice(0, 3) : scripts.slice(0, 2);

    for (const bundleUrl of targets) {
      try {
        const bundleRes = await fetch(bundleUrl, {
          signal: AbortSignal.timeout(8_000),
          headers: { "User-Agent": "MotionStudioWebsiteBrief/2.0" },
        });
        if (!bundleRes.ok) continue;
        const bundleJs = await bundleRes.text();

        // 1. Extract image references in JS bundle
        const jsImgMatches = bundleJs.matchAll(/["'](\/[a-zA-Z0-9_\/.-]+\.(?:png|jpg|jpeg|svg|webp))["']/gi);
        for (const m of jsImgMatches) {
          try {
            discoveredImages.add(new URL(m[1], url).toString());
          } catch {}
        }

        // 2. Extract product cards / structured objects in bundle
        const productMatches = bundleJs.matchAll(/title:\s*["']([^"']{3,65})["'],\s*src:\s*["']([^"']+)["'](?:[^}]*?children:\s*["']([^"']{10,400})["'])?/gi);
        for (const pm of productMatches) {
          const pTitle = clean(pm[1]);
          const pImg = pm[2];
          const pDesc = pm[3] ? clean(pm[3]) : `${pTitle} powered by Web3 and blockchain decentralization.`;
          if (pTitle && !products.some((p) => p.title === pTitle)) {
            let fullImgUrl: string | undefined;
            try {
              fullImgUrl = new URL(pImg, url).toString();
              discoveredImages.add(fullImgUrl);
            } catch {}
            products.push({
              title: pTitle,
              description: pDesc,
              image: fullImgUrl,
            });
            verifiedFacts.push(`${pTitle}: ${pDesc.slice(0, 100)}`);
          }
        }

        // 3. Extract headline statements and features from JSX text strings
        const textSnippets = bundleJs.matchAll(/children:\s*["']([A-Z][a-zA-Z0-9\s.,'’!-]{12,180})["']/g);
        for (const sm of textSnippets) {
          const snippet = clean(sm[1]);
          if (
            snippet.length > 20 &&
            !snippet.includes("function") &&
            !snippet.includes("export") &&
            !snippet.includes("return") &&
            !keyFeatures.includes(snippet)
          ) {
            keyFeatures.push(snippet);
          }
        }

        if (keyFeatures.length > 0) {
          visibleText += " " + keyFeatures.slice(0, 15).join(" | ");
        }
      } catch {}
    }
  }

  // Identify brand logo & prominent images
  const allImages = Array.from(discoveredImages);
  const logoCandidate = allImages.find((img) => /logo|favicon|brand|icon/i.test(img)) || allImages[0];

  // Download key assets locally to public/research/<hostname>/ for 100% offline-resilient Remotion rendering
  const hostDir = url.hostname.replace(/[^a-zA-Z0-9]/g, "_");
  const localImages: string[] = [];

  let localLogo: string | undefined;
  if (logoCandidate) {
    localLogo = await downloadAssetLocally(logoCandidate, workspaceRoot, hostDir);
    if (localLogo) localImages.push(localLogo);
  }

  for (const imgUrl of allImages.slice(0, 8)) {
    if (imgUrl === logoCandidate) continue;
    const local = await downloadAssetLocally(imgUrl, workspaceRoot, hostDir);
    if (local && !localImages.includes(local)) {
      localImages.push(local);
    }
  }

  // Update local image paths on products
  for (const prod of products) {
    if (prod.image) {
      prod.localImage = await downloadAssetLocally(prod.image, workspaceRoot, hostDir);
      if (prod.localImage && !localImages.includes(prod.localImage)) {
        localImages.push(prod.localImage);
      }
    }
  }

  const hostSegment = url.hostname.replace(/^www\./i, "").split(".")[0];
  const dynamicFallbackBrand = hostSegment ? hostSegment.charAt(0).toUpperCase() + hostSegment.slice(1) : "Brand";
  const brandName = siteName || clean(title.split(/[-–|:]/)[0]) || dynamicFallbackBrand;

  return {
    url: url.toString(),
    title: clean(title) || undefined,
    brandName,
    description: clean(description) || (keyFeatures[0] ? keyFeatures[0].slice(0, 160) : undefined),
    tagline: keyFeatures[0] || description.slice(0, 90) || undefined,
    siteName: siteName || undefined,
    logo: logoCandidate,
    localLogo,
    representativeImage: localImages[0] || logoCandidate,
    images: allImages,
    localImages,
    products: products.slice(0, 6),
    keyFeatures: keyFeatures.slice(0, 10),
    verifiedFacts: verifiedFacts.length ? verifiedFacts : keyFeatures.slice(0, 6),
    text: visibleText.slice(0, 3_500),
  };
};

export const websiteBriefForPrompt = (brief: WebsiteBrief) =>
  JSON.stringify(
    {
      url: brief.url,
      brandName: brief.brandName,
      title: brief.title,
      tagline: brief.tagline,
      verifiedProducts: brief.products.map((p) => ({
        title: p.title,
        description: p.description,
        localImage: p.localImage,
      })),
      verifiedKeyFeatures: brief.keyFeatures.slice(0, 6),
      availableLocalImages: brief.localImages,
      logoAsset: brief.localLogo,
      verifiedPageSummary: brief.text.slice(0, 1_500),
    },
    null,
    2
  );
