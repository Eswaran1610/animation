import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { noise2D } from "@remotion/noise";
import { evolvePath } from "@remotion/paths";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import { CampaignData, MotionScene } from "./schema";

// =========================================================================
// CRISP VECTOR SVG ICONS (Resolution-independent, 0 external deps)
// =========================================================================
const IconShield: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconLock: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconUser: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCheck: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCross: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconAlert: React.FC<{ color: string; size?: number }> = ({ color, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconTerminal: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconSparkles: React.FC<{ color: string; size?: number }> = ({ color, size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
  </svg>
);

// =========================================================================
// SYNTAX HIGHLIGHTER HELPER (Prism.js Bash / Shell Tokenizer)
// =========================================================================
const renderSyntaxTokens = (code: string) => {
  if (!code) return null;
  const tokens = Prism.tokenize(code, Prism.languages.bash);

  return tokens.map((token, i) => {
    if (typeof token === "string") {
      return <span key={i} style={{ color: "#F8FAFC" }}>{token}</span>;
    }

    let color = "#38BDF8"; // default cyan
    if (token.type === "keyword" || token.type === "builtin") color = "#C084FC"; // neon purple
    else if (token.type === "string") color = "#34D399"; // emerald
    else if (token.type === "function") color = "#60A5FA"; // light blue
    else if (token.type === "operator" || token.type === "punctuation") color = "#94A3B8"; // slate
    else if (token.type === "variable") color = "#FBBF24"; // amber
    else if (token.type === "comment") color = "#64748B"; // muted
    else if (token.type === "number") color = "#FB923C"; // orange
    else if (String(token.content).startsWith("-")) color = "#F43F5E"; // rose flags

    const content =
      typeof token.content === "string"
        ? token.content
        : Array.isArray(token.content)
        ? token.content.map((c) => (typeof c === "string" ? c : c.content)).join("")
        : String(token.content);

    return (
      <span key={i} style={{ color, fontWeight: token.type === "keyword" ? 800 : 600 }}>
        {content}
      </span>
    );
  });
};

// =========================================================================
// MAIN PERMANENT ENGINE COMPOSITION
// =========================================================================
export const UniversalMotionEngine: React.FC<{ campaign: CampaignData }> = ({ campaign }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isVertical = campaign.aspectRatio === "9:16";
  const isClaudeTheme = campaign.brand.theme === "claude";
  const totalFrames = campaign.scenes.reduce((acc, s) => acc + s.durationSeconds * fps, 0);

  // Continuous subtle 3D cinematic camera tracking
  const cameraZ = interpolate(frame, [0, Math.max(1, totalFrames)], [1, 1.05]);
  const cameraRotY = interpolate(frame, [0, Math.max(1, totalFrames)], [-1.2, 1.2]);

  // Organic volumetric neon light drift using Perlin noise from @remotion/noise
  const noiseGlowX = noise2D("neon-drift-x", frame * 0.012, 0);
  const noiseGlowY = noise2D("neon-drift-y", 0, frame * 0.012);
  const glowX = interpolate(noiseGlowX, [-1, 1], [38, 62]);
  const glowY = interpolate(noiseGlowY, [-1, 1], [16, 34]);

  const bgBase = isClaudeTheme ? "#1A1916" : campaign.brand.backgroundColor || "#030712";
  const fontFamily = isClaudeTheme
    ? "Georgia, 'Times New Roman', serif"
    : "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif";

  let accumulatedFrames = 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgBase,
        color: isClaudeTheme ? "#F5F1E8" : "#F8FAFC",
        fontFamily,
        overflow: "hidden",
        perspective: 1400,
      }}
    >
      {/* Background Cyber Audio Score */}
      <Audio src={staticFile(campaign.audioTrack || "cyber_audio.wav")} volume={0.65} />

      {/* Synchronized Foley SFX at scene boundary transitions */}
      {campaign.scenes.map((_, idx) => {
        if (idx === 0) return null;
        const triggerFrame = campaign.scenes.slice(0, idx).reduce((acc, s) => acc + s.durationSeconds * fps, 0);
        return (
          <Sequence key={`sfx-${idx}`} from={triggerFrame} durationInFrames={30}>
            <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />
          </Sequence>
        );
      })}

      {/* Subtle Matrix / Circuit Grid Background (skipped in Claude theme for clean organic texture) */}
      {!isClaudeTheme && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            opacity: 0.8,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Subtle Procedural Film Grain Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: isClaudeTheme ? 0.06 : 0.035,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          mixBlendMode: "screen",
        }}
      />

      {/* Dual Volumetric Atmospheric Neons Driven by Perlin Noise */}
      <div
        style={{
          position: "absolute",
          top: `${glowY}%`,
          left: `${glowX}%`,
          width: isVertical ? 950 : 1300,
          height: isVertical ? 950 : 1300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${campaign.brand.primaryColor}38 0%, transparent 65%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(140px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          right: "8%",
          width: 750,
          height: 750,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${campaign.brand.accentColor}25 0%, transparent 65%)`,
          filter: "blur(130px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Global Progress Tracker */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${(frame / Math.max(1, totalFrames)) * 100}%`,
          height: 5,
          background: `linear-gradient(90deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          boxShadow: `0 0 16px ${campaign.brand.primaryColor}`,
          zIndex: 100,
        }}
      />

      {/* 3D Viewport Wrapper */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraZ}) rotateY(${cameraRotY}deg)`,
          transformStyle: "preserve-3d",
          position: "relative",
        }}
      >
        {/* Dynamic Scene Choreography */}
        {campaign.scenes.map((scene, idx) => {
          const startFrame = accumulatedFrames;
          const durationFrames = scene.durationSeconds * fps;
          accumulatedFrames += durationFrames;

          return (
            <Sequence key={scene.id || idx} from={startFrame} durationInFrames={durationFrames}>
              <EngineSceneRenderer
                scene={scene}
                campaign={campaign}
                index={idx}
                total={campaign.scenes.length}
                isVertical={isVertical}
                durationFrames={durationFrames}
                isClaudeTheme={isClaudeTheme}
              />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// UNIVERSAL SCENE RENDERER (Proper Full-Canvas Spatial Composition)
// =========================================================================
const EngineSceneRenderer: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  index: number;
  total: number;
  isVertical: boolean;
  durationFrames: number;
  isClaudeTheme: boolean;
}> = ({ scene, campaign, index, total, isVertical, durationFrames, isClaudeTheme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Snappy transitions
  const sceneOpacity = interpolate(
    frame,
    [0, 4, durationFrames - 4, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const sceneScale = interpolate(
    frame,
    [0, 6, durationFrames - 6, durationFrames],
    [0.97, 1, 1, 1.02],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const words = scene.headline.split(" ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: isVertical ? "65px 56px 50px" : "55px 90px 45px",
        boxSizing: "border-box",
        opacity: sceneOpacity,
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* 1. TOP HEADER HUD (Brand + Live Status + Scene Index) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Pulsing Status Indicator */}
          <div style={{ position: "relative", width: 12, height: 12 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: campaign.brand.primaryColor,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                backgroundColor: campaign.brand.primaryColor,
                opacity: interpolate(Math.sin((frame / 8) * Math.PI), [-1, 1], [0.2, 0.7]),
              }}
            />
          </div>

          {/* Category Tag Pill */}
          <div
            style={{
              background: isClaudeTheme ? "rgba(217, 119, 87, 0.12)" : "rgba(255, 255, 255, 0.06)",
              border: `1px solid ${campaign.brand.primaryColor}55`,
              borderRadius: 9999,
              padding: "6px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: campaign.brand.primaryColor,
                fontFamily: isClaudeTheme ? "'JetBrains Mono', Menlo, monospace" : "inherit",
              }}
            >
              {scene.tag}
            </span>
          </div>
        </div>

        {/* Scene Index & Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(248, 250, 252, 0.5)", letterSpacing: 1.5, textTransform: "uppercase" }}>
            {campaign.brand.name}
          </span>
          <div
            style={{
              fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 700,
              color: "#FFFFFF",
              background: "rgba(255, 255, 255, 0.08)",
              padding: "4px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            0{index + 1} / 0{total}
          </div>
        </div>
      </div>

      {/* 2. HERO KINETIC TYPOGRAPHY AREA */}
      <div style={{ marginBottom: 28 }}>
        {/* Kinetic Staggered Words */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
          {words.map((w, wIdx) => {
            const wordSpring = spring({
              frame: frame - wIdx * 2,
              fps,
              config: { damping: 14, stiffness: 100, mass: 0.7 },
            });
            const wordY = interpolate(wordSpring, [0, 1], [24, 0]);
            const isAccent = scene.accentWord && w.toLowerCase().includes(scene.accentWord.toLowerCase().replace(/[^a-z0-9]/gi, ""));

            return (
              <span
                key={wIdx}
                style={{
                  display: "inline-block",
                  transform: `translateY(${wordY}px)`,
                  opacity: wordSpring,
                  fontSize: isVertical ? (words.length > 7 ? 48 : 58) : 64,
                  fontWeight: isClaudeTheme ? 700 : 900,
                  letterSpacing: isClaudeTheme ? 0 : -1.2,
                  lineHeight: 1.12,
                  color: isAccent ? campaign.brand.primaryColor : isClaudeTheme ? "#F5F1E8" : "#FFFFFF",
                  textShadow: isAccent ? `0 0 35px ${campaign.brand.primaryColor}88` : "none",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>

        {/* Subtitle / Context description */}
        {scene.subtitle && (
          <div
            style={{
              marginTop: 14,
              fontSize: 20,
              fontWeight: 400,
              color: isClaudeTheme ? "#9A9488" : "rgba(248, 250, 252, 0.75)",
              lineHeight: 1.4,
              maxWidth: "96%",
            }}
          >
            {scene.subtitle}
          </div>
        )}
      </div>

      {/* 3. VISUAL CENTERPIECE STAGE (Full-Scale Immersive Allocation) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", position: "relative" }}>
        {/* Archetype 1: Terminal Code */}
        {scene.type === "terminal_code" && (
          <StudioTerminalMockup scene={scene} campaign={campaign} frame={frame} isVertical={isVertical} />
        )}

        {/* Archetype 2: Network Topology Architecture */}
        {scene.type === "network_topology" && (
          <StudioTopologyMockup scene={scene} campaign={campaign} frame={frame} isVertical={isVertical} />
        )}

        {/* Archetype 3: Before vs After Split Comparison */}
        {scene.type === "before_after_split" && (
          <StudioBeforeAfterMockup scene={scene} campaign={campaign} frame={frame} isVertical={isVertical} />
        )}

        {/* Archetype 4: Feature Cards Staggered Stack */}
        {scene.type === "feature_cards" && (
          <StudioFeatureCardsMockup items={scene.items || []} campaign={campaign} frame={frame} isVertical={isVertical} />
        )}

        {/* Archetype 5: Metric Counter Command Center */}
        {scene.type === "metric_counter" && (
          <StudioMetricMockup scene={scene} campaign={campaign} frame={frame} isVertical={isVertical} />
        )}

        {/* Archetype 6: Conversion CTA Action Showcase */}
        {scene.type === "conversion_cta" && (
          <StudioConversionMockup scene={scene} campaign={campaign} frame={frame} fps={fps} isVertical={isVertical} />
        )}

        {/* Archetype 7: Kinetic Hook Narrative Callout */}
        {scene.type === "kinetic_hook" && (
          <StudioHookMockup scene={scene} campaign={campaign} frame={frame} isVertical={isVertical} />
        )}
      </div>

      {/* 4. FOOTER TELEMETRY STRIP */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 18,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          fontSize: 12,
          color: "rgba(248, 250, 252, 0.45)",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          height: 38,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: campaign.brand.primaryColor }}>●</span>
          <span>SYSTEM: DETERMINISTIC MOTION GRAPHICS</span>
        </div>
        <div>SHA-256 SECURED // FRAME {frame}</div>
      </div>
    </div>
  );
};

// =========================================================================
// ARCHETYPE: BEFORE VS AFTER SPLIT COMPARISON (Huge Visual Variety)
// =========================================================================
const StudioBeforeAfterMockup: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  frame: number;
  isVertical: boolean;
}> = ({ scene, campaign, frame, isVertical }) => {
  const ba = scene.beforeAfter || {
    beforeTitle: "Legacy Manual Workflow",
    beforeItems: ["Unrestricted Lateral Subnet Exposure", "Opaque Observability & Log Blindspots", "Slow 45-Minute MTTR During Incidents"],
    afterTitle: "Modern Zero-Trust Architecture",
    afterItems: ["Ephemeral TLS 1.3 Micro-Tunnels", "Real-Time Biometric Posture Evaluation", "0ms Unauthorized Lateral Movement Allowed"],
  };

  const beforeSlide = interpolate(frame, [8, 24], [30, 0], { extrapolateRight: "clamp" });
  const afterSlide = interpolate(frame, [16, 32], [30, 0], { extrapolateRight: "clamp" });
  const vsScale = spring({ frame: frame - 12, fps: 30, config: { damping: 12, stiffness: 120 } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
      {/* 1. Legacy / Before Card (Red / Warning Aesthetic) */}
      <div
        style={{
          transform: `translateY(${beforeSlide}px)`,
          background: "rgba(239, 68, 68, 0.06)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: 22,
          padding: "24px 26px",
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>
            BEFORE
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>{ba.beforeTitle}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ba.beforeItems.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239, 68, 68, 0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconCross color="#EF4444" size={14} />
              </div>
              <span style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.8)", fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Animated "VS" Badge */}
      <div
        style={{
          alignSelf: "center",
          transform: `scale(${vsScale})`,
          background: `linear-gradient(135deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          color: "#050811",
          fontWeight: 900,
          fontSize: 14,
          padding: "6px 16px",
          borderRadius: 9999,
          boxShadow: `0 0 20px ${campaign.brand.primaryColor}88`,
          letterSpacing: 2,
          zIndex: 10,
        }}
      >
        VS
      </div>

      {/* 2. Modern / After Card (Brand Primary Aesthetic) */}
      <div
        style={{
          transform: `translateY(${afterSlide}px)`,
          background: `${campaign.brand.primaryColor}10`,
          border: `1px solid ${campaign.brand.primaryColor}55`,
          borderRadius: 22,
          padding: "24px 26px",
          boxShadow: `0 20px 45px -10px ${campaign.brand.primaryColor}24`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ background: `${campaign.brand.primaryColor}25`, color: campaign.brand.primaryColor, fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>
            AFTER
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>{ba.afterTitle}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ba.afterItems.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${campaign.brand.primaryColor}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconCheck color={campaign.brand.primaryColor} size={15} />
              </div>
              <span style={{ fontSize: 16, color: "#FFFFFF", fontWeight: 600 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// ARCHETYPE 1: STUDIO macOS TERMINAL / IDE MOCKUP (Prism.js Syntax Highlighted)
// =========================================================================
const StudioTerminalMockup: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  frame: number;
  isVertical: boolean;
}> = ({ scene, campaign, frame }) => {
  const cmd = scene.terminalCommand || "ztnz verify --identity user@corp.internal --posture=strict";
  const typedCount = Math.min(cmd.length, Math.floor(interpolate(frame, [10, 55], [0, cmd.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const displayed = cmd.slice(0, typedCount);
  const cursorBlink = Math.sin((frame / 12) * Math.PI) > 0;

  const logLines = [
    { text: "→ Querying Zero-Trust Identity Controller [IDP-01]", delay: 35, status: "OK", color: "#38BDF8" },
    { text: "→ Device Posture Evaluated: BitLocker Enforced, EDR Active", delay: 50, status: "PASS", color: "#10B981" },
    { text: "→ Dynamic Ephemeral Micro-Tunnel Provisioned: tunnel_id=0x9f4a", delay: 65, status: "PASS", color: "#10B981" },
    { text: "→ WAN Port Cloaking Active: 0 External IP Surface Exposed", delay: 80, status: "SECURE", color: "#C084FC" },
  ];

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(10, 15, 29, 0.92)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 35px 80px -15px rgba(0, 0, 0, 0.75)",
      }}
    >
      {/* Window Chrome */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FF5F56" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FFBD2E" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#27C93F" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
            <IconTerminal color="rgba(248, 250, 252, 0.6)" size={18} />
            <span style={{ fontSize: 14, color: "rgba(248, 250, 252, 0.7)", fontFamily: "'Fira Code', monospace" }}>
              {scene.terminalTitle || "auth_policy.sh"}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: campaign.brand.primaryColor, background: `${campaign.brand.primaryColor}18`, padding: "4px 12px", borderRadius: 6 }}>
          zsh • active session
        </div>
      </div>

      {/* Terminal Body with Prism.js Syntax Highlighting */}
      <div style={{ padding: "32px 28px", minHeight: 440, fontFamily: "'Fira Code', monospace", fontSize: 20, lineHeight: 1.6 }}>
        {/* Command Line with Syntax Color Tokens */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: 12, fontWeight: 800, color: campaign.brand.primaryColor }}>$</span>
          <div>{renderSyntaxTokens(displayed)}</div>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 24,
              background: cursorBlink ? campaign.brand.primaryColor : "transparent",
              marginLeft: 6,
              verticalAlign: "middle",
            }}
          />
        </div>

        {/* Execution Log Stream */}
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
          {logLines.map((line, lIdx) => {
            if (frame < line.delay) return null;
            return (
              <div key={lIdx} style={{ fontSize: 17, color: line.color, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{line.text}</span>
                <span style={{ background: "rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>
                  [{line.status}]
                </span>
              </div>
            );
          })}

          {frame > 82 && scene.terminalOutput && (
            <div style={{ marginTop: 14, padding: "16px 20px", background: `${campaign.brand.primaryColor}14`, border: `1px solid ${campaign.brand.primaryColor}44`, borderRadius: 12, color: "#FFFFFF", fontSize: 18 }}>
              {scene.terminalOutput}
            </div>
          )}

          {frame > 95 && scene.terminalAlert && (
            <div style={{ marginTop: 16, padding: "16px 22px", background: "rgba(239, 68, 68, 0.16)", border: "1px solid rgba(239, 68, 68, 0.45)", borderRadius: 14, display: "flex", alignItems: "center", gap: 14, color: "#EF4444", fontWeight: 700, fontSize: 18 }}>
              <IconAlert color="#EF4444" size={28} />
              <span>{scene.terminalAlert}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Telemetry Strip */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "14px 28px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          fontFamily: "'Fira Code', monospace",
          color: "rgba(248, 250, 252, 0.5)",
        }}
      >
        <span>PACKETS: 4,890 // LATENCY: 0.6ms</span>
        <span style={{ color: campaign.brand.primaryColor, fontWeight: 700 }}>TLS 1.3 ENFORCED</span>
      </div>
    </div>
  );
};

// =========================================================================
// ARCHETYPE 2: STUDIO NETWORK TOPOLOGY (@remotion/paths Evolved Connection)
// =========================================================================
const StudioTopologyMockup: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  frame: number;
  isVertical: boolean;
}> = ({ scene, campaign, frame }) => {
  const packetPos = (frame * 2.8) % 100;
  const left = scene.nodeLeft || { icon: "user", label: "Remote Engineer", status: "MFA Verified", sub: "Clean Posture" };
  const center = scene.nodeCenter || { icon: "shield", label: "ZTNA Gateway", sub: "Policy Decision Engine", status: "CONTINUOUS AUTH" };
  const right = scene.nodeRight || { icon: "lock", label: "Cloud Workload", sub: "Zero WAN Exposure", status: "CLOAKED" };

  const pathD = "M 80 50 L 880 50";
  const pathEvolution = evolvePath(Math.min(1, frame / 20), pathD);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Main Architecture Diagram Canvas */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(24px)",
          border: `1px solid ${campaign.brand.primaryColor}44`,
          borderRadius: 26,
          padding: "48px 30px",
          position: "relative",
          boxShadow: `0 30px 70px -15px ${campaign.brand.primaryColor}24`,
        }}
      >
        {/* Animated Connection Beam via @remotion/paths */}
        <div style={{ position: "absolute", top: "54px", left: "12%", right: "12%", height: 10, zIndex: 1 }}>
          <svg width="100%" height="10" viewBox="0 0 960 10" preserveAspectRatio="none">
            <line x1="0" y1="5" x2="960" y2="5" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" />
            <path
              d={pathD}
              fill="none"
              stroke={campaign.brand.primaryColor}
              strokeWidth="3"
              strokeDasharray={pathEvolution.strokeDasharray}
              strokeDashoffset={pathEvolution.strokeDashoffset}
              style={{ filter: `drop-shadow(0 0 8px ${campaign.brand.primaryColor})` }}
            />
          </svg>

          {/* Travelling Photon Pulse */}
          <div
            style={{
              position: "absolute",
              top: -4,
              left: `${packetPos}%`,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: campaign.brand.primaryColor,
              boxShadow: `0 0 24px ${campaign.brand.primaryColor}, 0 0 40px ${campaign.brand.accentColor}`,
            }}
          />
        </div>

        {/* 3 Major Architecture Nodes */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 10 }}>
          {/* Node 1: Left (Client) */}
          <div style={{ textAlign: "center", width: 145 }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 26,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <IconUser color="#FFFFFF" size={44} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#FFFFFF" }}>{left.label}</div>
            <div style={{ fontSize: 14, color: campaign.brand.primaryColor, fontWeight: 700, marginTop: 4 }}>
              ✓ {left.status}
            </div>
            {left.sub && <div style={{ fontSize: 13, color: "rgba(248, 250, 252, 0.55)", marginTop: 2 }}>{left.sub}</div>}
          </div>

          {/* Node 2: Center (Gateway / Policy Engine) */}
          <div style={{ textAlign: "center", width: 180 }}>
            <div
              style={{
                width: 108,
                height: 108,
                borderRadius: 34,
                background: `linear-gradient(135deg, ${campaign.brand.primaryColor}38, ${campaign.brand.accentColor}38)`,
                border: `2px solid ${campaign.brand.primaryColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                boxShadow: `0 0 50px ${campaign.brand.primaryColor}55`,
              }}
            >
              <IconShield color={campaign.brand.primaryColor} size={54} />
            </div>
            <div style={{ fontSize: 21, fontWeight: 900, color: campaign.brand.primaryColor }}>{center.label}</div>
            <div style={{ fontSize: 14, color: "#FFFFFF", fontWeight: 700, marginTop: 4 }}>{center.sub}</div>
            <div style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: campaign.brand.accentColor, marginTop: 4, fontWeight: 700 }}>
              [{center.status || "ACTIVE"}]
            </div>
          </div>

          {/* Node 3: Right (Target Application) */}
          <div style={{ textAlign: "center", width: 145 }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 26,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <IconLock color={campaign.brand.accentColor} size={44} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#FFFFFF" }}>{right.label}</div>
            <div style={{ fontSize: 14, color: campaign.brand.accentColor, fontWeight: 700, marginTop: 4 }}>
              🔒 {right.sub}
            </div>
            {right.status && <div style={{ fontSize: 13, color: "rgba(248, 250, 252, 0.55)", marginTop: 2 }}>{right.status}</div>}
          </div>
        </div>
      </div>

      {/* Lower Audit Verification Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          "Device Posture Evaluated: Clean EDR & BitLocker Active",
          "Network Invisibility: Internal IP Space Never Published to WAN",
          "Continuous Session Authentication: Zero Lateral Movement",
        ].map((rule, rIdx) => {
          const ruleSpring = interpolate(frame, [12 + rIdx * 8, 26 + rIdx * 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div
              key={rIdx}
              style={{
                opacity: ruleSpring,
                transform: `translateY(${interpolate(ruleSpring, [0, 1], [15, 0])}px)`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "rgba(255, 255, 255, 0.04)",
                padding: "18px 22px",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.09)",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${campaign.brand.primaryColor}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconCheck color={campaign.brand.primaryColor} size={18} />
              </div>
              <span style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.92)", fontWeight: 600 }}>{rule}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// ARCHETYPE 4: STUDIO FEATURE CARDS STAGGERED STACK
// =========================================================================
const StudioFeatureCardsMockup: React.FC<{
  items: (string | { title: string; description?: string; badge?: string })[];
  campaign: CampaignData;
  frame: number;
  isVertical: boolean;
}> = ({ items, campaign, frame }) => {
  const displayItems = items.length > 0 ? items : [
    { title: "Granular App-Level Micro-Tunnels", description: "Users access authorized apps only, never entire subnets.", badge: "HARDENED" },
    { title: "Continuous Risk Telemetry", description: "Sessions terminate instantly upon suspicious posture shifts.", badge: "REAL-TIME" },
    { title: "100% Deterministic Policy Enforcement", description: "Automated cryptographically signed access policies.", badge: "ZERO-TOUCH" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {displayItems.map((item, idx) => {
        const title = typeof item === "string" ? item : item.title;
        const description = typeof item === "string" ? undefined : item.description;
        const badge = typeof item === "string" ? undefined : item.badge;

        const slide = interpolate(frame, [8 + idx * 7, 24 + idx * 7], [45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const op = interpolate(frame, [8 + idx * 7, 24 + idx * 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const barFill = interpolate(frame, [22 + idx * 7, 44 + idx * 7], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div
            key={idx}
            style={{
              transform: `translateY(${slide}px)`,
              opacity: op,
              background: "rgba(15, 23, 42, 0.76)",
              backdropFilter: "blur(22px)",
              border: "1px solid rgba(255, 255, 255, 0.13)",
              borderRadius: 22,
              padding: "26px 28px",
              boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Animated card progress accent line */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: `${barFill}%`,
                height: 4,
                background: `linear-gradient(90deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
              }}
            />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${campaign.brand.primaryColor}33, ${campaign.brand.accentColor}33)`,
                    border: `1px solid ${campaign.brand.primaryColor}77`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconCheck color={campaign.brand.primaryColor} size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 23, fontWeight: 800, color: "#FFFFFF" }}>{title}</div>
                  {description && (
                    <div style={{ fontSize: 17, color: "rgba(248, 250, 252, 0.7)", marginTop: 6, lineHeight: 1.45 }}>
                      {description}
                    </div>
                  )}
                </div>
              </div>

              {badge && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    fontFamily: "'Fira Code', monospace",
                    color: campaign.brand.accentColor,
                    background: `${campaign.brand.accentColor}18`,
                    border: `1px solid ${campaign.brand.accentColor}44`,
                    padding: "5px 12px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =========================================================================
// ARCHETYPE 5: STUDIO METRIC COUNTER COMMAND CENTER (Full Height ~720px)
// =========================================================================
const StudioMetricMockup: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  frame: number;
  isVertical: boolean;
}> = ({ scene, campaign, frame }) => {
  const target = scene.metricTarget ?? 95;
  const count = Math.floor(interpolate(frame, [4, 45], [0, target], { extrapolateRight: "clamp" }));

  // Circular gauge animation
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (count / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Central Hero Gauge Card */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(24px)",
          border: `1px solid ${campaign.brand.primaryColor}44`,
          borderRadius: 28,
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: `0 30px 70px -15px ${campaign.brand.primaryColor}30`,
        }}
      >
        <div style={{ position: "relative", width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* SVG Circular Progress Ring */}
          <svg width="240" height="240" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="16"
              fill="transparent"
            />
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke={campaign.brand.primaryColor}
              strokeWidth="16"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ filter: `drop-shadow(0 0 14px ${campaign.brand.primaryColor})` }}
            />
          </svg>

          {/* Centered Bold Numeric Value */}
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>
              {count}
              <span style={{ fontSize: 36, color: campaign.brand.primaryColor }}>{scene.metricSuffix || "%"}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: campaign.brand.primaryColor, letterSpacing: 2, textTransform: "uppercase", marginTop: 6 }}>
              REDUCTION
            </div>
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", marginTop: 22, textAlign: "center" }}>
          {scene.metricLabel}
        </div>
      </div>

      {/* Dual Comparative Context Cards */}
      <div style={{ display: "flex", gap: 20 }}>
        {/* Legacy State */}
        <div
          style={{
            flex: 1,
            background: "rgba(239, 68, 68, 0.07)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 22,
            padding: "26px 22px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: "#EF4444", textTransform: "uppercase" }}>
            LEGACY ARCHITECTURE
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#FFFFFF", marginTop: 8 }}>
            2,400+
          </div>
          <div style={{ fontSize: 15, color: "rgba(248, 250, 252, 0.7)", marginTop: 6 }}>
            Subnet IPs Exposed
          </div>
        </div>

        {/* Modern Zero-Trust State */}
        <div
          style={{
            flex: 1,
            background: `${campaign.brand.accentColor}14`,
            border: `1px solid ${campaign.brand.accentColor}48`,
            borderRadius: 22,
            padding: "26px 22px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: campaign.brand.accentColor, textTransform: "uppercase" }}>
            ZERO-TRUST ENFORCED
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#FFFFFF", marginTop: 8 }}>
            {scene.secondaryMetricValue || "0ms"}
          </div>
          <div style={{ fontSize: 15, color: "rgba(248, 250, 252, 0.7)", marginTop: 6 }}>
            {scene.secondaryMetricLabel || "Lateral Traversal Allowed"}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// ARCHETYPE 6: STUDIO CONVERSION CTA SHOWCASE
// =========================================================================
const StudioConversionMockup: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  frame: number;
  fps: number;
  isVertical: boolean;
}> = ({ scene, campaign, frame, fps, isVertical }) => {
  const btnSpring = spring({ frame, fps, config: { damping: 13, stiffness: 95, mass: 0.6 } });
  const pulse = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [22, 54]);

  const badges = scene.trustBadges || [
    "SOC 2 TYPE II AUDITED",
    "ZERO AGENT OVERHEAD",
    "INSTANT CLOUD ONBOARDING",
  ];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 20 }}>
      {/* Brand Hologram Crest */}
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 34,
          background: `linear-gradient(135deg, ${campaign.brand.primaryColor}38, ${campaign.brand.accentColor}38)`,
          border: `2px solid ${campaign.brand.primaryColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          boxShadow: `0 0 50px ${campaign.brand.primaryColor}66`,
        }}
      >
        <IconSparkles color={campaign.brand.primaryColor} size={54} />
      </div>

      {/* Prominent Action Button */}
      <div
        style={{
          transform: `scale(${btnSpring})`,
          background: `linear-gradient(135deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          padding: "28px 56px",
          borderRadius: 9999,
          fontSize: 34,
          fontWeight: 900,
          color: "#050811",
          boxShadow: `0 16px ${pulse}px ${campaign.brand.primaryColor}88`,
          cursor: "pointer",
          width: isVertical ? "94%" : "auto",
          letterSpacing: -0.5,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shine Sweep Accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${interpolate(frame % 80, [0, 40], [-100, 200], { extrapolateRight: "clamp" })}%`,
            width: "50%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent)",
            transform: "skewX(-25deg)",
          }}
        />
        {campaign.ctaText}
      </div>

      {/* Enterprise Reassurance Badges */}
      <div style={{ marginTop: 42, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
        {badges.map((b, bIdx) => (
          <div
            key={bIdx}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: 9999,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Fira Code', monospace",
              color: "rgba(248, 250, 252, 0.85)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconCheck color={campaign.brand.primaryColor} size={17} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// ARCHETYPE 7: STUDIO KINETIC HOOK NARRATIVE CALLOUT (Full Height ~680px)
// =========================================================================
const StudioHookMockup: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  frame: number;
  isVertical: boolean;
}> = ({ scene, campaign, frame }) => {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Narrative Callout Block */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(24px)",
          border: `1px solid ${campaign.brand.primaryColor}44`,
          borderRadius: 26,
          padding: "42px 34px",
          boxShadow: "0 28px 65px rgba(0, 0, 0, 0.65)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <IconAlert color="#EF4444" size={30} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#EF4444" }}>
            CRITICAL INFRASTRUCTURE WARNING
          </span>
        </div>

        <div style={{ fontSize: 28, color: "rgba(248, 250, 252, 0.95)", lineHeight: 1.5, fontWeight: 600 }}>
          {scene.description || "Traditional perimeter networks grant full lateral traversal upon a single credential breach."}
        </div>
      </div>

      {/* Supporting Data Pill Stack */}
      <div style={{ display: "flex", gap: 18 }}>
        <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 18, padding: "24px 22px" }}>
          <div style={{ fontSize: 13, color: "rgba(248, 250, 252, 0.55)", fontWeight: 700, textTransform: "uppercase" }}>EXPLOIT VECTOR</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#EF4444", marginTop: 8 }}>Lateral Traversal</div>
        </div>
        <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 18, padding: "24px 22px" }}>
          <div style={{ fontSize: 13, color: "rgba(248, 250, 252, 0.55)", fontWeight: 700, textTransform: "uppercase" }}>MEAN BREACH COST</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", marginTop: 8 }}>$4.45 Million</div>
        </div>
      </div>
    </div>
  );
};
