import { DataSource, IsNull } from "typeorm";
import { Hold } from "../src/modules/container/entities/hold.entity";
import { Container } from "../src/modules/container/entities/container.entity";
import { HOLD_TYPE } from "../src/common/enum";
import { HOLD_SEEDS } from "../src/common/data/seed.data";

export async function seedHolds(dataSource: DataSource): Promise<void> {
  const holdRepository = dataSource.getRepository(Hold);
  const containerRepository = dataSource.getRepository(Container);

  for (const seed of HOLD_SEEDS) {
    const container = await containerRepository.findOne({
      where: { containerNo: seed.containerNo },
    });

    if (!container) {
      throw new Error(
        `Container not found for hold: ${seed.containerNo}. Seed containers first.`,
      );
    }

    const existing = await holdRepository.findOne({
      where: {
        container: { id: container.id },
        holdType: seed.holdType,
        releasedAt: IsNull(),
        note: seed.note,
      },
    });

    if (existing) continue;

    const hold = holdRepository.create({
      container,
      holdType: seed.holdType,
      placedAt: container.dischargedAt ?? new Date(),
      releasedAt: null,
      note: seed.note,
    });

    await holdRepository.save(hold);
  }

  console.log("Holds seeded successfully.");
}
