import { FindContainerQuery, ListContainersQuery } from "./container.schema";
import {
  findContainerByContainerNumber,
  findContainers,
} from "./container.repository";
import { Container } from "./entities/container.entity";
import { entityNotFoundError, parseErrorRespose } from "../../utils/helper";
import { Hold } from "./entities/hold.entity";
import { AppDataSource } from "../../config/database";

const containerRepository = AppDataSource.getRepository(Container);

function serializeContainer(container: Container) {
  return {
    id: container.id,
    container_no: container.containerNo,
    line_code: container.lineCode,
    iso_type: container.isoType,
    size_ft: container.sizeFt,
    freight_kind: container.freightKind,
    status: container.status,
    yard_location: container.yardLocation,
    weight_kg: container.weightKg,
    discharged_at: container.dischargedAt,
    gate_out_at: container.gateOutAt,
    created_at: container.createdAt,
  };
}

export async function listContainers({
  input,
  user,
}: {
  input: ListContainersQuery;
  user: ReqUser;
}): Promise<ServiceResponse> {
  try {
    const limit = Number(input.limit ?? 25);
    const qb = containerRepository.createQueryBuilder("container");

    if (input.q) {
      const escaped = input.q.replace(/[\\%_]/g, "\\$&");

      qb.andWhere(`container.containerNo ILIKE :q ESCAPE '\\'`, {
        q: `${escaped}%`,
      });
    }

    if (input.status) {
      qb.andWhere("container.status = :status", {
        status: input.status,
      });
    }

    if (input.cursor !== undefined) {
      qb.andWhere("container.id > :cursor", {
        cursor: input.cursor,
      });
    }

    if (input.has_active_hold !== undefined) {
      const holdExists = qb
        .subQuery()
        .select("1")
        .from(Hold, "hold")
        .where("hold.container_id = container.id")
        .andWhere("hold.released_at IS NULL")
        .getQuery();

      qb.andWhere(
        `${input.has_active_hold ? "EXISTS" : "NOT EXISTS"} ${holdExists}`,
      );
    }

    const rows = await findContainers(qb, limit);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const lastItem = items[items.length - 1];

    return {
      status: 200,
      detail: "Containers listed successfully",
      data: items.map(serializeContainer),
      page: {
        limit,
        next_cursor: hasMore && lastItem ? String(lastItem.id) : null,
      },
    };
  } catch (error) {
    return parseErrorRespose({
      error,
      message: "List containers error",
    });
  }
}

export async function findContainerData({
  params,
  user,
}: {
  params: FindContainerQuery;
  user: ReqUser;
}): Promise<ServiceResponse> {
  try {
    const result = await findContainerByContainerNumber({
      containerNumber: params.containerNumber,
    });

    if (!result) return entityNotFoundError("Container");

    return {
      status: 200,
      detail: "Container found successfully",
      data: {
        ...serializeContainer(result),
        appointments: result.appointments,
        events: result.events,
        holds: result.holds,
        vessel_visits: result.vesselVisit,
      },
    };
  } catch (error) {
    return parseErrorRespose({ error, message: "Find container error" });
  }
}
