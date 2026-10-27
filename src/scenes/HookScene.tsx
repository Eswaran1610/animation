import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CampaignConfig } from "../schema";

export const HookScene: React.FC<{ config: CampaignConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Closed-form spring for title scaling
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90, mass: 0.8 },
  });

  const badgeOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleSlide = interpolate(frame, [15, 35], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lines = config.hookText.split("\n");

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
        padding: "5%",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Brand Badge */}
      <div
        style={{
          opacity: badgeOpacity,
          padding: "8px 20px",
          borderRadius: 9999,
          background: "rgba(255, 255, 255, 0.08)",
          border: `1px solid ${config.brand.primaryColor}55`,
          color: config.brand.accentColor,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 36,
        }}
      >
        {config.brand.name} • {config.brand.tagline}
      </div>

      {/* Main Punchy Hook */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          fontSize: config.aspectRatio === "9:16" ? 64 : 84,
          fontWeight: 900,
          lineHeight: 1.15,
          color: config.brand.textColor,
          maxWidth: 1200,
          letterSpacing: -1,
        }}
      >
        {lines.map((line, idx) => (
          <div
            key={idx}
            style={{
              color: idx === 1 ? config.brand.primaryColor : config.brand.textColor,
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Subtitle / Context */}
      <div
        style={{
          marginTop: 32,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleSlide}px)`,
          fontSize: 28,
          color: "rgba(248, 250, 252, 0.7)",
          maxWidth: 800,
        }}
      >
        Deterministic rendering. Pure code. 100% reproducible.
      </div>
    </div>
  );
};
