import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "../../../common/database/base.entity";
import { Container } from "./container.entity";

@Entity("vessel_visits")
@Index("UQ_vessel_visit_ref", ["visitRef"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class VesselVisit extends BaseEntity {
  @Column({
    name: "visit_ref",
    type: "varchar",
    length: 30,
    nullable: false,
  })
  visitRef!: string;

  @Column({
    name: "vessel_name",
    type: "varchar",
    length: 100,
    nullable: false,
  })
  vesselName!: string;

  @Column({
    name: "eta",
    type: "timestamptz",
    nullable: true,
  })
  eta!: Date | null;

  @Column({
    name: "ata",
    type: "timestamptz",
    nullable: true,
  })
  ata!: Date | null;

  @Column({
    name: "atd",
    type: "timestamptz",
    nullable: true,
  })
  atd!: Date | null;

  @OneToMany(() => Container, (container) => container.vesselVisit)
  containers!: Container[];
}
