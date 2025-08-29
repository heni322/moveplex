import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateVehicleRelations1756400395783 implements MigrationInterface {
    name = 'UpdateVehicleRelations1756400395783'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vehicle_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "description" character varying(100), "icon" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_521e89eb074cfce4a101397064f" UNIQUE ("name"), CONSTRAINT "PK_73d1e40f4add7f4f6947acad3a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vehicle_vehicle_types" ("vehicleTypesId" uuid NOT NULL, "vehiclesId" uuid NOT NULL, CONSTRAINT "PK_08a6b3d9e961008b7438afd1bef" PRIMARY KEY ("vehicleTypesId", "vehiclesId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6ccbe1894cca08620a958302a1" ON "vehicle_vehicle_types" ("vehicleTypesId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8fa0c9d5b23e9fbd5a5601df39" ON "vehicle_vehicle_types" ("vehiclesId") `);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "vehicle_type"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_vehicle_type_enum"`);
        await queryRunner.query(`ALTER TABLE "vehicle_vehicle_types" ADD CONSTRAINT "FK_6ccbe1894cca08620a958302a1e" FOREIGN KEY ("vehicleTypesId") REFERENCES "vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vehicle_vehicle_types" ADD CONSTRAINT "FK_8fa0c9d5b23e9fbd5a5601df394" FOREIGN KEY ("vehiclesId") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicle_vehicle_types" DROP CONSTRAINT "FK_8fa0c9d5b23e9fbd5a5601df394"`);
        await queryRunner.query(`ALTER TABLE "vehicle_vehicle_types" DROP CONSTRAINT "FK_6ccbe1894cca08620a958302a1e"`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_vehicle_type_enum" AS ENUM('economy', 'premium', 'luxury', 'suv')`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "vehicle_type" "public"."vehicles_vehicle_type_enum" NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8fa0c9d5b23e9fbd5a5601df39"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ccbe1894cca08620a958302a1"`);
        await queryRunner.query(`DROP TABLE "vehicle_vehicle_types"`);
        await queryRunner.query(`DROP TABLE "vehicle_types"`);
    }

}
