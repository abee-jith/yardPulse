import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import {
  createRefreshToken,
  findUserByEmail,
  findUserById,
} from "./user.repository";
import { LoginInput, MetaDataInput } from "./user.schema";
import { User } from "./entities/user.entity";
import { env } from "../../config/env";
import { entityNotFoundError, parseErrorRespose } from "../../utils/helper";

const unAuthenticatedResponse = {
  type: "https://yardpulse.test/problems/unauthenticated",
  title: "Unauthenticated",
  status: 401,
  detail: "Invalid email or password.",
  code: "unauthenticated",
};

function createAccessToken(user: User) {
  return jwt.sign(
    {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      lineCode: user.lineCode,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
    },
  );
}

function createRefreshTokenValue() {
  return crypto.randomBytes(64).toString("hex");
}

function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function login({
  input,
  metadata,
}: {
  input: LoginInput;
  metadata: MetaDataInput;
}): Promise<ServiceResponse> {
  try {
    const user = await findUserByEmail(input.email);

    if (!user) return unAuthenticatedResponse;

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.hashedPassword,
    );

    if (!isPasswordValid) return unAuthenticatedResponse;

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshTokenValue();
    const hashedRefreshToken = hashRefreshToken(refreshToken);

    await createRefreshToken({
      hashedToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceName: metadata.deviceName,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      user,
    });

    return {
      status: 200,
      detail: "Login successful",
      data: {
        id: user.id,
        fullName: user.fullName,
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    return parseErrorRespose({ error, message: "Login error" });
  }
}

export async function profile({
  user,
}: {
  user: ReqUser;
}): Promise<ServiceResponse> {
  try {
    const userRecord = await findUserById(user.id);
    if (!userRecord) return entityNotFoundError("User");

    return {
      status: 200,
      detail: "Profile retrieved successfully",
      data: {
        id: userRecord.id,
        fullName: userRecord.fullName,
        email: userRecord.email,
        role: userRecord.role,
        lineCode: userRecord.lineCode,
      },
    };
  } catch (error) {
    return parseErrorRespose({ error, message: "Profile retrieval error" });
  }
}
