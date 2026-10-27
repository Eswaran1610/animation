import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CampaignConfig } from "../schema";

export const ProductScene: React.FC<{ config: CampaignConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Distinct edge/container spring animation
  const containerScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80, mass: 0.9 },
  });

  const cardTranslateY = interpolate(frame, [0, 20], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Metric counter simulation
  const progressRatio = interpolate(frame, [15, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isVertical = config.aspectRatio === "9:16";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        justifyContent: "center",
        alignItems: "center",
        padding: "5%",
        gap: isVertical ? 40 : 60,
        boxSizing: "border-box",
      }}
    >
      {/* Metric highlight card */}
      <div
        style={{
          transform: `scale(${containerScale}) translateY(${cardTranslateY}px)`,
          background: "linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))",
          border: `1px solid ${config.brand.primaryColor}40`,
          borderRadius: 24,
          padding: isVertical ? "30px 40px" : "48px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 40px ${config.brand.primaryColor}22`,
          minWidth: isVertical ? 320 : 380,
        }}
      >
        <div
          style={{
            fontSize: isVertical ? 80 : 110,
            fontWeight: 900,
            color: config.brand.accentColor,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          {config.metrics.metricValue}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: isVertical ? 20 : 24,
            fontWeight: 600,
            color: config.brand.textColor,
            textAlign: "center",
            maxWidth: 260,
          }}
        >
          {config.metrics.metricLabel}
        </div>

        {/* Dynamic progress bar */}
        <div
          style={{
            marginTop: 28,
            width: "100%",
            height: 8,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressRatio * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${config.brand.primaryColor}, ${config.brand.accentColor})`,
              borderRadius: 9999,
            }}
          />
        </div>
      </div>

      {/* Feature list sequence */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 580,
        }}
      >
        {config.features.map((feature, idx) => {
          const itemDelay = 10 + idx * 12;
          const itemSlide = interpolate(frame, [itemDelay, itemDelay + 15], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={idx}
              style={{
                transform: `translateX(${itemSlide}px)`,
                opacity: itemOpacity,
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "18px 24px",
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: config.brand.primaryColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                ✓
              </div>
              <div
                style={{
                  color: config.brand.textColor,
                  fontSize: isVertical ? 20 : 24,
                  fontWeight: 600,
                }}
              >
                {feature}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
