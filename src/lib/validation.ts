import { z } from "zod";
import { MAX_LETTERS, MIN_LETTERS } from "./limits";
import { normalizeName } from "./normalize";

// Error messages are shown on the web page, so they stay in Indonesian.
export const searchSchema = z.object({
  name: z
    .string()
    .max(MAX_LETTERS, `Nama maksimal ${MAX_LETTERS} karakter`)
    .refine((v) => normalizeName(v).length >= MIN_LETTERS, `Masukkan minimal ${MIN_LETTERS} huruf`),
});
