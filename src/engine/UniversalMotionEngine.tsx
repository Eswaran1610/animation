import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import { CampaignData } from "./schema";
import { campaignToMotionPlan, MotionPlan, PlanSchema } from "./plan";
import { buildSfxCues, musicDuckMultiplier } from "./sfx";

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

const IconZap: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconLayers: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconDatabase: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconServer: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
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
// CINEMATIC BACKGROUND: Supports 5 Unique Visual Background Styles
// =========================================================================
const CinematicAtmosphere: React.FC<{
  backgroundType: "aurora" | "grid" | "paper" | "gradient" | "noise";
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  styleSeed: string;
  isClaude: boolean;
}> = ({ backgroundType, primaryColor, accentColor, backgroundColor, styleSeed, isClaude }) => {
  const frame = useCurrentFrame();

  if (backgroundType === "paper" || isClaude) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#181714", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 32,
            border: "1px solid rgba(245, 241, 232, 0.08)",
            borderRadius: 16,
            pointerEvents: "none",
          }}
        >
          <span style={{ position: "absolute", top: -8, left: -8, color: "rgba(245, 241, 232, 0.3)", fontSize: 14 }}>+</span>
          <span style={{ position: "absolute", top: -8, right: -8, color: "rgba(245, 241, 232, 0.3)", fontSize: 14 }}>+</span>
          <span style={{ position: "absolute", bottom: -8, left: -8, color: "rgba(245, 241, 232, 0.3)", fontSize: 14 }}>+</span>
          <span style={{ position: "absolute", bottom: -8, right: -8, color: "rgba(245, 241, 232, 0.3)", fontSize: 14 }}>+</span>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 25%, rgba(217, 119, 87, 0.12), transparent 70%)",
          }}
        />
      </AbsoluteFill>
    );
  }

  if (backgroundType === "grid") {
    const gridOffsetY = (frame * 1.0) % 60;
    return (
      <AbsoluteFill style={{ backgroundColor, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: 0,
            right: 0,
            height: "40%",
            background: `radial-gradient(ellipse at center, ${primaryColor}22, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -200,
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: `0px ${gridOffsetY}px`,
            transform: "perspective(800px) rotateX(48deg) translateY(-80px)",
            transformOrigin: "center top",
            opacity: 0.8,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 85%)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 35%, rgba(2, 6, 23, 0.85) 100%)", pointerEvents: "none" }} />
      </AbsoluteFill>
    );
  }

  if (backgroundType === "gradient") {
    const angle = (frame * 0.4) % 360;
    return (
      <AbsoluteFill style={{ backgroundColor, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: -100,
            background: `linear-gradient(${angle}deg, ${backgroundColor} 0%, ${primaryColor}25 45%, ${accentColor}20 75%, ${backgroundColor} 100%)`,
            filter: "blur(60px)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 40%, rgba(3, 6, 17, 0.9) 100%)" }} />
      </AbsoluteFill>
    );
  }

  if (backgroundType === "noise") {
    const stars = Array.from({ length: 18 }).map((_, i) => {
      const baseX = ((i * 59) % 100);
      const baseY = ((i * 47) % 100);
      const driftY = (baseY - (frame * 0.15) % 100 + 100) % 100;
      const opacity = 0.2 + (Math.sin((frame + i * 20) / 15) + 1) * 0.35;
      const size = (i % 3) + 2;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${baseX}%`,
            top: `${driftY}%`,
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: i % 2 === 0 ? primaryColor : "#FFFFFF",
            boxShadow: `0 0 10px ${primaryColor}`,
            opacity,
          }}
        />
      );
    });

    return (
      <AbsoluteFill style={{ backgroundColor, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 50% at 50% 30%, ${primaryColor}18, transparent 75%)` }} />
        {stars}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 30%, rgba(3, 6, 17, 0.9) 100%)" }} />
      </AbsoluteFill>
    );
  }

  // Default: "aurora" volumetric Perlin noise mesh
  const x1 = 50 + noise2D(`${styleSeed}_aurora_x`, frame / 180, 0) * 22;
  const y1 = 35 + noise2D(`${styleSeed}_aurora_y`, 0, frame / 180) * 18;
  const x2 = 50 + noise2D(`${styleSeed}_aurora_x2`, frame / 150, 1) * 25;
  const y2 = 70 + noise2D(`${styleSeed}_aurora_y2`, 1, frame / 150) * 20;

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(75% 55% at ${x1}% ${y1}%, ${primaryColor}28, transparent 75%),
            radial-gradient(65% 50% at ${x2}% ${y2}%, ${accentColor}20, transparent 75%)
          `,
          filter: "blur(40px)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 30%, rgba(3, 6, 17, 0.85) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// =========================================================================
// 1. SCENE ARCHETYPE: KINETIC HOOK
// =========================================================================
const SceneKineticHook: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const headline = scene.content.headline || "Transform Your Product In Motion";
  const words = headline.split(" ");
  const isClaude = plan.meta.mood === "claude" || plan.theme.background === "paper";
  const primaryColor = plan.theme.palette.primary;

  const impactFrame = 14;
  const shake = frame > impactFrame && frame < impactFrame + 10 ? Math.sin((frame - impactFrame) * 2.5) * 6 : 0;
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
          background: `${primaryColor}18`,
          border: `1px solid ${primaryColor}88`,
          borderRadius: 9999,
          padding: "10px 28px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: `0 0 35px ${primaryColor}44`,
          marginBottom: 36,
          transform: `scale(${spring({ frame, fps, config: { damping: 10, stiffness: 120 } })})`,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }} />
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, fontFamily: isClaude ? "Georgia, serif" : "monospace" }}>
          {scene.content.eyebrow || "CRITICAL ALERT"}
        </span>
      </div>

      {/* Giant Kinetic Words Slamming Down */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 24px", maxWidth: 960, perspective: 1000 }}>
        {words.map((w, i) => {
          const wSpring = spring({ frame: frame - i * 3, fps, config: { damping: 11, stiffness: 140, mass: 0.6 } });
          const wY = interpolate(wSpring, [0, 1], [-60, 0]);
          const wRotX = interpolate(wSpring, [0, 1], [40, 0]);
          const isAccent = i === 1 || i === words.length - 1;

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
                fontFamily: isClaude ? "Georgia, serif" : plan.theme.fonts.heading,
                color: isAccent ? primaryColor : plan.theme.palette.foreground,
                textShadow: isAccent ? `0 0 50px ${primaryColor}aa, 0 0 90px ${primaryColor}44` : "0 10px 30px rgba(0,0,0,0.8)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* Supporting Context Card */}
      {scene.content.body && (
        <div
          style={{
            marginTop: 56,
            maxWidth: 880,
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 24,
            padding: "28px 32px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
            transform: `perspective(1000px) rotateX(10deg) scale(${spring({ frame: frame - 10, fps, config: { damping: 14 } })})`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${streakX}%`, width: 140, background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)", transform: "skewX(-25deg)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, textAlign: "left" }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: `${primaryColor}22`, border: `1px solid ${primaryColor}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconAlert color={primaryColor} size={28} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.35 }}>
              {scene.content.body}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// =========================================================================
// 2. SCENE ARCHETYPE: TYPING TERMINAL
// =========================================================================
const SceneTerminal: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const cmd = scene.content.command || "npx remotion render --prod";
  const typedCount = Math.min(cmd.length, Math.floor(interpolate(frame, [8, 48], [0, cmd.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const displayed = cmd.slice(0, typedCount);
  const cursorBlink = Math.sin((frame / 10) * Math.PI) > 0;

  const alertTriggerFrame = 58;
  const isAlertActive = frame >= alertTriggerFrame && !!scene.content.output;
  const shakeX = isAlertActive && frame < alertTriggerFrame + 12 ? Math.sin((frame - alertTriggerFrame) * 3) * 7 : 0;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 44px",
        transform: `translate(${shakeX}px, 0)`,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "TERMINAL RUNTIME"}
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Verified Execution"}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "rgba(10, 15, 29, 0.94)",
          backdropFilter: "blur(30px)",
          border: `1.5px solid ${isAlertActive ? `${primaryColor}aa` : "rgba(255, 255, 255, 0.16)"}`,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: `0 0 50px rgba(0, 0, 0, 0.6), 0 40px 100px rgba(0, 0, 0, 0.9)`,
          transform: "perspective(1100px) rotateX(6deg) rotateY(-3deg)",
        }}
      >
        <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }} />
            <span style={{ marginLeft: 14, fontSize: 15, color: "rgba(248, 250, 252, 0.7)", fontFamily: plan.theme.fonts.mono }}>
              terminal.sh — zsh
            </span>
          </div>
          <div style={{ fontSize: 12, fontFamily: plan.theme.fonts.mono, color: primaryColor, background: `${primaryColor}20`, padding: "4px 12px", borderRadius: 6, fontWeight: 700 }}>
            ACTIVE RUNTIME
          </div>
        </div>

        <div style={{ padding: "32px 28px", minHeight: 400, fontFamily: plan.theme.fonts.mono, fontSize: 20, lineHeight: 1.6 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 12, fontWeight: 900, color: primaryColor, fontSize: 24 }}>$</span>
            <div>{renderSyntaxTokens(displayed)}</div>
            <span style={{ display: "inline-block", width: 12, height: 24, background: cursorBlink ? primaryColor : "transparent", marginLeft: 6 }} />
          </div>

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            {frame > 26 && (
              <div style={{ color: "#38BDF8", fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚡ AST engine parsing runtime memory hooks...</span>
                <span style={{ background: "rgba(56, 189, 248, 0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>ATTACHED</span>
              </div>
            )}
            {frame > alertTriggerFrame && scene.content.output && (
              <div
                style={{
                  marginTop: 12,
                  padding: "18px 22px",
                  background: "rgba(15, 23, 42, 0.95)",
                  border: `1.5px solid ${primaryColor}77`,
                  borderRadius: 14,
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: 600,
                  boxShadow: `0 10px 30px ${primaryColor}25`,
                  whiteSpace: "pre-line",
                  transform: `scale(${spring({ frame: frame - alertTriggerFrame, fps, config: { damping: 11 } })})`,
                }}
              >
                {scene.content.output}
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 3. SCENE ARCHETYPE: CODE DIFF (Dedicated Side-by-Side AST Diff)
// =========================================================================
const SceneCodeDiff: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const beforeText = typeof scene.content.before === "string" ? scene.content.before : Array.isArray(scene.content.before) ? scene.content.before.join("\n") : "const raw = req.body;\neval(raw.command);";
  const afterText = typeof scene.content.after === "string" ? scene.content.after : Array.isArray(scene.content.after) ? scene.content.after.join("\n") : "const safe = Schema.parse(req.body);\nawait dispatch(safe);";

  const streakX = interpolate(frame, [15, 55], [-50, 150], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "50px 40px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "AST CODE TRANSFORMATION"}
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Zero-Regression Code Evolution"}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "rgba(10, 15, 29, 0.94)",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.15)",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${streakX}%`, width: 140, background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)", transform: "skewX(-25deg)", pointerEvents: "none" }} />
        
        <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontFamily: plan.theme.fonts.mono, color: "#94A3B8" }}>diff --git a/pipeline.ts b/pipeline.ts</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#10B981", background: "rgba(16, 185, 129, 0.15)", padding: "4px 10px", borderRadius: 6 }}>
            100% VERIFIED
          </span>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: 16, padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EF4444", fontSize: 13, fontWeight: 800, marginBottom: 8, textTransform: "uppercase" }}>
              <IconCross color="#EF4444" size={16} />
              <span>BEFORE: FRAGILE / UNVERIFIED</span>
            </div>
            <pre style={{ margin: 0, color: "#FCA5A5", fontFamily: plan.theme.fonts.mono, fontSize: 18, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {beforeText.split("\n").map((line) => ` - ${line}`).join("\n")}
            </pre>
          </div>

          <div style={{ background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: 16, padding: "18px 22px", transform: `scale(${spring({ frame: frame - 12, fps, config: { damping: 12 } })})` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10B981", fontSize: 13, fontWeight: 800, marginBottom: 8, textTransform: "uppercase" }}>
              <IconCheck color="#10B981" size={16} />
              <span>AFTER: DETERMINISTIC / TYPE-SAFE</span>
            </div>
            <pre style={{ margin: 0, color: "#86EFAC", fontFamily: plan.theme.fonts.mono, fontSize: 18, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {afterText.split("\n").map((line) => ` + ${line}`).join("\n")}
            </pre>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 4. SCENE ARCHETYPE: CARD REVEAL (Staggered 3D Floating Feature Cards)
// =========================================================================
const SceneCardReveal: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const items = scene.content.items && scene.content.items.length > 0 ? scene.content.items : ["Unified Modality Engine", "Serverless GPU Inference", "Multi-Region Cloud Sync"];
  const icons = [IconSparkle, IconZap, IconLayers, IconShield];

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
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "CORE CAPABILITIES"}
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Everything AI Teams Need"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", maxWidth: 920 }}>
        {items.map((item, i) => {
          const itemSpring = spring({ frame: frame - i * 8, fps, config: { damping: 11, stiffness: 120 } });
          const itemX = interpolate(itemSpring, [0, 1], [-40, 0]);
          const IconComp = icons[i % icons.length];

          return (
            <div
              key={i}
              style={{
                transform: `translateX(${itemX}px) scale(${itemSpring})`,
                opacity: itemSpring,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 20,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                backdropFilter: "blur(20px)",
                boxShadow: "0 15px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: `${primaryColor}22`,
                  border: `1px solid ${primaryColor}77`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 0 20px ${primaryColor}33`,
                }}
              >
                <IconComp color={primaryColor} size={26} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: primaryColor, textTransform: "uppercase" }}>
                  CAPABILITY 0${i + 1}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 4 }}>
                  {item}
                </div>
              </div>

              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${primaryColor}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconCheck color={primaryColor} size={18} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 5. SCENE ARCHETYPE: STAT COUNTER (Radial Gauge & Shockwave Impact)
// =========================================================================
const SceneStatCounter: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const rawVal = scene.content.value || "98%";
  const targetNumber = Number.parseFloat(rawVal.replace(/[^0-9.]/g, "")) || 98;
  const suffix = rawVal.match(/[%a-zA-Z+]+$/)?.[0] || "%";

  const count = Math.floor(interpolate(frame, [4, 42], [0, targetNumber], { extrapolateRight: "clamp" }));

  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (count / 100) * circumference;

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
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "VERIFIED VELOCITY"}
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Measurable Production Velocity"}
        </div>
      </div>

      <div style={{ position: "relative", width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isLanded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `3px solid ${primaryColor}`,
              transform: `scale(${shockScale})`,
              opacity: shockOpacity,
              pointerEvents: "none",
            }}
          />
        )}

        <svg width="340" height="340" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="170" cy="170" r={radius} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="20" fill="transparent" />
          <circle
            cx="170"
            cy="170"
            r={radius}
            stroke={primaryColor}
            strokeWidth="20"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ filter: `drop-shadow(0 0 20px ${primaryColor})` }}
          />
        </svg>

        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: 84, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: -2 }}>
            {count}
            <span style={{ fontSize: 42, color: primaryColor }}>{suffix}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: primaryColor, letterSpacing: 3, textTransform: "uppercase", marginTop: 8 }}>
            METRIC IMPACT
          </div>
        </div>
      </div>

      <div style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", marginTop: 28, textAlign: "center", maxWidth: 720 }}>
        {scene.content.label || "Cycle Time Reduction"}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 6. SCENE ARCHETYPE: QUOTE (Editorial Testimonial)
// =========================================================================
const SceneQuote: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const quoteText = scene.content.quote || scene.content.headline || "The fastest way to build and evaluate multimodal models in production.";
  const attribution = scene.content.attribution || "Frontier AI Lab Benchmark";
  const quoteSpring = spring({ frame, fps, config: { damping: 12 } });

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
      <div style={{ fontSize: 160, lineHeight: 0.6, color: primaryColor, opacity: 0.45, fontFamily: "Georgia, serif", marginBottom: 24 }}>
        “
      </div>

      <div
        style={{
          transform: `scale(${quoteSpring})`,
          fontSize: 48,
          fontWeight: 700,
          fontStyle: "italic",
          fontFamily: plan.theme.fonts.heading,
          color: plan.theme.palette.foreground,
          lineHeight: 1.25,
          maxWidth: 900,
          letterSpacing: -1,
        }}
      >
        {quoteText}
      </div>

      <div
        style={{
          marginTop: 48,
          background: "rgba(255, 255, 255, 0.05)",
          border: `1px solid ${primaryColor}55`,
          borderRadius: 9999,
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: `0 10px 30px ${primaryColor}22`,
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#000" }}>
          ★
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#FFFFFF" }}>{attribution}</div>
          <div style={{ fontSize: 12, color: primaryColor, fontWeight: 700 }}>VERIFIED PARTNER</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 7. SCENE ARCHETYPE: LIST BUILD (Step-by-Step Progressive Timeline)
// =========================================================================
const SceneListBuild: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const items = scene.content.items && scene.content.items.length > 0 ? scene.content.items : ["Ingest Telemetry Data", "Execute Real-Time Checks", "Instant Deterministic Settlement"];

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
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "WORKFLOW EXECUTION"}
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Step-by-Step Architecture"}
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 880 }}>
        <div style={{ position: "absolute", left: 32, top: 20, bottom: 20, width: 3, background: `linear-gradient(to bottom, ${primaryColor}, transparent)`, opacity: 0.6 }} />

        {items.map((item, idx) => {
          const stepSpring = spring({ frame: frame - idx * 10, fps, config: { damping: 12 } });

          return (
            <div
              key={idx}
              style={{
                transform: `translateX(${interpolate(stepSpring, [0, 1], [-30, 0])}px) scale(${stepSpring})`,
                opacity: stepSpring,
                display: "flex",
                alignItems: "center",
                gap: 24,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 20,
                padding: "20px 24px",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: `${primaryColor}22`,
                  border: `2px solid ${primaryColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 20,
                  color: primaryColor,
                  flexShrink: 0,
                  boxShadow: `0 0 15px ${primaryColor}55`,
                }}
              >
                0${idx + 1}
              </div>

              <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF" }}>
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 8. SCENE ARCHETYPE: BEFORE / AFTER SPLIT
// =========================================================================
const SceneBeforeAfter: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const beforeItems = Array.isArray(scene.content.before) ? scene.content.before : [scene.content.before || "Manual fragile workflows"];
  const afterItems = Array.isArray(scene.content.after) ? scene.content.after : [scene.content.after || "100% Deterministic execution"];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "50px 40px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "TRANSFORMATION"}
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Legacy vs Modern Architecture"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 960 }}>
        <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 24, padding: "28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EF4444", fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
            <IconCross color="#EF4444" size={18} />
            <span>LEGACY MANUAL APPROACH</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {beforeItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#EF4444", fontWeight: 900 }}>✕</span>
                <span style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.8)", fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, background: `${primaryColor}14`, border: `1.5px solid ${primaryColor}77`, borderRadius: 24, padding: "28px 24px", transform: `scale(${spring({ frame: frame - 6, fps, config: { damping: 11 } })})`, boxShadow: `0 10px 40px ${primaryColor}22` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: primaryColor, fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
            <IconCheck color={primaryColor} size={18} />
            <span>MODERN AUTOMATED ENGINE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {afterItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: primaryColor, fontWeight: 900 }}>✔</span>
                <span style={{ fontSize: 18, color: "#FFFFFF", fontWeight: 700 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 9. SCENE ARCHETYPE: NETWORK TOPOLOGY (Architectural Node Graph)
// =========================================================================
const SceneNetworkTopology: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const nodes = scene.content.nodes && scene.content.nodes.length >= 2 ? scene.content.nodes : [
    { id: "1", label: "Client Request" },
    { id: "2", label: "Zero-Trust Proxy" },
    { id: "3", label: "Microservice Node" },
    { id: "4", label: "Encrypted Vault" },
  ];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 44px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 8 }}>
          {scene.content.eyebrow || "SYSTEM TOPOLOGY"}
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: "#FFFFFF", letterSpacing: -1 }}>
          {scene.content.headline || "Decoupled Zero-Trust Flow"}
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 880, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ position: "absolute", left: 38, top: 30, bottom: 30, width: 4, background: `linear-gradient(to bottom, ${primaryColor}, #38BDF8)`, opacity: 0.6 }} />

        {nodes.map((node, i) => {
          const nodeSpring = spring({ frame: frame - i * 8, fps, config: { damping: 11 } });
          const icons = [IconTerminal, IconShield, IconServer, IconDatabase];
          const IconComp = icons[i % icons.length];

          return (
            <div
              key={node.id}
              style={{
                transform: `scale(${nodeSpring})`,
                opacity: nodeSpring,
                display: "flex",
                alignItems: "center",
                gap: 20,
                background: "rgba(15, 23, 42, 0.9)",
                border: `1.5px solid ${i === 1 ? primaryColor : "rgba(255, 255, 255, 0.15)"}`,
                borderRadius: 20,
                padding: "20px 24px",
                backdropFilter: "blur(20px)",
                boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5)`,
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${primaryColor}22`, border: `1px solid ${primaryColor}77`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconComp color={primaryColor} size={24} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: primaryColor, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  NODE 0${i + 1} • ACTIVE
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
                  {node.label}
                </div>
              </div>

              <span style={{ fontSize: 11, fontWeight: 800, color: "#10B981", background: "rgba(16, 185, 129, 0.15)", padding: "4px 10px", borderRadius: 6 }}>
                AUTHORIZED
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// 10. SCENE ARCHETYPE: CALL TO ACTION (Conversion Finale)
// =========================================================================
const SceneConversionCTA: React.FC<{ scene: MotionPlan["scenes"][number]; plan: MotionPlan; frame: number; fps: number }> = ({
  scene,
  plan,
  frame,
  fps,
}) => {
  const primaryColor = plan.theme.palette.primary;
  const accentColor = plan.theme.palette.accent;
  const btnScale = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 120 } });
  const shimmerX = interpolate(frame, [15, 65], [-120, 220], { extrapolateRight: "clamp" });
  const badges = ["100% DETERMINISTIC", "ZERO OVERHEAD", "DEPLOY IN 60 SECONDS"];

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
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 32,
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${primaryColor}88`,
          transform: `scale(${spring({ frame, fps, config: { damping: 9 } })}) rotate(${Math.sin(frame / 20) * 8}deg)`,
          marginBottom: 32,
        }}
      >
        <IconShield color="#FFFFFF" size={50} />
      </div>

      <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: primaryColor, marginBottom: 12 }}>
        {scene.content.eyebrow || "GET STARTED TODAY"}
      </div>

      <div style={{ fontSize: 60, fontWeight: 900, color: "#FFFFFF", letterSpacing: -2, maxWidth: 880, lineHeight: 1.1, marginBottom: 40 }}>
        {scene.content.headline || "Deploy Your Vision Today"}
      </div>

      <div
        style={{
          transform: `scale(${btnScale})`,
          position: "relative",
          width: "100%",
          maxWidth: 600,
          height: 92,
          borderRadius: 9999,
          background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
          boxShadow: `0 0 50px ${primaryColor}88, 0 20px 40px rgba(0,0,0,0.6)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${shimmerX}%`, width: 120, background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)", transform: "skewX(-25deg)", pointerEvents: "none" }} />
        <span style={{ fontSize: 26, fontWeight: 900, color: "#050811", letterSpacing: 1 }}>
          {scene.content.cta || "Get Started Free →"}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 40 }}>
        {badges.map((b, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 9999,
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "rgba(248, 250, 252, 0.8)",
            }}
          >
            <IconCheck color={primaryColor} size={15} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// =========================================================================
// SCENE ROUTER & CINEMATIC CAMERA RIG (Dynamic Per-Archetype Motion)
// =========================================================================
const StudioScene: React.FC<{
  scene: MotionPlan["scenes"][number];
  plan: MotionPlan;
  sceneIndex: number;
  durationFrames: number;
  fps: number;
}> = ({ scene, plan, sceneIndex, durationFrames, fps }) => {
  const frame = useCurrentFrame();

  let camScale = 1.0;
  if (scene.type === "kinetic_hook") {
    camScale = interpolate(frame, [0, 14, durationFrames], [0.93, 1.02, 1.05], { extrapolateRight: "clamp" });
  } else if (scene.type === "typing_terminal") {
    camScale = interpolate(frame, [0, durationFrames], [1.02, 1.0], { extrapolateRight: "clamp" });
  } else if (scene.type === "stat_counter") {
    camScale = interpolate(frame, [0, 42, durationFrames], [0.96, 1.04, 1.06], { extrapolateRight: "clamp" });
  } else if (scene.type === "cta") {
    camScale = interpolate(frame, [0, durationFrames], [1.06, 1.0], { extrapolateRight: "clamp" });
  } else {
    camScale = interpolate(frame, [0, durationFrames], [1.0, 1.04], { extrapolateRight: "clamp" });
  }

  const camFloatY = Math.sin((frame / fps) * 0.7 + sceneIndex) * 5;
  const enterY = interpolate(frame, [0, 8], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitY = interpolate(frame, [durationFrames - 6, durationFrames], [0, -16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const opacity = interpolate(
    frame,
    [0, 6, durationFrames - 6, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${camScale}) translateY(${camFloatY + enterY + exitY}px)`,
        transformOrigin: "center center",
      }}
    >
      {scene.type === "kinetic_hook" && <SceneKineticHook scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "typing_terminal" && <SceneTerminal scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "code_diff" && <SceneCodeDiff scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "card_reveal" && <SceneCardReveal scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "stat_counter" && <SceneStatCounter scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "quote" && <SceneQuote scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "list_build" && <SceneListBuild scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "before_after" && <SceneBeforeAfter scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "network_topology" && <SceneNetworkTopology scene={scene} plan={plan} frame={frame} fps={fps} />}
      {scene.type === "cta" && <SceneConversionCTA scene={scene} plan={plan} frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

// =========================================================================
// MAIN ENTRY: Universal Motion Engine
// =========================================================================
type UniversalMotionEngineProps = { plan?: MotionPlan; campaign?: CampaignData };

export const UniversalMotionEngine: React.FC<UniversalMotionEngineProps> = ({ plan: planInput, campaign: legacyCampaign }) => {
  const { fps } = useVideoConfig();
  const plan = PlanSchema.parse(planInput ?? campaignToMotionPlan(legacyCampaign!));

  const timeline = plan.scenes.map((scene, index) => {
    const durationFrames = Math.round(scene.dur * fps);
    const from = Math.round(scene.start * fps);
    return { scene, from, durationFrames, index };
  });

  const runningFrame = Math.max(...timeline.map(({ from, durationFrames }) => from + durationFrames));
  const sfxCues = buildSfxCues(plan);
  const isClaude = plan.meta.mood === "claude" || plan.theme.background === "paper";

  return (
    <AbsoluteFill style={{ backgroundColor: plan.theme.palette.background, overflow: "hidden" }}>
      {/* 1. Dynamic Atmosphere: One of 5 Distinct Background Styles */}
      <CinematicAtmosphere
        backgroundType={plan.theme.background}
        primaryColor={plan.theme.palette.primary}
        accentColor={plan.theme.palette.accent}
        backgroundColor={plan.theme.palette.background}
        styleSeed={plan.meta.styleSeed}
        isClaude={isClaude}
      />

      {/* 2. Full-Screen Cinematic Scenes with Dedicated Components */}
      {timeline.map(({ scene, from, durationFrames, index }) => (
        <Sequence key={scene.id || index} from={from} durationInFrames={durationFrames}>
          <StudioScene
            scene={scene}
            plan={plan}
            sceneIndex={index}
            durationFrames={durationFrames}
            fps={fps}
          />
        </Sequence>
      ))}

      {/* 3. Audio Bed Soundtrack */}
      {plan.audio.bed.asset && (
        <Audio
          src={staticFile(plan.audio.bed.asset)}
          volume={(f) =>
            interpolate(
              f,
              [0, 15, Math.max(16, runningFrame - 30), runningFrame],
              [0, 0.65, 0.65, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ) * musicDuckMultiplier(f, fps, sfxCues)
          }
        />
      )}

      {/* 4. Procedural Motion SFX */}
      {sfxCues.map((sfx) => (
        <Sequence key={`sfx_${sfx.id}`} from={Math.round(sfx.at * fps)} durationInFrames={Math.round(fps * 1.5)}>
          <Audio src={staticFile(sfx.src)} volume={sfx.volume} playbackRate={sfx.playbackRate} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
