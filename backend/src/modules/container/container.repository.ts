import { AppDataSource } from "../../config/database";
import { Container } from "./entities/container.entity";
import { SelectQueryBuilder } from "typeorm";
import { USER_ROLE } from "../../common/enum";

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
  user,
}: {
  containerNumber: string;
  user: ReqUser;
}) {
  const query = containerRepository
    .createQueryBuilder("container")
    .leftJoinAndSelect("container.vesselVisit", "vesselVisit")
    .leftJoinAndSelect("container.holds", "holds")
    .leftJoinAndSelect("container.events", "events")
    .leftJoinAndSelect("container.appointments", "appointments")
    .where("container.containerNo = :containerNumber", { containerNumber });

  if (user.role !== USER_ROLE.OPERATOR) {
    query.andWhere("container.lineCode = :lineCode", {
      lineCode: user.lineCode,
    });
  }

  return query.getOne();
}
