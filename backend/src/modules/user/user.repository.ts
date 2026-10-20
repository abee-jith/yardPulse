import { MoreThan, IsNull } from "typeorm";
import { AppDataSource } from "../../config/database";
import { User } from "./entities/user.entity";
import { RefreshToken } from "./entities/refreshtoken.entity";

const userRepository = AppDataSource.getRepository(User);
const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

export async function findUserByEmail(email: string): Promise<User | null> {
  return userRepository.findOne({
    where: {
      email,
    },
  });
}

export async function createRefreshToken(
  refreshTokenData: Partial<RefreshToken>,
) {
  const refreshToken = refreshTokenRepository.create(refreshTokenData);
  return refreshTokenRepository.save(refreshToken);
}

export async function findUserById(id: number): Promise<User | null> {
  return userRepository.findOne({
    where: {
      id,
    },
  });
}
