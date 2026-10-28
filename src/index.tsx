import React from "react";
import { Composition, registerRoot } from "remotion";
import { DynamicMotionPromo } from "./DynamicMotionPromo";
import { defaultCampaign } from "./sampleData";
import { campaignToMotionPlan } from "./engine/plan";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 Landscape - YouTube & Website */}
      <Composition
        id="Promo-16x9"
        component={DynamicMotionPromo}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          config: {
            ...defaultCampaign,
            aspectRatio: "16:9",
          },
        }}
      />

      {/* 9:16 Vertical - TikTok / Reels / Shorts */}
      <Composition
        id="Promo-9x16"
        component={DynamicMotionPromo}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          config: {
            ...defaultCampaign,
            aspectRatio: "9:16",
          },
        }}
      />

      {/* 1:1 Square - Instagram Feed / LinkedIn */}
      <Composition
        id="Promo-1x1"
        component={DynamicMotionPromo}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          config: {
            ...defaultCampaign,
            aspectRatio: "1:1",
          },
        }}
      />

      {/* 60-Second ZTNA Cybersecurity Promo with Sound */}
      <Composition
        id="ZTNA-60s"
        component={require("./ZTNAPromo").ZTNAPromo}
        durationInFrames={1800} // 60 seconds * 30 fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 60-Second Vertical (9:16) ZTNZ/ZTNA Tech Motion Promo with Captions & Sound */}
      <Composition
        id="ZTNZ-Vertical-60s"
        component={require("./ZTNZVerticalPromo").ZTNZVerticalPromo}
        durationInFrames={1800} // 60 seconds * 30 fps
        fps={30}
        width={1080}
        height={1920}
      />

      {/* 60-Second Vertical (9:16) Threads API Motion Animation with Mathable Sound */}
      <Composition
        id="Threads-60s"
        component={require("./ThreadsMotion60s").ThreadsMotion60s}
        durationInFrames={1800} // 60 seconds * 30 fps
        fps={30}
        width={1080}
        height={1920}
      />


      {/* 50-Second Vertical (9:16) Before ZTNA vs Proposed ZTNA System with Emojis & Mascots */}
      <Composition
        id="ZTNA-Comparison-50s"
        component={require("./ZTNAComparison50s").ZTNAComparison50s}
        durationInFrames={1500} // 50 seconds * 30 fps
        fps={30}
        width={1080}
        height={1920}
      />

      {/* 50-Second Premium Studio-Grade Motion Design (Apple / Linear style) */}
      <Composition
        id="Studio-Motion-50s"
        component={require("./StudioMotionZTNA").StudioMotionZTNA}
        durationInFrames={1500} // 50 seconds * 30 fps
        fps={30}
        width={1080}
        height={1920}
      />

      {/* 30-Second Perfect Motion Pro with 3D Camera, SFX, and Kinetic Typography */}
      <Composition
        id="Perfect-Motion-Pro"
        component={require("./PerfectMotionPro").PerfectMotionPro}
        durationInFrames={900} // 30 seconds * 30 fps
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Universal Automated Script-Plan Composition */}
      <Composition
        id="Dynamic-Script-Video"
        component={require("./DynamicScriptPlayer").DynamicScriptPlayer}
        durationInFrames={1500}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          plan: {
            title: "Default Plan",
            brand: { name: "AutoStudio", primaryColor: "#10B981", accentColor: "#06B6D4", backgroundColor: "#030712" },
            aspectRatio: "9:16",
            ctaText: "Launch Now →",
            scenes: [
              { id: "1", type: "hook", tag: "THE PROBLEM", headline: "Legacy Systems Are Slowing You Down", accentWord: "Slowing", durationSeconds: 5 },
              { id: "2", type: "solution", tag: "THE SOLUTION", headline: "Automated Motion In Minutes", accentWord: "Automated", items: ["Zero Manual Keyframing", "100% Deterministic Code", "Multi-Format Instant Export"], durationSeconds: 6 },
              { id: "3", type: "stats", tag: "PROVEN IMPACT", headline: "10x Faster Production Pipeline", statNumber: "10x", statLabel: "Render Speed vs After Effects", durationSeconds: 5 },
              { id: "4", type: "cta", tag: "GET STARTED", headline: "Build Your Next Video Today", accentWord: "Today", durationSeconds: 5 }
            ]
          }
        }}
      />

      {/* Universal Data-Driven Engine Composition */}
      <Composition
        id="Universal-Motion-Engine"
        component={require("./engine/UniversalMotionEngine").UniversalMotionEngine}
        calculateMetadata={({ props }: any) => {
          const fps = 30;
          const plan = props?.plan ?? campaignToMotionPlan(props?.campaign);
          const totalSeconds = plan.scenes.reduce((max: number, scene: any) => Math.max(max, scene.start + scene.dur), 0);

          return {
            durationInFrames: Math.max(90, Math.round(totalSeconds * fps)),
            fps,
            width: plan.meta.size.width,
            height: plan.meta.size.height,
          };
        }}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          campaign: {
            campaignId: "default-engine-demo",
            title: "Default Engine Demo",
            brand: { name: "Animatrix AI", primaryColor: "#10B981", accentColor: "#06B6D4", backgroundColor: "#030712" },
            aspectRatio: "9:16",
            ctaText: "Deploy Now →",
            scenes: [
              { id: "1", type: "kinetic_hook", tag: "CORE ENGINE", headline: "Pure Data-Driven Motion Graphics", accentWord: "Data-Driven", description: "Zero code changes between renders. Driven 100% by validated JSON.", durationSeconds: 5 },
              { id: "2", type: "terminal_code", tag: "ZERO CODE TOUCH", headline: "Execute From CLI Or API", accentWord: "CLI", terminalCommand: "animatrix render campaigns/fintech.json", terminalOutput: "✔ Rendered 900 frames in 8.2s without modifying source code.", durationSeconds: 6 },
              { id: "3", type: "metric_counter", tag: "PRODUCTION IMPACT", headline: "Zero Engine Mutations", metricTarget: 100, metricSuffix: "%", metricLabel: "Codebase Protected", secondaryMetricValue: "0s", secondaryMetricLabel: "Manual Refactor Time", durationSeconds: 5 },
              { id: "4", type: "conversion_cta", tag: "READY TO SCALE", headline: "Automate Your Motion Pipeline Today", accentWord: "Today", durationSeconds: 5 }
            ]
          }
        }}
      />

      {/* Official Claude Motion Composition */}
      <Composition
        id="ClaudeMotion"
        component={require("./claude-motion/ClaudeMotion").ClaudeMotion}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={510}
        calculateMetadata={({ props }: any) => {
          const { Campaign } = require("./claude-motion/schema");
          const { timeline } = require("./claude-motion/motion");
          const c = Campaign.parse(props?.campaign || { name: "demo", scenes: [{ type: "title", seconds: 3, headline: "Claude Motion" }] });
          return {
            durationInFrames: timeline(c).total,
            fps: c.fps,
            props: { campaign: c },
          };
        }}
        defaultProps={{
          campaign: {
            name: "claude-demo",
            fps: 30,
            scenes: [
              { type: "title", seconds: 3, eyebrow: "Claude Code", headline: "Review code in one command", sub: "Catch bugs before they ship." },
              { type: "terminal", seconds: 6, lines: [{ kind: "cmd", text: "claude review --strict --branch=prod" }, { kind: "out", text: "Scanning 42 files..." }, { kind: "out", text: "2 issues found, 1 auto-fixed" }] },
              { type: "diagram", seconds: 5, caption: "From terminal to cloud", nodes: [{ id: "a", label: "Terminal", x: 50, y: 25 }, { id: "b", label: "Claude", x: 50, y: 50 }, { id: "c", label: "Cloud", x: 50, y: 75 }], edges: [["a", "b"], ["b", "c"]] },
              { type: "title", seconds: 3, headline: "Ship with confidence" }
            ]
          }
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
