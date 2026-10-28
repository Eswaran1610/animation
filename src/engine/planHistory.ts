import { promises as fs } from "node:fs";
import path from "node:path";
import type { MotionPlan } from "./plan";

const HISTORY_DIR = ".motion-plans";
const HISTORY_FILE = "recent.json";
const MAX_HISTORY = 12;

export const planHistoryPath = (workspaceRoot: string) =>
  path.join(workspaceRoot, HISTORY_DIR, HISTORY_FILE);

export const readRecentPlans = async (workspaceRoot: string, limit = 5): Promise<MotionPlan[]> => {
  try {
    const raw = await fs.readFile(planHistoryPath(workspaceRoot), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-limit) : [];
  } catch {
    return [];
  }
};

export const appendPlanHistory = async (workspaceRoot: string, plan: MotionPlan): Promise<void> => {
  const file = planHistoryPath(workspaceRoot);
  const current = await readRecentPlans(workspaceRoot, MAX_HISTORY);
  current.push(plan);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(current.slice(-MAX_HISTORY), null, 2));
};

export const describeRecentStyles = (plans: MotionPlan[]) => plans.map((plan) => ({
  styleSeed: plan.meta.styleSeed,
  mood: plan.meta.mood,
  background: plan.theme.background,
  palette: [plan.theme.palette.primary, plan.theme.palette.accent],
  scenes: plan.scenes.map((scene) => scene.type),
}));
