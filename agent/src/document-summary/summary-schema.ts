import { z } from "zod";

export const documentSummarySchema = z
  .object({
    title: z.string().trim().min(1).describe("A concise title for the document."),
    executiveSummary: z
      .string()
      .trim()
      .min(40)
      .describe("A factual summary of the document in two to four sentences."),
    keyPoints: z
      .array(z.string().trim().min(1))
      .min(3)
      .max(7)
      .describe("The most important facts, decisions, and measured results."),
    risksOrUnknowns: z
      .array(z.string().trim().min(1))
      .max(5)
      .describe("Risks, limitations, or unanswered questions stated in the document."),
  })
  .describe("document_summary");

export type DocumentSummary = z.infer<typeof documentSummarySchema>;
