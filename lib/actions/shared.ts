import { getContext, type Ctx } from "@/lib/data/context";
import type { Role } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });
export const err = (error: string): ActionResult<never> => ({ ok: false, error });

const RANK: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

/**
 * Server Actions are reachable by direct POST, so every action re-checks the caller's role here
 * (RLS is the second line of defense). Returns the context or an error result.
 */
export async function authorize(min: Role): Promise<{ ctx: Ctx } | { error: string }> {
  const ctx = await getContext();
  if (RANK[ctx.role] < RANK[min]) {
    return { error: min === "owner" ? "Only the workspace owner can do that." : "You don't have permission to edit this workspace." };
  }
  return { ctx };
}

export function message(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}
