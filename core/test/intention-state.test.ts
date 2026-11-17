import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildHandlerContext,
  handleGetEngagementContext,
  handleLoadIntention,
  handlePatchIntention,
  handleRender,
  type HandlerContext,
} from "../src/mcp/handlers.js";
import { loadState, readHistory, verifyStateIntegrity } from "../src/state/index.js";

const workspaceRoot = resolve(__dirname, "..", "..");

// validateEngagementDir blocks /tmp, so fall back to the home dir where
// the OS temp dir lives under it (Linux CI).
const tmpBase = tmpdir().startsWith("/tmp") ? homedir() : tmpdir();

const baseIntention = {
  schemaVersion: "1",
  customer: "acme-bank",
  industry: "financial-services",
  regulated: false,
  goals: ["build"],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("intention patches and engagement state", () => {
  let ctx: HandlerContext;
  let dir: string;

  beforeEach(() => {
    ctx = buildHandlerContext(workspaceRoot);
    dir = mkdtempSync(join(tmpBase, "fde-state-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const render = (intentionId: string) =>
    handleRender(ctx, { intentionId, engagementDir: dir, targets: ["kiro"] });

  it("records a patch made after render in history, current.yaml and intention.json", async () => {
    const { intentionId } = await handleLoadIntention(ctx, { ...baseIntention });
    await render(intentionId);

    const result = await handlePatchIntention(ctx, {
      intentionId,
      patch: { regulated: true },
      reason: "Customer confirmed KYC data is regulated",
    });

    expect(result.recordedIn).toBe(dir);
    const last = readHistory(dir).at(-1)!;
    expect(last.kind).toBe("intention-patched");
    expect(last.detail.fields).toEqual(["regulated"]);
    expect(last.detail.reason).toBe("Customer confirmed KYC data is regulated");
    expect(loadState(dir).intake.regulated).toBe(true);
    const onDisk = JSON.parse(readFileSync(join(dir, "state", "intention.json"), "utf8"));
    expect(onDisk.intention.regulated).toBe(true);
    expect(verifyStateIntegrity(dir).ok).toBe(true);
  });

  it("queues a patch made before the first render and records it in engagement-created", async () => {
    const { intentionId } = await handleLoadIntention(ctx, { ...baseIntention });
    const result = await handlePatchIntention(ctx, {
      intentionId,
      patch: { regulated: true },
      reason: "regulated",
    });
    expect(result.recordedIn).toBeNull();

    await render(intentionId);

    const history = readHistory(dir);
    expect(history).toHaveLength(1);
    expect(history[0]!.kind).toBe("engagement-created");
    expect(history[0]!.detail.regulated).toBe(true);
    expect(history[0]!.detail.patches).toMatchObject([{ fields: ["regulated"], reason: "regulated" }]);
  });

  it("syncs an intention changed outside fde_patch_intention into current.yaml on re-render", async () => {
    const { intentionId } = await handleLoadIntention(ctx, { ...baseIntention });
    await render(intentionId);

    // A fresh session that loads a changed intention and renders the same folder.
    const ctx2 = buildHandlerContext(workspaceRoot);
    ctx = ctx2;
    const { intentionId: id2 } = await handleLoadIntention(ctx2, {
      ...baseIntention,
      regulated: true,
    });
    await render(id2);

    const last = readHistory(dir).at(-1)!;
    expect(last.kind).toBe("intention-synced");
    expect(last.detail.changedFields).toEqual(["regulated"]);
    expect(loadState(dir).intake.regulated).toBe(true);
    expect(verifyStateIntegrity(dir).ok).toBe(true);
  });

  it("does not add history when re-rendering an unchanged intention", async () => {
    const { intentionId } = await handleLoadIntention(ctx, { ...baseIntention });
    await render(intentionId);
    await render(intentionId);

    expect(readHistory(dir)).toHaveLength(1);
  });

  it("records into a resumed engagement without re-rendering", async () => {
    const { intentionId } = await handleLoadIntention(ctx, { ...baseIntention });
    await render(intentionId);

    const ctx2 = buildHandlerContext(workspaceRoot);
    const resumed = await handleGetEngagementContext(ctx2, { engagementDir: dir });
    const result = await handlePatchIntention(ctx2, {
      intentionId: resumed.intentionId!,
      patch: { regulated: true },
    });

    expect(result.recordedIn).toBe(dir);
    expect(readHistory(dir).at(-1)!.kind).toBe("intention-patched");
  });
});

describe("fde_load_intention schemaVersion", () => {
  const ctx = buildHandlerContext(workspaceRoot);

  for (const version of [1, "1.0", "1"]) {
    it(`accepts schemaVersion ${JSON.stringify(version)} as "1"`, async () => {
      const { intentionId } = await handleLoadIntention(ctx, { ...baseIntention, schemaVersion: version });
      expect(ctx.intentions.get(intentionId)!.schemaVersion).toBe("1");
    });
  }

  it("still rejects other versions", async () => {
    await expect(handleLoadIntention(ctx, { ...baseIntention, schemaVersion: "2" })).rejects.toThrow(
      /validation failed/,
    );
  });
});
