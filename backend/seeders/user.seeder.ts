import "dotenv/config";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../src/modules/user/entities/user.entity";
import { SEED_USERS } from "../src/common/data/seed.data";

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  for (const seedUser of SEED_USERS) {
    const existingUser = await userRepository.findOne({
      where: { email: seedUser.email },
    });

    if (existingUser) continue;

    const hashedPassword = await bcrypt.hash(seedUser.password, 10);

    const user = userRepository.create({
      fullName: seedUser.fullName,
      email: seedUser.email,
      hashedPassword,
      role: seedUser.role,
      lineCode: seedUser.lineCode,
    });

    await userRepository.save(user);
    console.log(`Created user: ${seedUser.email}`);
  }

  console.log("User seeding completed.");
}
