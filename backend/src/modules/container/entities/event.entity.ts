import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/database/base.entity";
import { Container } from "./container.entity";
import { CONTAINER_EVENT_TYPE } from "../../../common/enum";

@Entity("events")
export class ContainerEvent extends BaseEntity {
  @Column({
    name: "event_type",
    type: "enum",
    enum: CONTAINER_EVENT_TYPE,
    nullable: false,
  })
  eventType!: CONTAINER_EVENT_TYPE;

  @Column({
    name: "occurred_at",
    type: "timestamptz",
    nullable: false,
  })
  occurredAt!: Date;

  @Column({
    name: "details",
    type: "jsonb",
    nullable: true,
  })
  details!: Record<string, unknown> | null;

  @ManyToOne(() => Container, (container) => container.events, {
    nullable: false,
  })
  @JoinColumn({ name: "container_id" })
  container!: Container;
}
