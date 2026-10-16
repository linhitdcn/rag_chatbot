import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().min(2, "Workspace name is too short").max(60),
  timezone: z.string().min(1),
});
export const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["editor", "viewer"]),
});
export const apiKeySchema = z.object({ key: z.string().min(20, "That doesn't look like a valid key") });

export type WorkspaceValues = z.infer<typeof workspaceSchema>;
export type InviteValues = z.infer<typeof inviteSchema>;
