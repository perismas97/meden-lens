import { z } from "zod";

export const reviewFindingSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  category: z.enum(["CORRECTNESS", "SECURITY", "MAINTAINABILITY", "PERFORMANCE"]),
  line: z.number().int().positive(),
  title: z.string().trim().min(1),
  explanation: z.string().trim().min(20),
  recommendation: z.string().trim().min(10),
});

export const codeReviewSchema = z
  .object({
    summary: z.string().trim().min(20),
    findings: z.array(reviewFindingSchema).max(8),
  })
  .describe("code_review");

export type CodeReview = z.infer<typeof codeReviewSchema>;
