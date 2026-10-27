import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { CampaignConfig } from "./schema";

export const DynamicMotionPromo: React.FC<{ config: CampaignConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smart sticker selection based on topic/prompt
  const fullText = `${config.hookText} ${config.brand.name} ${config.brand.tagline}`.toLowerCase();
  let sticker = "ai_mascot.svg";
  if (fullText.includes("cyber") || fullText.includes("security") || fullText.includes("ztna") || fullText.includes("shield")) {
    sticker = "cyber_shield.svg";
  } else if (fullText.includes("crypto") || fullText.includes("money") || fullText.includes("fintech") || fullText.includes("growth")) {
    sticker = "coin_growth.svg";
  } else if (fullText.includes("launch") || fullText.includes("fast") || fullText.includes("speed") || fullText.includes("rocket")) {
    sticker = "rocket.svg";
  }

  // Floating cartoon bounce physics
  const floatY = Math.sin((frame / fps) * Math.PI * 2.5) * 18;
  const wiggleRot = Math.sin((frame / fps) * Math.PI * 1.5) * 5;

  const isVertical = config.aspectRatio === "9:16";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: config.brand.bgColor,
        color: config.brand.textColor,
        fontFamily: "'Segoe UI', -apple-system, Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Dynamic Animated Glow Orb */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: isVertical ? 650 : 900,
          height: isVertical ? 650 : 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.brand.primaryColor}33 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Floating Sparkles & Motion Particles */}
      {[...Array(6)].map((_, i) => {
        const pY = ((frame * (1 + i * 0.4) + i * 150) % (isVertical ? 1920 : 1080));
        const pX = (i * 220 + 80) % (isVertical ? 1080 : 1920);
        const pOpacity = interpolate(Math.sin((frame / 20) + i), [-1, 1], [0.2, 0.8]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pX,
              top: pY,
              width: 8 + (i % 3) * 4,
              height: 8 + (i % 3) * 4,
              borderRadius: "50%",
              backgroundColor: i % 2 === 0 ? config.brand.accentColor : config.brand.primaryColor,
              opacity: pOpacity,
              boxShadow: `0 0 12px ${config.brand.primaryColor}`,
            }}
          />
        );
      })}

      {/* SCENE 1: Character Hero Entrance & Hook (0 - 90 frames) */}
      <Sequence from={0} durationInFrames={90}>
        <Scene1_MascotEntrance config={config} sticker={sticker} floatY={floatY} wiggleRot={wiggleRot} isVertical={isVertical} />
      </Sequence>

      {/* SCENE 2: Feature Showcase & Interactive Cards (85 - 175 frames) */}
      <Sequence from={85} durationInFrames={95}>
        <Scene2_AnimatedCards config={config} sticker={sticker} floatY={floatY} isVertical={isVertical} />
      </Sequence>

      {/* SCENE 3: Punchy CTA & Mascot Celebration (170 - 240 frames) */}
      <Sequence from={170} durationInFrames={70}>
        <Scene3_MascotCTA config={config} sticker={sticker} floatY={floatY} isVertical={isVertical} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Scene 1: Mascot Springs in with Topic Title
const Scene1_MascotEntrance: React.FC<{ config: CampaignConfig; sticker: string; floatY: number; wiggleRot: number; isVertical: boolean }> = ({
  config,
  sticker,
  floatY,
  wiggleRot,
  isVertical,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bouncy Cartoon Mascot Spring
  const mascotScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.6 },
  });

  const titleSlide = interpolate(frame, [10, 30], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "60px",
        boxSizing: "border-box",
      }}
    >
      {/* 2D Animated Cartoon Mascot Character */}
      <div
        style={{
          transform: `scale(${mascotScale}) translateY(${floatY}px) rotate(${wiggleRot}deg)`,
          width: isVertical ? 320 : 260,
          height: isVertical ? 320 : 260,
          marginBottom: isVertical ? 40 : 24,
          filter: `drop-shadow(0 20px 30px ${config.brand.primaryColor}66)`,
        }}
      >
        <Img src={staticFile(`stickers/${sticker}`)} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Brand Badge */}
      <div
        style={{
          opacity: titleOpacity,
          padding: "8px 22px",
          borderRadius: 9999,
          background: "rgba(255, 255, 255, 0.08)",
          border: `1px solid ${config.brand.primaryColor}55`,
          color: config.brand.accentColor,
          fontSize: isVertical ? 22 : 18,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        {config.brand.name} • {config.brand.tagline}
      </div>

      {/* Main Kinetic Hook */}
      <div
        style={{
          transform: `translateY(${titleSlide}px)`,
          opacity: titleOpacity,
          fontSize: isVertical ? 62 : 68,
          fontWeight: 900,
          lineHeight: 1.15,
          color: "#FFFFFF",
          maxWidth: isVertical ? 900 : 1100,
          letterSpacing: -1,
        }}
      >
        {config.hookText}
      </div>
    </div>
  );
};

// Scene 2: Interactive Feature Cards with Mascot Peeking
const Scene2_AnimatedCards: React.FC<{ config: CampaignConfig; sticker: string; floatY: number; isVertical: boolean }> = ({
  config,
  sticker,
  floatY,
  isVertical,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        justifyContent: "center",
        alignItems: "center",
        gap: isVertical ? 36 : 60,
        padding: "60px",
        boxSizing: "border-box",
      }}
    >
      {/* 2D Cartoon Character Badge */}
      <div
        style={{
          transform: `translateY(${floatY}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: isVertical ? 200 : 220, height: isVertical ? 200 : 220, filter: `drop-shadow(0 15px 25px ${config.brand.accentColor}55)` }}>
        </div>
        <div style={{ marginTop: 12, fontSize: 38, fontWeight: 900, color: config.brand.accentColor }}>
          {config.metrics.metricValue}
        </div>
        <div style={{ fontSize: 18, color: "rgba(248, 250, 252, 0.7)", fontWeight: 600 }}>
          {config.metrics.metricLabel}
        </div>
      </div>

      {/* Feature Cards Staggered Animation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: isVertical ? "100%" : 650 }}>
        {config.features.map((feat, idx) => {
          const delay = 10 + idx * 12;
          const slide = interpolate(frame, [delay, delay + 18], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const op = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={idx}
              style={{
                transform: `translateX(${slide}px)`,
                opacity: op,
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.85))",
                border: `1px solid ${config.brand.primaryColor}44`,
                padding: isVertical ? "20px 24px" : "18px 28px",
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${config.brand.primaryColor}, ${config.brand.accentColor})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#FFFFFF",
                }}
              >
                ★
              </div>
              <div style={{ fontSize: isVertical ? 24 : 22, fontWeight: 700, color: "#FFFFFF" }}>{feat}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Scene 3: Mascot CTA Conversion
const Scene3_MascotCTA: React.FC<{ config: CampaignConfig; sticker: string; floatY: number; isVertical: boolean }> = ({
  config,
  sticker,
  floatY,
  isVertical,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const btnSpring = spring({ frame, fps, config: { damping: 11, stiffness: 110, mass: 0.5 } });
  const pulseGlow = interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [15, 45]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "60px",
        boxSizing: "border-box",
      }}
    >
      {/* 2D Mascot Celebrating */}
      <div
        style={{
          transform: `scale(${btnSpring}) translateY(${floatY}px)`,
          width: isVertical ? 220 : 180,
          height: isVertical ? 220 : 180,
          marginBottom: 28,
          filter: `drop-shadow(0 15px 35px ${config.brand.primaryColor}88)`,
        }}
      >
        <Img src={staticFile(`stickers/${sticker}`)} style={{ width: "100%", height: "100%" }} />
      </div>

      <div style={{ fontSize: isVertical ? 48 : 54, fontWeight: 900, marginBottom: 28, letterSpacing: -1 }}>
        Ready to Build Faster?
      </div>

      {/* Button */}
      <div
        style={{
          transform: `scale(${btnSpring})`,
          background: `linear-gradient(135deg, ${config.brand.primaryColor}, ${config.brand.accentColor})`,
          padding: isVertical ? "24px 60px" : "20px 54px",
          borderRadius: 20,
          fontSize: isVertical ? 34 : 32,
          fontWeight: 800,
          color: "#050811",
          boxShadow: `0 10px ${pulseGlow}px ${config.brand.primaryColor}88`,
          cursor: "pointer",
        }}
      >
        {config.ctaText} →
      </div>

      <div style={{ marginTop: 22, fontSize: 20, color: "rgba(248, 250, 252, 0.65)", fontWeight: 500 }}>
        {config.ctaSubtext}
      </div>
    </div>
  );
};
