import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BaseEntity } from "../../../common/database/base.entity";
import { User } from "../../user/entities/user.entity";

@Entity({ name: "idempotency_records" })
@Index("uq_idempotency_user_key", ["userId", "idempotencyKey"], {
  unique: true,
})
export class IdempotencyRecord extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "idempotency_key", type: "uuid" })
  idempotencyKey!: string;

  @Column({ name: "request_hash", type: "varchar", length: 64 })
  requestHash!: string;

  @Column({ name: "response_status", type: "integer", nullable: true })
  responseStatus!: number | null;

  @Column({ name: "response_body", type: "jsonb", nullable: true })
  responseBody!: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
