import { ListContainersQuery, listContainersSchema } from "./container.schema";
import { findContainers } from "./container.repository";
import { Container } from "./entities/container.entity";
import { parseErrorRespose } from "../../utils/helper";

function serializeContainer(container: Container) {
  return {
    id: container.id,
    container_no: container.containerNo,
    line_code: container.lineCode,
    iso_type: container.isoType,
    size_ft: container.sizeFt,
    freight_kind: container.freightKind,
    status: container.status,
    vessel_visit_id: container.vesselVisitId,
    yard_location: container.yardLocation,
    weight_kg: container.weightKg,
    discharged_at: container.dischargedAt,
    gate_out_at: container.gateOutAt,
  };
}

export async function listContainers({
  q,
  status,
  has_active_hold,
  limit = 25,
  cursor,
}: ListContainersQuery): Promise<ServiceResponseWithCount> {
  try {
    const result = await findContainers({
      q,
      status,
      has_active_hold,
      limit,
      cursor,
    });

    const lastItem = result.items[result.items.length - 1];

    return {
      status: 200,
      message: "Containers listed successfully",
      data: result.items.map(serializeContainer),
      page: {
        limit: Number(limit) ?? 25,
        next_cursor: result.hasMore && lastItem ? String(lastItem.id) : null,
      },
    };
  } catch (error) {
    return parseErrorRespose({ error, message: "List containers error" });
  }
}
