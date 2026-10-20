import { DataSource } from "typeorm";
import { Container } from "../src/modules/container/entities/container.entity";
import { ContainerEvent } from "../src/modules/container/entities/event.entity";
import { CONTAINER_EVENT_TYPE } from "../src/common/enum";

export async function seedContainerEvents(
  dataSource: DataSource,
): Promise<void> {
  const containerRepository = dataSource.getRepository(Container);
  const eventRepository = dataSource.getRepository(ContainerEvent);
  const eventTypes = Object.values(CONTAINER_EVENT_TYPE);

  const containers = await containerRepository.find({
    order: { containerNo: "ASC" },
  });

  for (const [index, container] of containers.entries()) {
    const count = 2 + (index % 4);
    const baseTime = container.dischargedAt ?? new Date();

    for (let i = 0; i < count; i++) {
      const eventType = eventTypes[i % eventTypes.length];

      const occurredAt = new Date(baseTime.getTime() + i * 60 * 60 * 1000);

      const existing = await eventRepository.findOne({
        where: {
          container: { id: container.id },
          eventType,
          occurredAt,
        },
      });

      if (existing) {
        continue;
      }

      const event = eventRepository.create({
        container,
        eventType,
        occurredAt,
        details: {
          source: "yardpulse-seed",
          sequence: i + 1,
        },
      });

      await eventRepository.save(event);
    }
  }

  console.log(`Events seeded for ${containers.length} containers.`);
}
