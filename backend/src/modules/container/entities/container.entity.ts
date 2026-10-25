import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";

import {
  CONTAINER_SIZE_FT,
  CONTAINER_STATUS,
  FREIGHT_KIND,
  LINE_CODE,
} from "../../../common/enum";

import { BaseEntity } from "../../../common/database/base.entity";
import { VesselVisit } from "./vessel-visit.entity";
import { Hold } from "./hold.entity";
import { ContainerEvent } from "./event.entity";
import { Appointment } from "../../appointment/entities/appointment.entity";

@Entity("container")
@Index("UQ_container_no", ["containerNo"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index("IDX_container_line_status", ["lineCode", "status"])
export class Container extends BaseEntity {
  @Column({
    name: "container_no",
    type: "varchar",
    length: 11,
    nullable: false,
  })
  containerNo!: string;

  @Column({
    name: "line_code",
    type: "enum",
    enum: LINE_CODE,
    nullable: false,
  })
  lineCode!: LINE_CODE;

  @Column({
    name: "iso_type",
    type: "varchar",
    length: 4,
    nullable: false,
  })
  isoType!: string;

  @Column({
    name: "size_ft",
    type: "enum",
    enum: CONTAINER_SIZE_FT,
    nullable: false,
  })
  sizeFt!: CONTAINER_SIZE_FT;

  @Column({
    name: "freight_kind",
    type: "enum",
    enum: FREIGHT_KIND,
    nullable: false,
  })
  freightKind!: FREIGHT_KIND;

  @Column({
    name: "status",
    type: "enum",
    enum: CONTAINER_STATUS,
    nullable: false,
  })
  status!: CONTAINER_STATUS;

  @Column({
    name: "yard_location",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  yardLocation!: string | null;

  @Column({
    name: "weight_kg",
    type: "numeric",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  weightKg!: string | null;

  @Column({
    name: "discharged_at",
    type: "timestamptz",
    nullable: true,
  })
  dischargedAt!: Date | null;

  @Column({
    name: "gate_out_at",
    type: "timestamptz",
    nullable: true,
  })
  gateOutAt!: Date | null;

  @ManyToOne(() => VesselVisit, (visit) => visit.containers, {
    nullable: true,
  })
  @JoinColumn({ name: "vessel_visit_id" })
  vesselVisit!: VesselVisit | null;

  @OneToMany(() => Hold, (hold) => hold.container)
  holds!: Hold[];

  @OneToMany(() => ContainerEvent, (event) => event.container)
  events!: ContainerEvent[];

  @OneToMany(() => Appointment, (appointment) => appointment.container)
  appointments!: Appointment[];
}
