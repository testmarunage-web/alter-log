import { z } from "zod";

export const alterLogSchema = z.object({
  is_insufficient_data: z.boolean(),

  fact_emotion_ratio: z.object({
    fact_percentage:    z.number().min(0).max(100),
    emotion_percentage: z.number().min(0).max(100),
    analysis:           z.string(),
  }),

  cognitive_bias_detected: z.object({
    bias_name:   z.string(),
    description: z.string(),
  }),

  passive_voice_status: z.string(),

  observed_loops:       z.string().nullable(),
  blind_spots:          z.string().nullable(),
  pending_decisions:    z.string().nullable(),

  positive_observation: z.string().nullable(),

  daily_note: z.string(),
});

export type AlterLogInsights = z.infer<typeof alterLogSchema>;