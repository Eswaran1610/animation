import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { MasterScriptPlan, ScriptScene } from "./scriptSchema";

export const DynamicScriptPlayer: React.FC<{ plan: MasterScriptPlan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let accumulatedFrames = 0;
  const isVertical = plan.aspectRatio === "9:16";

  // Calculate total frames
  const totalFrames = plan.scenes.reduce((acc, s) => acc + s.durationSeconds * fps, 0);
  const progressPercent = (frame / Math.max(1, totalFrames)) * 100;

  // Gentle 3D camera pan
  const cameraZ = interpolate(frame, [0, totalFrames], [1, 1.08]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: plan.brand.backgroundColor || "#030712",
        color: "#F8FAFC",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background Synth Score */}
      <Audio src={staticFile("cyber_audio.wav")} volume={0.7} />

      {/* Cinematic Stage Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraZ})`,
          position: "relative",
        }}
      >
        {/* Ambient Radial Glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            width: isVertical ? 650 : 900,
            height: isVertical ? 650 : 900,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${plan.brand.primaryColor}25 0%, transparent 65%)`,
            transform: "translate(-50%, -50%)",
            filter: "blur(110px)",
            pointerEvents: "none",
          }}
        />

        {/* Top Progress Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${progressPercent}%`,
            height: 4,
            background: `linear-gradient(90deg, ${plan.brand.primaryColor}, ${plan.brand.accentColor})`,
            zIndex: 100,
          }}
        />

        {/* Dynamic Scene Sequences Generated Directly from Script Plan */}
        {plan.scenes.map((scene, idx) => {
          const startFrame = accumulatedFrames;
          const durationFrames = scene.durationSeconds * fps;
          accumulatedFrames += durationFrames;

          return (
            <Sequence key={scene.id || idx} from={startFrame} durationInFrames={durationFrames}>
              <RenderAutomatedScene
                scene={scene}
                plan={plan}
                index={idx}
                totalScenes={plan.scenes.length}
                isVertical={isVertical}
              />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Universal Scene Renderer (Translates any scene intent into premium motion)
const RenderAutomatedScene: React.FC<{
  scene: ScriptScene;
  plan: MasterScriptPlan;
  index: number;
  totalScenes: number;
  isVertical: boolean;
}> = ({ scene, plan, index, totalScenes, isVertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 90, mass: 0.7 } });
  const cardSlide = interpolate(frame, [10, 28], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const words = scene.headline.split(" ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: isVertical ? "100px 50px 80px" : "80px 100px 60px",
        boxSizing: "border-box",
      }}
    >
      {/* Top Tag & Progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: plan.brand.primaryColor,
              boxShadow: `0 0 10px ${plan.brand.primaryColor}`,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: plan.brand.primaryColor }}>
            {scene.tag}
          </span>
        </div>
        <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.4)", fontWeight: 600, fontFamily: "monospace" }}>
          0{index + 1} / 0{totalScenes}
        </div>
      </div>

      {/* Main Kinetic Typography & Visual Element */}
      <div style={{ transform: `scale(${titleSpring})` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", marginBottom: 24 }}>
          {words.map((w, wIdx) => {
            const isAccent = scene.accentWord && w.toLowerCase().includes(scene.accentWord.toLowerCase());
            return (
              <span
                key={wIdx}
                style={{
                  fontSize: isVertical ? 68 : 74,
                  fontWeight: 900,
                  letterSpacing: -1.5,
                  lineHeight: 1.1,
                  color: isAccent ? plan.brand.primaryColor : "#FFFFFF",
                  textShadow: isAccent ? `0 0 35px ${plan.brand.primaryColor}88` : "none",
                  display: "inline-block",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>

        {/* Dynamic Scene Body Content */}
        {scene.type === "stats" && scene.statNumber && (
          <div
            style={{
              transform: `translateY(${cardSlide}px)`,
              opacity: cardOpacity,
              background: "rgba(15, 23, 42, 0.7)",
              border: `1px solid ${plan.brand.primaryColor}44`,
              borderRadius: 24,
              padding: "36px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 80, fontWeight: 900, color: plan.brand.primaryColor, lineHeight: 1 }}>
              {scene.statNumber}
            </div>
            <div style={{ fontSize: 24, color: "rgba(248, 250, 252, 0.8)", fontWeight: 600, marginTop: 12 }}>
              {scene.statLabel}
            </div>
          </div>
        )}

        {scene.items && scene.items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {scene.items.map((item, iIdx) => {
              const iSlide = interpolate(frame, [15 + iIdx * 10, 30 + iIdx * 10], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const iOp = interpolate(frame, [15 + iIdx * 10, 30 + iIdx * 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

              return (
                <div
                  key={iIdx}
                  style={{
                    transform: `translateX(${iSlide}px)`,
                    opacity: iOp,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 18,
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: plan.brand.primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 900 }}>
                    ✓
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{item}</div>
                </div>
              );
            })}
          </div>
        )}

        {scene.type === "cta" && (
          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${plan.brand.primaryColor}, ${plan.brand.accentColor})`,
                padding: "24px 52px",
                borderRadius: 9999,
                fontSize: 32,
                fontWeight: 800,
                color: "#050811",
                boxShadow: `0 15px 40px ${plan.brand.primaryColor}66`,
                cursor: "pointer",
                width: isVertical ? "90%" : "auto",
                textAlign: "center",
              }}
            >
              {plan.ctaText}
            </div>
          </div>
        )}

        {scene.description && scene.type !== "stats" && (
          <p style={{ marginTop: 20, fontSize: 24, lineHeight: 1.45, color: "rgba(248, 250, 252, 0.65)" }}>
            {scene.description}
          </p>
        )}
      </div>

      {/* Footer Branding */}
      <div style={{ fontSize: 16, color: "rgba(248, 250, 252, 0.4)", letterSpacing: 2, textTransform: "uppercase" }}>
        {plan.brand.name} • AUTOMATED MOTION ENGINE
      </div>
    </div>
  );
};
