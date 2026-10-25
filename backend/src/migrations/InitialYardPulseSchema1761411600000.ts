import { MigrationInterface, QueryRunner } from "typeorm";

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function getConfiguredSchema(queryRunner: QueryRunner): string {
  const options = queryRunner.connection.options;
  return options.type === "postgres" && typeof options.schema === "string"
    ? options.schema
    : "public";
}

export class InitialYardPulseSchema1761411600000
  implements MigrationInterface
{
  name = "InitialYardPulseSchema1761411600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = getConfiguredSchema(queryRunner);
    const qualified = (name: string) =>
      `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);

    const enumTypes: Array<[string, string[]]> = [
      ["user_role_enum", ["customer", "operator"]],
      ["user_line_code_enum", ["ALN", "BRL", "CRX"]],
      ["container_line_code_enum", ["ALN", "BRL", "CRX"]],
      ["container_size_ft_enum", ["20", "40", "45"]],
      ["container_freight_kind_enum", ["FULL", "EMPTY"]],
      ["container_status_enum", ["ON_VESSEL", "IN_YARD", "DEPARTED"]],
      ["holds_hold_type_enum", ["CUSTOMS", "LINE", "INSPECTION", "TERMINAL"]],
      [
        "events_event_type_enum",
        [
          "DISCHARGED",
          "YARD_MOVE",
          "HOLD_PLACED",
          "HOLD_RELEASED",
          "APPOINTMENT_BOOKED",
          "APPOINTMENT_CANCELLED",
          "GATE_OUT",
        ],
      ],
      ["appointments_status_enum", ["BOOKED", "CANCELLED", "COMPLETED"]],
    ];

    for (const [name, values] of enumTypes) {
      if (values.length === 0) continue;
      const literals = values.map((value) => `'${value}'`).join(", ");
      await queryRunner.query(
        `DO $$ BEGIN CREATE TYPE ${qualified(name)} AS ENUM (${literals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      );
    }

    await queryRunner.query(`
      CREATE TABLE ${qualified("user")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        full_name varchar(100) NOT NULL,
        email varchar(100) NOT NULL,
        hashed_password varchar(255) NOT NULL,
        role ${qualified("user_role_enum")} NOT NULL,
        line_code ${qualified("user_line_code_enum")} NULL,
        CONSTRAINT "CHK_user_role_line_code" CHECK (
          (role = 'operator' AND line_code IS NULL) OR
          (role = 'customer' AND line_code IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_email_active" ON ${qualified("user")} (email) WHERE deleted_at IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE ${qualified("refresh_token")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        hashed_token varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        device_name varchar(100) NOT NULL,
        user_agent text NOT NULL,
        ip_address varchar(45) NOT NULL,
        last_used_at timestamptz NULL,
        "revokedAt" timestamptz NULL,
        user_id integer NULL REFERENCES ${qualified("user")}(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${qualified("visits")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        visit_ref varchar(30) NOT NULL,
        vessel_name varchar(100) NOT NULL,
        eta timestamptz NULL,
        ata timestamptz NULL,
        atd timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vessel_visit_ref" ON ${qualified("visits")} (visit_ref) WHERE deleted_at IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE ${qualified("container")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        container_no varchar(11) NOT NULL,
        line_code ${qualified("container_line_code_enum")} NOT NULL,
        iso_type varchar(4) NOT NULL,
        size_ft ${qualified("container_size_ft_enum")} NOT NULL,
        freight_kind ${qualified("container_freight_kind_enum")} NOT NULL,
        status ${qualified("container_status_enum")} NOT NULL,
        yard_location varchar(20) NULL,
        weight_kg numeric(10,2) NULL,
        discharged_at timestamptz NULL,
        gate_out_at timestamptz NULL,
        vessel_visit_id integer NULL REFERENCES ${qualified("visits")}(id) ON DELETE NO ACTION,
        CONSTRAINT "CHK_container_no_format" CHECK (container_no ~ '^[A-Z]{4}[0-9]{7}$')
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_container_no" ON ${qualified("container")} (container_no) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_container_line_status" ON ${qualified("container")} (line_code, status)`,
    );

    await queryRunner.query(`
      CREATE TABLE ${qualified("holds")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        hold_type ${qualified("holds_hold_type_enum")} NOT NULL,
        placed_at timestamptz NOT NULL,
        released_at timestamptz NULL,
        note text NULL,
        container_id integer NOT NULL REFERENCES ${qualified("container")}(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${qualified("events")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        event_type ${qualified("events_event_type_enum")} NOT NULL,
        occurred_at timestamptz NOT NULL,
        details jsonb NULL,
        container_id integer NOT NULL REFERENCES ${qualified("container")}(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${qualified("appointments")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        container_id integer NOT NULL REFERENCES ${qualified("container")}(id) ON DELETE CASCADE,
        user_id integer NOT NULL REFERENCES ${qualified("user")}(id) ON DELETE RESTRICT,
        slot_start timestamptz NOT NULL,
        truck_plate varchar(20) NOT NULL,
        status ${qualified("appointments_status_enum")} NOT NULL DEFAULT 'BOOKED',
        cancelled_at timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_slot_status" ON ${qualified("appointments")} (slot_start, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_container_status" ON ${qualified("appointments")} (container_id, status)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_appointments_one_booked_per_container" ON ${qualified("appointments")} (container_id) WHERE status = 'BOOKED' AND deleted_at IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE ${qualified("idempotency_records")} (
        id SERIAL PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        user_id integer NOT NULL REFERENCES ${qualified("user")}(id) ON DELETE RESTRICT,
        idempotency_key uuid NOT NULL,
        request_hash varchar(64) NOT NULL,
        response_status integer NULL,
        response_body jsonb NULL,
        CONSTRAINT "uq_idempotency_user_key" UNIQUE (user_id, idempotency_key)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = getConfiguredSchema(queryRunner);
    const qualified = (name: string) =>
      `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;

    for (const table of [
      "idempotency_records",
      "appointments",
      "events",
      "holds",
      "container",
      "visits",
      "refresh_token",
      "user",
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${qualified(table)} CASCADE`);
    }

    for (const type of [
      "appointments_status_enum",
      "events_event_type_enum",
      "holds_hold_type_enum",
      "container_status_enum",
      "container_freight_kind_enum",
      "container_size_ft_enum",
      "container_line_code_enum",
      "user_line_code_enum",
      "user_role_enum",
    ]) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${qualified(type)} CASCADE`);
    }
  }
}
