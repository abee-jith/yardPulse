import { AppDataSource } from "../../config/database";
import { Container } from "./entities/container.entity";
import { ListContainersQuery } from "./container.schema";
import { Hold } from "./entities/hold.entity";

const containerRepository = AppDataSource.getRepository(Container);

export async function findContainers({
  q,
  status,
  has_active_hold,
  limit = 25,
  cursor,
}: ListContainersQuery) {
  const qb = containerRepository
    .createQueryBuilder("container")
    .select([
      "container.id",
      "container.containerNo",
      "container.lineCode",
      "container.isoType",
      "container.sizeFt",
      "container.freightKind",
      "container.status",
      "container.yardLocation",
      "container.weightKg",
      "container.dischargedAt",
      "container.gateOutAt",
    ]);

  if (q) {
    const escaped = q.replace(/[\\%_]/g, "\\$&");
    qb.andWhere(`container.containerNo ILIKE :q ESCAPE '\\'`, {
      q: `${escaped}%`,
    });
  }

  if (status) {
    qb.andWhere("container.status = :status", { status });
  }

  if (cursor !== undefined) {
    qb.andWhere("container.id > :cursor", { cursor });
  }

  if (has_active_hold !== undefined) {
    qb.andWhere((subQuery) => {
      const holdQuery = subQuery
        .subQuery()
        .select("1")
        .from(Hold, "hold")
        .where("hold.container_id = container.id")
        .getQuery();

      return has_active_hold
        ? `EXISTS ${holdQuery}`
        : `NOT EXISTS ${holdQuery}`;
    }).setParameter("isActive", true);
  }

  qb.orderBy("container.id", "ASC").take(limit + 1);

  const rows = await qb.getMany();

  return {
    hasMore: rows.length > limit,
    items: rows.slice(0, limit),
  };
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
