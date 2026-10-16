import { z } from "zod";

export const debuggingAttemptSchema = z
  .object({
    diagnosis: z.string().trim().min(20),
    replacementSource: z
      .string()
      .trim()
      .min(20)
      .describe("The complete replacement source without Markdown fences."),
    explanation: z.string().trim().min(20),
  })
  .describe("debugging_attempt");

export type DebuggingAttempt = z.infer<typeof debuggingAttemptSchema>;
