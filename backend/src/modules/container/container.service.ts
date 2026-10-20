import {
  FindContainerQuery,
  ListContainersQuery,
  listContainersSchema,
} from "./container.schema";
import {
  findContainerByContainerNumber,
  findContainers,
} from "./container.repository";
import { Container } from "./entities/container.entity";
import { entityNotFoundError, parseErrorRespose } from "../../utils/helper";

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
  };
}

export async function listContainers({
  input,
  user,
}: {
  input: ListContainersQuery;
  user: ReqUser;
}): Promise<ServiceResponseWithCount> {
  try {
    const result = await findContainers({
      q: input.q,
      status: input.status,
      has_active_hold: input.has_active_hold,
      limit: input.limit,
      cursor: input.cursor,
    });

    const lastItem = result.items[result.items.length - 1];

    return {
      status: 200,
      message: "Containers listed successfully",
      data: result.items.map(serializeContainer),
      page: {
        limit: Number(input.limit) ?? 25,
        next_cursor: result.hasMore && lastItem ? String(lastItem.id) : null,
      },
    };
  } catch (error) {
    return parseErrorRespose({ error, message: "List containers error" });
  }
}

export async function findContainerData({
  params,
  user,
}: {
  params: FindContainerQuery;
  user: ReqUser;
}): Promise<ServiceResponseWithCount> {
  try {
    const result = await findContainerByContainerNumber({
      containerNumber: params.containerNumber,
    });

    if (!result) return entityNotFoundError("Container");

    return {
      status: 200,
      message: "Container found successfully",
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
