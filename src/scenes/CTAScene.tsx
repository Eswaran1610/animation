import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CampaignConfig } from "../schema";

export const CTAScene: React.FC<{ config: CampaignConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // CTA button spring
  const buttonScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.6 },
  });

  const glowPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [20, 45]
  );

  const subtextOpacity = interpolate(frame, [12, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
      }}
    >
      {/* Brand Name */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: config.brand.accentColor,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 36,
        }}
      >
        {config.brand.name}
      </div>

      {/* Primary Action Button */}
      <div
        style={{
          transform: `scale(${buttonScale})`,
          background: `linear-gradient(135deg, ${config.brand.primaryColor}, ${config.brand.accentColor})`,
          padding: "24px 64px",
          borderRadius: 18,
          fontSize: config.aspectRatio === "9:16" ? 36 : 44,
          fontWeight: 800,
          color: "#FFFFFF",
          boxShadow: `0 10px ${glowPulse}px ${config.brand.primaryColor}88`,
          cursor: "pointer",
          letterSpacing: -0.5,
        }}
      >
        {config.ctaText} →
      </div>

      {/* Subtext */}
      <div
        style={{
          marginTop: 28,
          opacity: subtextOpacity,
          fontSize: 24,
          color: "rgba(248, 250, 252, 0.75)",
          fontWeight: 500,
        }}
      >
        {config.ctaSubtext}
      </div>
    </div>
  );
};
