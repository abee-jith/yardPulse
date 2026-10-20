import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/database/base.entity";
import { User } from "./user.entity";

@Entity("refresh_token")
export class RefreshToken extends BaseEntity {
  @Column({
    name: "hashed_token",
    nullable: false,
    type: "varchar",
    length: 255,
  })
  hashedToken!: string;

  @Column({ name: "expires_at", nullable: false, type: "timestamptz" })
  expiresAt!: Date;

  @Column({
    name: "device_name",
    nullable: false,
    type: "varchar",
    length: 100,
  })
  deviceName!: string;

  @Column({
    name: "user_agent",
    nullable: false,
    type: "text",
  })
  userAgent!: string;

  @Column({
    name: "ip_address",
    nullable: false,
    type: "varchar",
    length: 45,
  })
  ipAddress!: string;

  @Column({
    name: "last_used_at",
    nullable: true,
    type: "timestamptz",
  })
  lastUsedAt!: Date | null;

  @Column({ nullable: true, type: "timestamptz" })
  revokedAt!: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({
    name: "user_id",
  })
  user!: User;
}
