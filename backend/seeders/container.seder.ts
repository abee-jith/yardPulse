import { DataSource } from "typeorm";
import { Container } from "../src/modules/container/entities/container.entity";
import { VesselVisit } from "../src/modules/container/entities/vessel-visit.entity";
import {
  LINE_CODE,
  FREIGHT_KIND,
  CONTAINER_SIZE_FT,
  CONTAINER_STATUS,
} from "../src/common/enum";
import { CONTAINERS } from "../src/common/data/seed.data";
import { daysAgo } from "../src/utils/helper";

type ContainerSeed = (typeof CONTAINERS)[number];

function buildContainerSeeds(): ContainerSeed[] {
  const seeds: ContainerSeed[] = CONTAINERS.map((container) => ({
    ...container,
  }));

  const lineConfigs = [
    { lineCode: LINE_CODE.ALN, prefix: "ALNU" },
    { lineCode: LINE_CODE.BRL, prefix: "BRLU" },
    { lineCode: LINE_CODE.CRX, prefix: "CRXU" },
  ];

  for (const line of lineConfigs) {
    let count = seeds.filter(
      (container) => container.lineCode === line.lineCode,
    ).length;

    if (count > 10) {
      throw new Error(
        `Expected at most 10 seed containers for ${line.lineCode}, found ${count}.`,
      );
    }

    for (let serial = 1000001; count < 10; serial++) {
      const containerNo = `${line.prefix}${serial}`;

      if (seeds.some((container) => container.containerNo === containerNo)) {
        continue;
      }

      seeds.push({
        containerNo,
        lineCode: line.lineCode,
        sizeFt: count % 2 === 0 ? 40 : 20,
        status:
          count % 3 === 0
            ? CONTAINER_STATUS.DEPARTED
            : CONTAINER_STATUS.IN_YARD,
        dischargedAt: daysAgo(2 + (count % 8), 8 + (count % 10)),
        yardLocation: `${line.prefix.slice(0, 3)}-${String(count + 1).padStart(2, "0")}-01`,
        gateOutAt: null,
      });

      count++;
    }
  }

  if (seeds.length !== 30) {
    throw new Error(`Expected 30 containers, found ${seeds.length}.`);
  }

  const numbers = new Set(seeds.map((container) => container.containerNo));

  if (numbers.size !== seeds.length) {
    throw new Error("Duplicate container numbers found in seed data.");
  }

  return seeds;
}

export async function seedContainers(dataSource: DataSource): Promise<void> {
  const containerRepo = dataSource.getRepository(Container);
  const visitRepo = dataSource.getRepository(VesselVisit);

  const visits = await visitRepo.find({
    order: { visitRef: "ASC" },
  });

  if (visits.length === 0) {
    throw new Error("Seed vessel visits before containers.");
  }

  const seeds = buildContainerSeeds();

  for (const [index, seed] of seeds.entries()) {
    const existing = await containerRepo.findOne({
      where: { containerNo: seed.containerNo },
    });

    const visit = visits[index % visits.length];

    const container = containerRepo.create({
      ...(existing ?? {}),
      containerNo: seed.containerNo,
      lineCode: seed.lineCode,
      isoType:
        seed.sizeFt === 20
          ? "22G1"
          : seed.sizeFt === 40
            ? "42G1"
            : "45G1",
      sizeFt: seed.sizeFt as CONTAINER_SIZE_FT,
      freightKind: FREIGHT_KIND.FULL,
      status: seed.status as CONTAINER_STATUS,
      vesselVisit: visit,
      yardLocation: seed.yardLocation,
      weightKg: "12000.00",
      dischargedAt: seed.dischargedAt,
      gateOutAt: seed.gateOutAt,
    });

    await containerRepo.save(container);
  }

  console.log("Seeded 30 containers: 10 each for ALN, BRL, and CRX.");
}
