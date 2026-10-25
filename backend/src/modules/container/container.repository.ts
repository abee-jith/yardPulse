import { AppDataSource } from "../../config/database";
import { Container } from "./entities/container.entity";
import { SelectQueryBuilder } from "typeorm";

const containerRepository = AppDataSource.getRepository(Container);

export async function findContainers(
  qb: SelectQueryBuilder<Container>,
  limit: number,
) {
  return qb
    .orderBy("container.id", "ASC")
    .take(limit + 1)
    .getMany();
}

export async function findContainerByContainerNumber({
  containerNumber,
}: {
  containerNumber: string;
}) {
  return containerRepository.findOne({
    where: { containerNo: containerNumber },
    relations: {
      vesselVisit: true,
      holds: true,
      events: true,
      appointments: true,
    },
  });
}
