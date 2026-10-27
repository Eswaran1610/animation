import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { evolvePath } from "@remotion/paths";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import { CampaignData, MotionScene } from "./schema";

// =========================================================================
// SVG VECTOR ICONS (Zero external font dependency, 100% deterministic)
// =========================================================================
const IconCheck: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
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

const IconShield: React.FC<{ color: string; size?: number }> = ({ color, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconAlert: React.FC<{ color: string; size?: number }> = ({ color, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconTerminal: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconSparkle: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

// =========================================================================
// SYNTAX HIGHLIGHTING (Prism.js token renderer)
// =========================================================================
function renderSyntaxTokens(text: string) {
  const tokens = Prism.tokenize(text, Prism.languages.bash);
  return tokens.map((token: any, i: number) => {
    if (typeof token === "string") {
      return <span key={i} style={{ color: "#F8FAFC" }}>{token}</span>;
    }
    let color = "#38BDF8";
    if (token.type === "keyword" || token.type === "function") color = "#F43F5E";
    else if (token.type === "string") color = "#10B981";
    else if (token.type === "parameter" || token.type === "variable") color = "#F59E0B";
    else if (token.type === "comment") color = "#64748B";
    return <span key={i} style={{ color, fontWeight: 600 }}>{token.content}</span>;
  });
}

// =========================================================================
// CINEMATIC BACKGROUND: Perlin Volumetric Noise & Deep Obsidian Mesh
// =========================================================================
const CinematicAtmosphere: React.FC<{ theme?: string; primaryColor: string; accentColor: string }> = ({
  theme = "cyber",
  primaryColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const isClaude = theme === "claude";

  // Multi-octave Perlin noise drift
  const x1 = 50 + noise2D("aurora_x", frame / 180, 0) * 22;
  const y1 = 35 + noise2D("aurora_y", 0, frame / 180) * 18;
  const x2 = 50 + noise2D("aurora_x2", frame / 150, 1) * 25;
  const y2 = 70 + noise2D("aurora_y2", 1, frame / 150) * 20;

  const bgBase = isClaude ? "#181714" : theme === "fintech" ? "#060A12" : "#030611";
  const glow1 = isClaude ? "rgba(217, 119, 87, 0.18)" : `${primaryColor}22`;
  const glow2 = isClaude ? "rgba(245, 241, 232, 0.08)" : `${accentColor}18`;

  // Grid line scan drift
  const gridOffsetY = (frame * 0.8) % 60;

  return (
    <AbsoluteFill style={{ backgroundColor: bgBase, overflow: "hidden" }}>
      {/* Volumetric Neon Drift */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(70% 50% at ${x1}% ${y1}%, ${glow1}, transparent 75%),
            radial-gradient(60% 45% at ${x2}% ${y2}%, ${glow2}, transparent 75%)
          `,
        }}
      />

      {/* Cyber Grid Plane with Perspective */}
      {!isClaude && (
        <div
          style={{
            position: "absolute",
            inset: -200,
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: `0px ${gridOffsetY}px`,
            transform: "perspective(800px) rotateX(45deg) translateY(-80px)",
            transformOrigin: "center top",
            opacity: 0.7,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 85%)",
          }}
        />
      )}

      {/* Top and Bottom Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, transparent 30%, rgba(3, 6, 17, 0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// =========================================================================
// 1. ARCHETYPE: KINETIC HOOK (Massive 3D Typographic Slam - NO PowerPoint)
// =========================================================================
const SceneKineticHook: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const words = scene.headline.split(" ");
  const isClaude = campaign.brand.theme === "claude";

  // Shock impact camera shake
  const impactFrame = 16;
  const shake = frame > impactFrame && frame < impactFrame + 10 ? Math.sin((frame - impactFrame) * 2.5) * 6 : 0;

  // Moving light streak
  const streakX = interpolate(frame, [15, 60], [-100, 200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 60px",
        textAlign: "center",
        transform: `translate(${shake}px, ${shake * 0.5}px)`,
      }}
    >
      {/* Category Pill with Glowing Pulse */}
      <div
        style={{
          background: `${campaign.brand.primaryColor}18`,
          border: `1px solid ${campaign.brand.primaryColor}88`,
          borderRadius: 9999,
          padding: "10px 28px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: `0 0 35px ${campaign.brand.primaryColor}44`,
          marginBottom: 36,
          transform: `scale(${spring({ frame, fps, config: { damping: 10, stiffness: 120 } })})`,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: campaign.brand.primaryColor, boxShadow: `0 0 10px ${campaign.brand.primaryColor}` }} />
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, fontFamily: isClaude ? "Georgia, serif" : "monospace" }}>
          {scene.tag || "CRITICAL ALERT"}
        </span>
      </div>

      {/* Giant Kinetic Words Slamming Down */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px 24px",
          maxWidth: 960,
          perspective: 1000,
        }}
      >
        {words.map((w, i) => {
          const wSpring = spring({ frame: frame - i * 3, fps, config: { damping: 11, stiffness: 140, mass: 0.6 } });
          const wY = interpolate(wSpring, [0, 1], [-60, 0]);
          const wRotX = interpolate(wSpring, [0, 1], [40, 0]);
          const isAccent = scene.accentWord && w.toLowerCase().includes(scene.accentWord.toLowerCase().replace(/[^a-z0-9]/gi, ""));

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${wY}px) rotateX(${wRotX}deg)`,
                opacity: wSpring,
                fontSize: words.length > 6 ? 78 : 92,
                fontWeight: isClaude ? 700 : 900,
                letterSpacing: -2,
                lineHeight: 1.08,
                fontFamily: isClaude ? "Georgia, serif" : "inherit",
                color: isAccent ? campaign.brand.primaryColor : "#FFFFFF",
                textShadow: isAccent ? `0 0 50px ${campaign.brand.primaryColor}aa, 0 0 90px ${campaign.brand.primaryColor}44` : "0 10px 30px rgba(0,0,0,0.8)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* 3D Floating Alert Orb / Warning Card */}
      <div
        style={{
          marginTop: 56,
          maxWidth: 880,
          width: "100%",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 28,
          padding: "32px 36px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
          transform: `perspective(1000px) rotateX(12deg) scale(${spring({ frame: frame - 10, fps, config: { damping: 14 } })})`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Anamorphic light sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${streakX}%`,
            width: 140,
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)",
            transform: "skewX(-25deg)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18, textAlign: "left" }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${campaign.brand.primaryColor}22`, border: `1px solid ${campaign.brand.primaryColor}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconAlert color={campaign.brand.primaryColor} size={30} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3 }}>
              {scene.subtitle || scene.description}
            </div>
            {scene.description && scene.subtitle && (
              <div style={{ fontSize: 17, color: "rgba(248, 250, 252, 0.65)", marginTop: 8, lineHeight: 1.4 }}>
                {scene.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 2. ARCHETYPE: 3D BEFORE VS AFTER SPLIT (Floating Isometric Glass)
// =========================================================================
const SceneBeforeAfter: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const ba = scene.beforeAfter || {
    beforeTitle: "Vulnerable Legacy System",
    beforeItems: ["Unvalidated Remote Inputs", "Arbitrary Code Execution Vectors", "Opaque Posture Blindspots"],
    afterTitle: "Autonomous Zero-Trust Shield",
    afterItems: ["Real-Time AST Taint Interception", "Zero WAN Surface Exposure", "Sub-Millisecond Attack Termination"],
  };

  const beforeSlideX = interpolate(frame, [4, 22], [-80, 0], { extrapolateRight: "clamp" });
  const afterSlideX = interpolate(frame, [12, 30], [80, 0], { extrapolateRight: "clamp" });
  const vsPop = spring({ frame: frame - 14, fps, config: { damping: 9, stiffness: 140 } });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
        perspective: 1200,
      }}
    >
      {/* Scene Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 12 }}>
          {scene.tag || "BEFORE VS AFTER"}
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.headline}
        </div>
      </div>

      {/* 3D Comparative Stacking Container */}
      <div style={{ width: "100%", maxWidth: 940, display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        
        {/* 1. TOP CARD: THE PAINFUL "BEFORE" (Crimson Glow & 3D Tilt) */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(8deg) rotateY(-4deg) translateX(${beforeSlideX}px)`,
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1.5px solid rgba(239, 68, 68, 0.5)",
            borderRadius: 30,
            padding: "36px 38px",
            boxShadow: "0 25px 60px rgba(239, 68, 68, 0.18), 0 35px 80px rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(24px)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <span style={{ background: "rgba(239, 68, 68, 0.3)", color: "#EF4444", fontSize: 13, fontWeight: 900, padding: "6px 14px", borderRadius: 8, letterSpacing: 2, textTransform: "uppercase", border: "1px solid rgba(239, 68, 68, 0.6)" }}>
              BEFORE
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF" }}>{ba.beforeTitle}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ba.beforeItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239, 68, 68, 0.25)", border: "1px solid rgba(239, 68, 68, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <IconCross color="#EF4444" size={16} />
                </div>
                <span style={{ fontSize: 20, color: "rgba(248, 250, 252, 0.85)", fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Animated "VS" Blast Badge */}
        <div
          style={{
            alignSelf: "center",
            transform: `scale(${vsPop})`,
            background: `linear-gradient(135deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
            color: "#050811",
            fontWeight: 900,
            fontSize: 18,
            padding: "10px 26px",
            borderRadius: 9999,
            boxShadow: `0 0 40px ${campaign.brand.primaryColor}, 0 0 80px ${campaign.brand.primaryColor}66`,
            letterSpacing: 3,
            zIndex: 20,
            margin: "-16px 0",
          }}
        >
          VS
        </div>

        {/* 2. BOTTOM CARD: THE REVOLUTIONARY "AFTER" (Emerald/Cyan Neon Glow) */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(8deg) rotateY(-4deg) translateX(${afterSlideX}px)`,
            background: `linear-gradient(135deg, ${campaign.brand.primaryColor}18 0%, rgba(15, 23, 42, 0.85) 100%)`,
            border: `1.5px solid ${campaign.brand.primaryColor}88`,
            borderRadius: 30,
            padding: "36px 38px",
            boxShadow: `0 25px 60px ${campaign.brand.primaryColor}25, 0 35px 80px rgba(0, 0, 0, 0.8)`,
            backdropFilter: "blur(24px)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <span style={{ background: `${campaign.brand.primaryColor}35`, color: campaign.brand.primaryColor, fontSize: 13, fontWeight: 900, padding: "6px 14px", borderRadius: 8, letterSpacing: 2, textTransform: "uppercase", border: `1px solid ${campaign.brand.primaryColor}88` }}>
              AFTER
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF" }}>{ba.afterTitle}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ba.afterItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${campaign.brand.primaryColor}30`, border: `1px solid ${campaign.brand.primaryColor}88`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <IconCheck color={campaign.brand.primaryColor} size={16} />
                </div>
                <span style={{ fontSize: 20, color: "#FFFFFF", fontWeight: 700 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// COMPARISON-SPECIFIC UI: Claude workspace / Astra browser / decision matrix
// =========================================================================
const SceneClaudeWorkspace: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const ba = scene.beforeAfter;
  const responseIn = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 110 } });
  const contextItems = ba?.beforeItems || ["Conversation context", "Long-form reasoning", "Tool boundaries"];
  const traceItems = ba?.afterItems || ["Clarify the goal", "Build the reasoning", "Return a reviewable answer"];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "54px 42px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ color: campaign.brand.primaryColor, fontSize: 15, fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>{scene.tag}</div>
        <div style={{ color: "#FFF", fontSize: 54, fontWeight: 900, letterSpacing: -1 }}>{scene.headline}</div>
      </div>

      <div style={{ width: "100%", maxWidth: 980, alignSelf: "center", display: "flex", gap: 18, transform: `translateY(${interpolate(responseIn, [0, 1], [45, 0])}px)`, opacity: responseIn }}>
        <div style={{ width: 245, flexShrink: 0, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 22 }}>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 900, letterSpacing: 2, marginBottom: 20 }}>CONTEXT</div>
          <div style={{ color: "#FFF", fontSize: 20, fontWeight: 800, marginBottom: 22 }}>Claude</div>
          {contextItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", color: "rgba(248,250,252,0.72)", fontSize: 15, lineHeight: 1.25, marginTop: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: i === 0 ? campaign.brand.primaryColor : "rgba(255,255,255,0.25)" }} />
              {item}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0, background: "linear-gradient(145deg, rgba(217,119,87,0.16), rgba(15,23,42,0.9))", border: `1px solid ${campaign.brand.primaryColor}88`, borderRadius: 22, overflow: "hidden", boxShadow: `0 25px 70px ${campaign.brand.primaryColor}22` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#FFF", fontWeight: 800 }}><IconSparkle color={campaign.brand.primaryColor} size={21} /> Reasoning workspace</div>
            <span style={{ color: campaign.brand.primaryColor, fontSize: 12, fontWeight: 900, letterSpacing: 1.5 }}>CONTROLLED</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>YOUR TASK</div>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", color: "#FFF", fontSize: 18, lineHeight: 1.35 }}>
              {scene.subtitle || "Choose the right AI workflow for the team."}
            </div>
            <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, margin: "24px 0 10px" }}>CLAUDE RESPONSE</div>
            <div style={{ color: "#FFF", fontSize: 20, lineHeight: 1.45, fontWeight: 650 }}>{scene.description}</div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {traceItems.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", color: "rgba(248,250,252,0.78)", fontSize: 16, marginTop: i === 0 ? 0 : 12 }}>
                  <IconCheck color={campaign.brand.primaryColor} size={17} /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneAstraBrowser: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const reveal = spring({ frame: frame - 8, fps, config: { damping: 13, stiffness: 115 } });
  const steps = ["Understand the screen", "Choose the right tools", "Execute and verify"];
  const activeStep = Math.min(steps.length - 1, Math.floor(Math.max(0, frame - 12) / 22));

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "54px 38px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ color: campaign.brand.accentColor, fontSize: 15, fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>{scene.tag}</div>
        <div style={{ color: "#FFF", fontSize: 54, fontWeight: 900, letterSpacing: -1 }}>{scene.headline}</div>
      </div>

      <div style={{ width: "100%", maxWidth: 1000, alignSelf: "center", background: "rgba(8,13,26,0.96)", border: `1px solid ${campaign.brand.primaryColor}88`, borderRadius: 24, overflow: "hidden", transform: `scale(${interpolate(reveal, [0, 1], [0.94, 1])})`, boxShadow: `0 30px 90px ${campaign.brand.primaryColor}28` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "17px 22px", background: "rgba(255,255,255,0.045)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }} />
          <div style={{ flex: 1, marginLeft: 12, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 14px", color: "rgba(255,255,255,0.65)", fontFamily: "monospace", fontSize: 14 }}>astra://computer-use/workflow</div>
          <span style={{ color: campaign.brand.accentColor, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>LIVE AGENT</span>
        </div>

        <div style={{ display: "flex", minHeight: 470 }}>
          <div style={{ width: 280, padding: 24, borderRight: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 900, letterSpacing: 2, marginBottom: 22 }}>TASK PLAN</div>
            {steps.map((step, i) => (
              <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 24, color: i <= activeStep ? "#FFF" : "rgba(255,255,255,0.36)" }}>
                <div style={{ width: 27, height: 27, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: i <= activeStep ? `${campaign.brand.accentColor}30` : "rgba(255,255,255,0.06)", border: `1px solid ${i <= activeStep ? campaign.brand.accentColor : "rgba(255,255,255,0.15)"}`, color: i <= activeStep ? campaign.brand.accentColor : "rgba(255,255,255,0.4)", fontWeight: 900, fontSize: 13 }}>{i + 1}</div>
                <div style={{ fontSize: 16, lineHeight: 1.3, paddingTop: 4 }}>{step}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 26 }}>
            <div style={{ color: "rgba(255,255,255,0.46)", fontSize: 12, fontWeight: 900, letterSpacing: 2, marginBottom: 12 }}>ACTION CONSOLE</div>
            <div style={{ background: "#111827", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ color: campaign.brand.accentColor, fontFamily: "monospace", fontSize: 17, marginBottom: 18 }}>$ {scene.terminalCommand}</div>
              <div style={{ color: "rgba(255,255,255,0.76)", fontSize: 18, lineHeight: 1.45 }}>{scene.description}</div>
              <div style={{ marginTop: 22, padding: "16px 18px", borderRadius: 12, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.35)", color: "#BAE6FD", fontSize: 16 }}>{scene.terminalOutput}</div>
              <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 12, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", color: "#6EE7B7", fontWeight: 800, fontSize: 16 }}><IconCheck color="#6EE7B7" size={17} /> {scene.terminalAlert}</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneComparisonMatrix: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const rows = scene.comparisonRows || [
    { label: "Long-form reasoning", claude: "Strong", astra: "Strong" },
    { label: "Computer interaction", claude: "Tool-driven", astra: "Native focus" },
    { label: "Reviewable output", claude: "High", astra: "Workflow log" },
    { label: "Best first test", claude: "Complex thinking", astra: "Screen-based tasks" },
  ];
  const reveal = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ color: campaign.brand.primaryColor, fontSize: 15, fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>{scene.tag}</div>
        <div style={{ color: "#FFF", fontSize: 54, fontWeight: 900, letterSpacing: -1 }}>{scene.headline}</div>
      </div>
      <div style={{ width: "100%", maxWidth: 1000, alignSelf: "center", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, overflow: "hidden", opacity: reveal, transform: `translateY(${interpolate(reveal, [0, 1], [35, 0])}px)` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 1fr", padding: "20px 24px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>
          <div>WORKFLOW DIMENSION</div><div style={{ color: campaign.brand.primaryColor }}>CLAUDE</div><div style={{ color: campaign.brand.accentColor }}>ASTRA</div>
        </div>
        {rows.map((row, i) => (
          <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 1fr", padding: "23px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", color: "#FFF", fontSize: 18 }}>
            <div style={{ fontWeight: 750 }}>{row.label}</div><div style={{ color: "rgba(255,255,255,0.78)" }}>{row.claude}</div><div style={{ color: "rgba(255,255,255,0.78)" }}>{row.astra}</div>
          </div>
        ))}
        <div style={{ padding: "22px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", textAlign: "center", fontSize: 17 }}>{scene.description}</div>
      </div>
    </AbsoluteFill>
  );
};

const PlanSceneShell: React.FC<{ children: React.ReactNode; scene: MotionScene; campaign: CampaignData }> = ({ children, scene, campaign }) => (
  <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "58px 44px" }}>
    <div style={{ textAlign: "center", marginBottom: 30 }}>
      <div style={{ color: campaign.brand.primaryColor, fontSize: 14, fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>{scene.tag}</div>
      <div style={{ color: "#FFF", fontSize: 54, fontWeight: 900, letterSpacing: -1 }}>{scene.headline}</div>
    </div>
    {children}
  </AbsoluteFill>
);

const SceneFlowDiagram: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({ scene, campaign, frame, fps }) => {
  const nodes = scene.beforeAfter?.beforeItems?.length ? scene.beforeAfter.beforeItems : [scene.description || "Input", "Process", "Outcome"];
  const reveal = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <PlanSceneShell scene={scene} campaign={campaign}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 920, alignSelf: "center", opacity: reveal }}>
        {nodes.slice(0, 4).map((node, index) => (
          <React.Fragment key={`${node}-${index}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "24px 26px", borderRadius: 20, background: index === nodes.length - 1 ? `${campaign.brand.primaryColor}20` : "rgba(255,255,255,0.05)", border: `1px solid ${index === nodes.length - 1 ? campaign.brand.primaryColor : "rgba(255,255,255,0.15)"}`, transform: `translateX(${interpolate(reveal, [0, 1], [index % 2 ? 70 : -70, 0])}px)` }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${campaign.brand.primaryColor}25`, color: campaign.brand.primaryColor, fontWeight: 900 }}>{index + 1}</div>
              <div style={{ color: "#FFF", fontSize: 23, fontWeight: 750 }}>{node}</div>
              {index === nodes.length - 1 && <span style={{ marginLeft: "auto", color: campaign.brand.primaryColor, fontSize: 12, fontWeight: 900, letterSpacing: 1.5 }}>ACTIVE</span>}
            </div>
            {index < nodes.length - 1 && <div style={{ alignSelf: "center", width: 2, height: 20, background: `linear-gradient(${campaign.brand.primaryColor}, transparent)` }} />}
          </React.Fragment>
        ))}
      </div>
    </PlanSceneShell>
  );
};

const SceneChecklist: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({ scene, campaign, frame, fps }) => {
  const items = scene.items?.length ? scene.items.map((item) => typeof item === "string" ? item : item.title) : [scene.description || scene.headline];
  return (
    <PlanSceneShell scene={scene} campaign={campaign}>
      <div style={{ width: "100%", maxWidth: 920, alignSelf: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        {items.slice(0, 5).map((item, index) => {
          const progress = spring({ frame: frame - index * 8 - 8, fps, config: { damping: 14, stiffness: 130 } });
          return <div key={`${item}-${index}`} style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 24px", borderRadius: 18, background: "rgba(255,255,255,0.05)", border: `1px solid ${campaign.brand.primaryColor}66`, opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [80, 0])}px)` }}><div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${campaign.brand.primaryColor}25`, border: `1px solid ${campaign.brand.primaryColor}`, flexShrink: 0 }}><IconCheck color={campaign.brand.primaryColor} size={18} /></div><span style={{ color: "#FFF", fontSize: 21, fontWeight: 650, lineHeight: 1.35 }}>{item}</span></div>;
        })}
      </div>
    </PlanSceneShell>
  );
};

const SceneTimeline: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({ scene, campaign, frame, fps }) => {
  const items = scene.items?.length ? scene.items.map((item) => typeof item === "string" ? item : item.title) : [scene.description || scene.headline];
  const reveal = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <PlanSceneShell scene={scene} campaign={campaign}>
      <div style={{ position: "relative", width: "100%", maxWidth: 900, alignSelf: "center", paddingLeft: 36, opacity: reveal }}>
        <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, width: 2, background: `linear-gradient(${campaign.brand.primaryColor}, transparent)` }} />
        {items.slice(0, 5).map((item, index) => <div key={`${item}-${index}`} style={{ position: "relative", display: "flex", gap: 22, marginBottom: 24, transform: `translateY(${interpolate(reveal, [0, 1], [30, 0]) + index * 0}px)` }}><div style={{ position: "absolute", left: -36, top: 4, width: 26, height: 26, borderRadius: "50%", background: campaign.brand.primaryColor, boxShadow: `0 0 24px ${campaign.brand.primaryColor}` }} /><div style={{ flex: 1, padding: "18px 22px", borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", color: "#FFF", fontSize: 20, lineHeight: 1.35 }}>{item}</div></div>)}
      </div>
    </PlanSceneShell>
  );
};

const SceneFileTree: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({ scene, campaign, frame, fps }) => {
  const path = scene.terminalCommand || "upload-folder/";
  const parts = path.split(/[\\/]/).filter(Boolean);
  const reveal = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <PlanSceneShell scene={scene} campaign={campaign}>
      <div style={{ width: "100%", maxWidth: 900, alignSelf: "center", padding: 28, borderRadius: 22, background: "rgba(8,13,26,0.9)", border: `1px solid ${campaign.brand.primaryColor}77`, fontFamily: "monospace", opacity: reveal }}>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, letterSpacing: 2, marginBottom: 22 }}>FILE PATH INSPECTION</div>
        {parts.map((part, index) => <div key={`${part}-${index}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: `13px 0 13px ${index * 28}px`, color: index === parts.length - 1 ? "#FFF" : "rgba(255,255,255,0.7)", fontSize: 21, borderBottom: "1px solid rgba(255,255,255,0.07)" }}><span style={{ color: campaign.brand.primaryColor }}>{index === parts.length - 1 ? "◈" : "▸"}</span>{part}{index === parts.length - 1 && <span style={{ marginLeft: "auto", color: "#F87171", fontSize: 12, fontWeight: 900 }}>REVIEW</span>}</div>)}
        <div style={{ marginTop: 20, color: "rgba(255,255,255,0.65)", fontFamily: "inherit", fontSize: 17 }}>{scene.description}</div>
      </div>
    </PlanSceneShell>
  );
};

const SceneQuoteCard: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({ scene, campaign, frame, fps }) => {
  const reveal = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 105 } });
  return (
    <PlanSceneShell scene={scene} campaign={campaign}>
      <div style={{ width: "100%", maxWidth: 900, alignSelf: "center", padding: "50px 42px", borderRadius: 28, background: `linear-gradient(140deg, ${campaign.brand.primaryColor}1c, rgba(255,255,255,0.045))`, border: `1px solid ${campaign.brand.primaryColor}88`, boxShadow: `0 28px 70px ${campaign.brand.primaryColor}22`, opacity: reveal, transform: `scale(${interpolate(reveal, [0, 1], [0.92, 1])})` }}>
        <div style={{ color: campaign.brand.primaryColor, fontSize: 58, lineHeight: 0.7, fontFamily: "Georgia, serif" }}>“</div>
        <div style={{ color: "#FFF", fontSize: 31, lineHeight: 1.35, fontWeight: 700, marginTop: 20 }}>{scene.terminalOutput || scene.description}</div>
        <div style={{ marginTop: 30, color: campaign.brand.primaryColor, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>RESEARCHED CLAIM</div>
      </div>
    </PlanSceneShell>
  );
};

// =========================================================================
// 3. ARCHETYPE: FULL-CANVAS IMMERSIVE TERMINAL (Prism Code & Alert Recoil)
// =========================================================================
const SceneTerminal: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const cmd = scene.terminalCommand || "sentinel inspect --runtime php-fpm --block-rce";
  const typedCount = Math.min(cmd.length, Math.floor(interpolate(frame, [8, 48], [0, cmd.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const displayed = cmd.slice(0, typedCount);
  const cursorBlink = Math.sin((frame / 10) * Math.PI) > 0;

  // Alert impact screen shake recoil
  const alertTriggerFrame = 65;
  const isAlertActive = frame >= alertTriggerFrame && !!scene.terminalAlert;
  const shakeX = isAlertActive && frame < alertTriggerFrame + 14 ? Math.sin((frame - alertTriggerFrame) * 3) * 8 : 0;
  const shakeY = isAlertActive && frame < alertTriggerFrame + 14 ? Math.cos((frame - alertTriggerFrame) * 3) * 5 : 0;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 44px",
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Floating Scene Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 10 }}>
          {scene.tag || "LIVE EXECUTION"}
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.headline}
        </div>
      </div>

      {/* 3D Tilt Developer Terminal Window */}
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          background: "rgba(10, 15, 29, 0.94)",
          backdropFilter: "blur(30px)",
          border: `1.5px solid ${isAlertActive ? "rgba(239, 68, 68, 0.8)" : "rgba(255, 255, 255, 0.16)"}`,
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: isAlertActive
            ? "0 0 60px rgba(239, 68, 68, 0.35), 0 40px 100px rgba(0, 0, 0, 0.9)"
            : "0 0 50px rgba(0, 0, 0, 0.6), 0 40px 100px rgba(0, 0, 0, 0.9)",
          transform: "perspective(1100px) rotateX(6deg) rotateY(-3deg)",
          transition: "border-color 0.2s ease",
        }}
      >
        {/* macOS Chrome Header */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            padding: "20px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#27C93F" }} />
            <span style={{ marginLeft: 16, fontSize: 16, color: "rgba(248, 250, 252, 0.75)", fontFamily: "'Fira Code', monospace" }}>
              {scene.terminalTitle || "terminal.sh"}
            </span>
          </div>
          <div style={{ fontSize: 13, fontFamily: "'Fira Code', monospace", color: campaign.brand.primaryColor, background: `${campaign.brand.primaryColor}20`, padding: "4px 14px", borderRadius: 8, fontWeight: 700 }}>
            LIVE RUNTIME
          </div>
        </div>

        {/* Terminal Content */}
        <div style={{ padding: "36px 32px", minHeight: 480, fontFamily: "'Fira Code', monospace", fontSize: 21, lineHeight: 1.6 }}>
          {/* Active Command Line */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 14, fontWeight: 900, color: campaign.brand.primaryColor, fontSize: 24 }}>$</span>
            <div>{renderSyntaxTokens(displayed)}</div>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 26,
                background: cursorBlink ? campaign.brand.primaryColor : "transparent",
                marginLeft: 6,
                verticalAlign: "middle",
              }}
            />
          </div>

          {/* Dynamic Execution Stream */}
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
            {frame > 30 && (
              <div style={{ color: "#38BDF8", fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚡ AST engine parsing runtime memory hooks...</span>
                <span style={{ background: "rgba(56, 189, 248, 0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>ATTACHED</span>
              </div>
            )}
            {frame > 45 && (
              <div style={{ color: "#10B981", fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <span>✔ Sandboxed process isolation enforced (PID active)</span>
                <span style={{ background: "rgba(16, 185, 129, 0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>PASS</span>
              </div>
            )}

            {/* Terminal Output Banner */}
            {frame > 58 && scene.terminalOutput && (
              <div
                style={{
                  marginTop: 12,
                  padding: "20px 24px",
                  background: "rgba(15, 23, 42, 0.9)",
                  border: `1px solid ${campaign.brand.primaryColor}55`,
                  borderRadius: 16,
                  color: "#FFFFFF",
                  fontSize: 19,
                  fontWeight: 600,
                  boxShadow: `0 10px 30px ${campaign.brand.primaryColor}20`,
                }}
              >
                {scene.terminalOutput}
              </div>
            )}

            {/* Glowing Interception / Defense Alert */}
            {frame >= alertTriggerFrame && scene.terminalAlert && (
              <div
                style={{
                  marginTop: 16,
                  padding: "20px 26px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1.5px solid rgba(239, 68, 68, 0.6)",
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  color: "#EF4444",
                  fontWeight: 800,
                  fontSize: 20,
                  boxShadow: "0 0 40px rgba(239, 68, 68, 0.35)",
                  transform: `scale(${spring({ frame: frame - alertTriggerFrame, fps, config: { damping: 10, stiffness: 140 } })})`,
                }}
              >
                <IconAlert color="#EF4444" size={32} />
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
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            color: "rgba(248, 250, 252, 0.5)",
          }}
        >
          <span>ENGINE: REALTIME TELEMETRY</span>
          <span style={{ color: campaign.brand.primaryColor, fontWeight: 700 }}>ZERO REGRESSIONS</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 4. ARCHETYPE: HIGH-ENERGY RADIAL METRIC DIAL (Shockwave Burst)
// =========================================================================
const SceneMetricCounter: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const target = scene.metricTarget || 100;
  const count = Math.floor(interpolate(frame, [4, 42], [0, target], { extrapolateRight: "clamp" }));

  // Circular gauge circumference
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (count / 100) * circumference;

  // Expanding shockwave ring when count hits target
  const isLanded = frame >= 42;
  const shockScale = isLanded ? interpolate(frame, [42, 70], [1.0, 2.2], { extrapolateRight: "clamp" }) : 1;
  const shockOpacity = isLanded ? interpolate(frame, [42, 70], [0.8, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 10 }}>
          {scene.tag || "BENCHMARK PERFORMANCE"}
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.headline}
        </div>
      </div>

      {/* Massive Central Orbital Gauge */}
      <div style={{ position: "relative", width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
        
        {/* Expanding Shockwave Ring */}
        {isLanded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `3px solid ${campaign.brand.primaryColor}`,
              transform: `scale(${shockScale})`,
              opacity: shockOpacity,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Orbital SVG Gauge Ring */}
        <svg width="340" height="340" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="170" cy="170" r={radius} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="20" fill="transparent" />
          <circle
            cx="170"
            cy="170"
            r={radius}
            stroke={campaign.brand.primaryColor}
            strokeWidth="20"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ filter: `drop-shadow(0 0 20px ${campaign.brand.primaryColor})` }}
          />
        </svg>

        {/* Center Big Number */}
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: 88, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: -2 }}>
            {count}
            <span style={{ fontSize: 44, color: campaign.brand.primaryColor }}>{scene.metricSuffix || "%"}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: campaign.brand.primaryColor, letterSpacing: 3, textTransform: "uppercase", marginTop: 8 }}>
            EFFICIENCY
          </div>
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", marginTop: 32, textAlign: "center", maxWidth: 700 }}>
        {scene.metricLabel}
      </div>

      {/* Dual Context Cards (Dynamic, NO Hardcoded IP text!) */}
      <div style={{ display: "flex", gap: 24, marginTop: 40, width: "100%", maxWidth: 840 }}>
        <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: 24, padding: "28px 24px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "rgba(248, 250, 252, 0.5)", textTransform: "uppercase" }}>
            EXECUTION OVERHEAD
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#FFFFFF", marginTop: 8 }}>
            {scene.secondaryMetricValue || "0.2ms"}
          </div>
          <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.7)", marginTop: 4 }}>
            {scene.secondaryMetricLabel || "Runtime AST Overhead"}
          </div>
        </div>

        <div style={{ flex: 1, background: `${campaign.brand.primaryColor}14`, border: `1px solid ${campaign.brand.primaryColor}44`, borderRadius: 24, padding: "28px 24px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: campaign.brand.primaryColor, textTransform: "uppercase" }}>
            VERIFICATION
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#FFFFFF", marginTop: 8 }}>
            100%
          </div>
          <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.7)", marginTop: 4 }}>
            Deterministic Protection
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 5. ARCHETYPE: CONVERSION CTA (Apple/Stripe High-Energy Finale)
// =========================================================================
const SceneConversionCTA: React.FC<{ scene: MotionScene; campaign: CampaignData; frame: number; fps: number }> = ({
  scene,
  campaign,
  frame,
  fps,
}) => {
  const isClaude = campaign.brand.theme === "claude";
  const btnScale = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 120 } });
  const shimmerX = interpolate(frame, [15, 65], [-120, 220], { extrapolateRight: "clamp" });

  const badges = scene.trustBadges || ["DEPLOY IN 60 SECONDS", "ZERO DOWNTIME", "ENTERPRISE READY"];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 50px",
        textAlign: "center",
      }}
    >
      {/* 3D Rotating Brand Orb / Shield */}
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 36,
          background: `linear-gradient(135deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${campaign.brand.primaryColor}88`,
          transform: `scale(${spring({ frame, fps, config: { damping: 9 } })}) rotate(${Math.sin(frame / 20) * 8}deg)`,
          marginBottom: 36,
        }}
      >
        <IconShield color="#FFFFFF" size={54} />
      </div>

      <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: campaign.brand.primaryColor, marginBottom: 14 }}>
        {scene.tag || "GET STARTED TODAY"}
      </div>

      <div style={{ fontSize: 64, fontWeight: 900, color: "#FFFFFF", letterSpacing: -2, maxWidth: 880, lineHeight: 1.1, marginBottom: 44 }}>
        {scene.headline}
      </div>

      {/* Massive Glossy Gradient Button with Shimmer Sweep */}
      <div
        style={{
          transform: `scale(${btnScale})`,
          position: "relative",
          width: "100%",
          maxWidth: 620,
          height: 96,
          borderRadius: 9999,
          background: `linear-gradient(90deg, ${campaign.brand.primaryColor}, ${campaign.brand.accentColor})`,
          boxShadow: `0 0 50px ${campaign.brand.primaryColor}88, 0 20px 40px rgba(0,0,0,0.6)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        {/* Shimmer Light Reflection Sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${shimmerX}%`,
            width: 120,
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
            transform: "skewX(-25deg)",
            pointerEvents: "none",
          }}
        />

        <span style={{ fontSize: 26, fontWeight: 900, color: "#050811", letterSpacing: 1 }}>
          {scene.ctaHeadline || campaign.ctaText || "Get Started Free →"}
        </span>
      </div>

      {/* Trust Badges Floating Below */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 44 }}>
        {badges.map((b, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 9999,
              padding: "10px 22px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "rgba(248, 250, 252, 0.8)",
            }}
          >
            <IconCheck color={campaign.brand.primaryColor} size={16} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE ROUTER & CINEMATIC CAMERA RIG (Full-Canvas, Continuous Dolly)
// =========================================================================
const StudioScene: React.FC<{
  scene: MotionScene;
  campaign: CampaignData;
  durationFrames: number;
  fps: number;
}> = ({ scene, campaign, durationFrames, fps }) => {
  const frame = useCurrentFrame();

  // Continuous cinematic camera dolly (zoom from 1.0 -> 1.06)
  const camScale = interpolate(frame, [0, durationFrames], [1.0, 1.06], { extrapolateRight: "clamp" });
  const camFloatY = Math.sin((frame / fps) * 0.8) * 6;

  // Scene fade in / fade out
  const opacity = interpolate(
    frame,
    [0, 5, durationFrames - 5, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${camScale}) translateY(${camFloatY}px)`,
        transformOrigin: "center center",
      }}
    >
      {scene.sourceSceneType === "kinetic_title" && <SceneKineticHook scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "flow_diagram" && <SceneFlowDiagram scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "checklist" && <SceneChecklist scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "timeline" && <SceneTimeline scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "file_tree" && <SceneFileTree scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "quote_card" && <SceneQuoteCard scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "stat_counter" && <SceneMetricCounter scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "compare_split" && <SceneBeforeAfter scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {(scene.sourceSceneType === "terminal" || scene.sourceSceneType === "code_reveal") && <SceneTerminal scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {scene.sourceSceneType === "cta_end" && <SceneConversionCTA scene={scene} campaign={campaign} frame={frame} fps={fps} />}

      {!scene.sourceSceneType && scene.type === "kinetic_hook" && <SceneKineticHook scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {!scene.sourceSceneType && scene.type === "before_after_split" && (scene.visualStyle === "claude_workspace"
        ? <SceneClaudeWorkspace scene={scene} campaign={campaign} frame={frame} fps={fps} />
        : <SceneBeforeAfter scene={scene} campaign={campaign} frame={frame} fps={fps} />)}
      {!scene.sourceSceneType && (scene.type === "terminal_code" || (scene.type as any) === "code_terminal") && (scene.visualStyle === "astra_browser"
        ? <SceneAstraBrowser scene={scene} campaign={campaign} frame={frame} fps={fps} />
        : <SceneTerminal scene={scene} campaign={campaign} frame={frame} fps={fps} />)}
      {!scene.sourceSceneType && scene.type === "metric_counter" && (scene.visualStyle === "comparison_matrix"
        ? <SceneComparisonMatrix scene={scene} campaign={campaign} frame={frame} fps={fps} />
        : <SceneMetricCounter scene={scene} campaign={campaign} frame={frame} fps={fps} />)}
      {!scene.sourceSceneType && scene.type === "conversion_cta" && <SceneConversionCTA scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      
      {/* Fallback for other scene types */}
      {!scene.sourceSceneType && scene.type === "feature_cards" && <SceneBeforeAfter scene={scene} campaign={campaign} frame={frame} fps={fps} />}
      {!scene.sourceSceneType && scene.type === "network_topology" && <SceneTerminal scene={scene} campaign={campaign} frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

// =========================================================================
// MAIN ENTRY: Universal Motion Engine
// =========================================================================
export const UniversalMotionEngine: React.FC<{ campaign: CampaignData }> = ({ campaign }) => {
  const { fps } = useVideoConfig();
  // Audio generated by the job pipeline is copied to public/audio and may be
  // addressed as a nested staticFile path. Do not discard it in favor of the
  // ambient fallback just because it contains a slash.
  const audioTrack = campaign.audioTrack || "cyber_audio.wav";

  // Calculate timeline offsets
  let runningFrame = 0;
  const timeline = campaign.scenes.map((scene) => {
    const durationFrames = Math.round((scene.durationSeconds || 5) * fps);
    const from = runningFrame;
    runningFrame += durationFrames;
    return { scene, from, durationFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: campaign.brand.backgroundColor || "#030611", overflow: "hidden" }}>
      <Audio src={staticFile(audioTrack)} volume={0.86} />
      {/* 1. Underlying Cinematic Ambient Atmosphere */}
      <CinematicAtmosphere
        theme={campaign.brand.theme}
        primaryColor={campaign.brand.primaryColor}
        accentColor={campaign.brand.accentColor}
      />

      {/* 2. Full-Screen Cinematic Scenes */}
      {timeline.map(({ scene, from, durationFrames }, i) => (
        <Sequence key={scene.id || i} from={from} durationInFrames={durationFrames}>
          <StudioScene
            scene={scene}
            campaign={campaign}
            durationFrames={durationFrames}
            fps={fps}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
