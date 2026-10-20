import { DataSource } from "typeorm";
import { VesselVisit } from "../src/modules/container/entities/vessel-visit.entity";
import { VISITS } from "../src/common/data/seed.data";

export async function seedVesselVisits(dataSource: DataSource): Promise<void> {
  const vesselVisitRepository = dataSource.getRepository(VesselVisit);

  for (const visitData of VISITS) {
    const existing = await vesselVisitRepository.findOne({
      where: { visitRef: visitData.visitRef },
    });

    if (existing) continue;

    await vesselVisitRepository.save(vesselVisitRepository.create(visitData));
  }

  console.log("Vessel visits seeded.");
}
