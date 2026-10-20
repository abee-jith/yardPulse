import { z } from "zod";
import { LINE_CODE } from "../../common/enum";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const metaDataSchema = z.object({
  deviceName: z.string().min(1),
  userAgent: z.string().min(1),
  ipAddress: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const userSchema = z.object({
  id: z.number().int(),
  fullName: z.string().min(2).max(100),
  role: z.string().min(2).max(100),
  lineCode: z.string().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MetaDataInput = z.infer<typeof metaDataSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
