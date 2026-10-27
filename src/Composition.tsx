import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { CampaignConfig } from "./schema";
import { HookScene } from "./scenes/HookScene";
import { ProductScene } from "./scenes/ProductScene";
import { CTAScene } from "./scenes/CTAScene";

export const MainPromo: React.FC<{ config: CampaignConfig }> = ({ config }) => {
  const frame = useCurrentFrame();

  // Subtle animated background grid / particles
  const bgShift = interpolate(frame, [0, 240], [0, 40]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: config.brand.bgColor,
        color: config.brand.textColor,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background radial gradient glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.brand.primaryColor}22 0%, transparent 70%)`,
          transform: `translate(-50%, -50%) translateY(${bgShift}px)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Scene 1: Hook (0 to 80 frames ~ 2.6s) */}
      <Sequence from={0} durationInFrames={80}>
        <HookScene config={config} />
      </Sequence>

      {/* Scene 2: Product & Feature Highlights (75 to 170 frames) */}
      <Sequence from={75} durationInFrames={95}>
        <ProductScene config={config} />
      </Sequence>

      {/* Scene 3: Call to Action (165 to 240 frames) */}
      <Sequence from={165} durationInFrames={75}>
        <CTAScene config={config} />
      </Sequence>
    </AbsoluteFill>
  );
};
