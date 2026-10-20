import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/database/base.entity";
import { HOLD_TYPE } from "../../../common/enum";
import { Container } from "./container.entity";

@Entity("holds")
@Index("IDX_holds_container_released", ["container", "releasedAt"])
export class Hold extends BaseEntity {
  @Column({
    name: "hold_type",
    type: "enum",
    enum: HOLD_TYPE,
    nullable: false,
  })
  holdType!: HOLD_TYPE;

  @Column({
    name: "placed_at",
    type: "timestamptz",
    nullable: false,
  })
  placedAt!: Date;

  @Column({
    name: "released_at",
    type: "timestamptz",
    nullable: true,
  })
  releasedAt!: Date | null;

  @Column({
    name: "note",
    type: "text",
    nullable: true,
  })
  note!: string | null;

  @ManyToOne(() => Container, (container) => container.holds, {
    nullable: false,
  })
  @JoinColumn({ name: "container_id" })
  container!: Container;
}
