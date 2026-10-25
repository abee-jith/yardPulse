import { Entity, Column, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/database/base.entity";
import { LINE_CODE, USER_ROLE } from "../../../common/enum";
import { Appointment } from "../../appointment/entities/appointment.entity";
import { IdempotencyRecord } from "../../appointment/entities/idempotency-record.entity";

@Entity("user")
@Index("UQ_email_active", ["email"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class User extends BaseEntity {
  @Column({ name: "full_name", nullable: false, type: "varchar", length: 100 })
  fullName!: string;

  @Column({
    name: "email",
    nullable: false,
    type: "varchar",
    length: 100,
  })
  email!: string;

  @Column({
    name: "hashed_password",
    nullable: false,
    type: "varchar",
    length: 255,
  })
  hashedPassword!: string;

  @Column({
    name: "role",
    nullable: false,
    type: "enum",
    enum: USER_ROLE,
  })
  role!: USER_ROLE;

  @Column({
    name: "line_code",
    nullable: true,
    type: "enum",
    enum: LINE_CODE,
  })
  lineCode!: LINE_CODE | null;

  @OneToMany(() => Appointment, (appointment) => appointment.user)
  appointments!: Appointment[];

  @OneToMany(() => IdempotencyRecord, (record) => record.user)
  idempotencyRecords!: IdempotencyRecord[];
}
