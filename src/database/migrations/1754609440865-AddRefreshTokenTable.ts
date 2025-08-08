import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenTable1754609440865 implements MigrationInterface {
    name = 'AddRefreshTokenTable1754609440865'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_driver_profiles_current_location"`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" text NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "user_agent" character varying, "ip_address" character varying, "last_used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "failed_login_attempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "locked_until" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_changed_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum" RENAME TO "payments_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum" USING "status"::"text"::"public"."payments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."rides_paymentstatus_enum" RENAME TO "rides_paymentstatus_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."rides_paymentstatus_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "rides" ALTER COLUMN "paymentStatus" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "rides" ALTER COLUMN "paymentStatus" TYPE "public"."rides_paymentstatus_enum" USING "paymentStatus"::"text"::"public"."rides_paymentstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "rides" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."rides_paymentstatus_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."users_user_type_enum" RENAME TO "users_user_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_user_type_enum" AS ENUM('rider', 'driver', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "public"."users_user_type_enum" USING "user_type"::"text"::"public"."users_user_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_user_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ride_requests" ALTER COLUMN "surge_multiplier" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride_requests" ALTER COLUMN "surge_multiplier" SET DEFAULT '1'`);
        await queryRunner.query(`CREATE INDEX "IDX_ec5a8166adb9d716d387573d85" ON "driver_profiles" USING GiST ("current_location") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec5a8166adb9d716d387573d85"`);
        await queryRunner.query(`ALTER TABLE "ride_requests" ALTER COLUMN "surge_multiplier" SET DEFAULT 1.0`);
        await queryRunner.query(`ALTER TABLE "ride_requests" ALTER COLUMN "surge_multiplier" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."users_user_type_enum_old" AS ENUM('rider', 'driver', 'both')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "public"."users_user_type_enum_old" USING "user_type"::"text"::"public"."users_user_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_user_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_user_type_enum_old" RENAME TO "users_user_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."rides_paymentstatus_enum_old" AS ENUM('pending', 'completed', 'failed', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "rides" ALTER COLUMN "paymentStatus" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "rides" ALTER COLUMN "paymentStatus" TYPE "public"."rides_paymentstatus_enum_old" USING "paymentStatus"::"text"::"public"."rides_paymentstatus_enum_old"`);
        await queryRunner.query(`ALTER TABLE "rides" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."rides_paymentstatus_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."rides_paymentstatus_enum_old" RENAME TO "rides_paymentstatus_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum_old" AS ENUM('pending', 'completed', 'failed', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum_old" USING "status"::"text"::"public"."payments_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum_old" RENAME TO "payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_changed_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_attempts"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`CREATE INDEX "IDX_driver_profiles_current_location" ON "driver_profiles" USING GiST ("current_location") `);
    }

}
