import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Enter your full name"),
});
export const forgotSchema = z.object({ email: z.string().email("Enter a valid email address") });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
