import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { APPOINTMENT_STATUS } from "../../common/enum";
import { Container } from "../container/entities/container.entity";
import { User } from "../user/entities/user.entity";
import { BaseEntity } from "../../common/database/base.entity";

@Entity("appointments")
@Index("IDX_appointments_slot_status", ["slotStart", "status"])
@Index("IDX_appointments_container_status", ["container", "status"])
export class Appointment extends BaseEntity {
  @Column({
    name: "container_id",
    type: "uuid",
    nullable: false,
  })
  containerId!: string;

  @Column({
    name: "user_id",
    type: "uuid",
    nullable: false,
  })
  userId!: string;

  @Column({
    name: "slot_start",
    type: "timestamptz",
    nullable: false,
  })
  slotStart!: Date;

  @Column({
    name: "truck_plate",
    type: "varchar",
    length: 20,
    nullable: false,
  })
  truckPlate!: string;

  @Column({
    name: "status",
    type: "enum",
    enum: APPOINTMENT_STATUS,
    default: APPOINTMENT_STATUS.BOOKED,
    nullable: false,
  })
  status!: APPOINTMENT_STATUS;

  @Column({
    name: "cancelled_at",
    type: "timestamptz",
    nullable: true,
  })
  cancelledAt!: Date | null;

  @ManyToOne(() => User, (user) => user.appointments, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Container, (container) => container.appointments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "container_id" })
  container!: Container;
}
