import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1750891154353 implements MigrationInterface {
  name = 'InitialMigration1750891154353';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ride_tracking" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ride_id" uuid NOT NULL, "latitude" numeric(10,8) NOT NULL, "longitude" numeric(11,8) NOT NULL, "location" geography(Point,4326) NOT NULL, "speed" integer, "heading" integer, "recorded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3b8bbbf9ef9602bef029ca016c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd9d15dfc78db62767a2fd2350" ON "ride_tracking" USING GiST ("location") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('cash', 'credit_card', 'debit_card', 'digital_wallet', 'bank_transfer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_type_enum" AS ENUM('ride_fare', 'tip', 'cancellation_fee', 'refund')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'completed', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ride_id" uuid, "amount" numeric(10,2) NOT NULL, "payment_method" "public"."payments_payment_method_enum" NOT NULL, "payment_type" "public"."payments_payment_type_enum" NOT NULL, "status" "public"."payments_status_enum" NOT NULL, "transaction_id" character varying, "gateway_response" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ratings_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ride_id" uuid NOT NULL, "rated_by_id" uuid NOT NULL, "rated_user_id" uuid NOT NULL, "rating" numeric(2,1) NOT NULL, "review" text, "tags" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b074af47390c638b415e2f7376" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rides_ride_type_enum" AS ENUM('economy', 'premium', 'pool')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rides_status_enum" AS ENUM('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rides_paymentstatus_enum" AS ENUM('pending', 'completed', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rider_id" uuid NOT NULL, "driver_id" uuid, "pickup_latitude" numeric(10,8) NOT NULL, "pickup_longitude" numeric(11,8) NOT NULL, "pickup_address" text NOT NULL, "pickup_location" geography(Point,4326) NOT NULL, "destination_latitude" numeric(10,8) NOT NULL, "destination_longitude" numeric(11,8) NOT NULL, "destination_address" text NOT NULL, "destination_location" geography(Point,4326) NOT NULL, "ride_type" "public"."rides_ride_type_enum" NOT NULL, "status" "public"."rides_status_enum" NOT NULL DEFAULT 'requested', "fare_amount" numeric(10,2), "distance_km" numeric(8,2), "duration_minutes" integer, "paymentStatus" "public"."rides_paymentstatus_enum" NOT NULL DEFAULT 'pending', "requested_at" TIMESTAMP NOT NULL DEFAULT now(), "accepted_at" TIMESTAMP, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "cancelled_at" TIMESTAMP, CONSTRAINT "PK_ca6f62fc1e999b139c7f28f07fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_14548a56b921e600f378f8657a" ON "rides" USING GiST ("pickup_location") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_47c2fd0e6f809516476b51a544" ON "rides" USING GiST ("destination_location") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_user_type_enum" AS ENUM('rider', 'driver', 'both')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "phone" character varying(20) NOT NULL, "password_hash" character varying NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "profile_picture_url" character varying(500), "user_type" "public"."users_user_type_enum" NOT NULL, "is_verified" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."driver_profiles_status_enum" AS ENUM('offline', 'online', 'busy', 'on_trip')`,
    );
    await queryRunner.query(
      `CREATE TABLE "driver_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "license_number" character varying(100) NOT NULL, "license_expiry" date NOT NULL, "vehicle_id" uuid, "is_online" boolean NOT NULL DEFAULT false, "current_latitude" numeric(10,8), "current_longitude" numeric(11,8), "current_location" geography(Point,4326), "rating" numeric(3,2) NOT NULL DEFAULT '5', "total_rides" integer NOT NULL DEFAULT '0', "status" "public"."driver_profiles_status_enum" NOT NULL DEFAULT 'offline', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_cec43742cd6dea0e8fcae3e29d" UNIQUE ("user_id"), CONSTRAINT "PK_6e002fc8a835351e070978fcad4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec5a8166adb9d716d387573d85" ON "driver_profiles" USING GiST ("current_location") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vehicles_vehicle_type_enum" AS ENUM('economy', 'premium', 'luxury', 'suv')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "make" character varying(50) NOT NULL, "model" character varying(50) NOT NULL, "year" integer NOT NULL, "color" character varying(30) NOT NULL, "license_plate" character varying(20) NOT NULL, "vehicle_type" "public"."vehicles_vehicle_type_enum" NOT NULL, "seats" integer NOT NULL DEFAULT '4', "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7e9fab2e8625b63613f67bd706c" UNIQUE ("license_plate"), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "surge_pricing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "area_name" character varying NOT NULL, "area" geography(Polygon,4326) NOT NULL, "multiplier" numeric(3,2) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "starts_at" TIMESTAMP NOT NULL, "ends_at" TIMESTAMP, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_23a4ad67e5c3a209e39680b1786" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_df669298b2b977f2344128ec50" ON "surge_pricing" USING GiST ("area") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ride_requests_ride_type_enum" AS ENUM('economy', 'premium', 'pool')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ride_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rider_id" character varying NOT NULL, "pickup_latitude" numeric(10,8) NOT NULL, "pickup_longitude" numeric(11,8) NOT NULL, "pickup_location" geography(Point,4326) NOT NULL, "destination_latitude" numeric(10,8) NOT NULL, "destination_longitude" numeric(11,8) NOT NULL, "destination_location" geography(Point,4326) NOT NULL, "ride_type" "public"."ride_requests_ride_type_enum" NOT NULL, "max_wait_time" integer NOT NULL DEFAULT '300', "is_active" boolean NOT NULL DEFAULT true, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_92c563a19918f0e48a844c143a9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa8cb429c830046250258ef2e9" ON "ride_requests" USING GiST ("pickup_location") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('ride_request', 'ride_accepted', 'driver_arriving', 'ride_started', 'ride_completed', 'payment_processed', 'rating_request', 'promotion')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'delivered', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "data" jsonb, "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'pending', "is_read" boolean NOT NULL DEFAULT false, "sent_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ride_tracking" ADD CONSTRAINT "FK_9edd0497c0dd7602efa239671de" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_ab8f98d6ab110b8657d69dcebd0" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings_reviews" ADD CONSTRAINT "FK_6efdf3647a0103ec178852905f5" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings_reviews" ADD CONSTRAINT "FK_ff2b0c521abdea425bf588e6a01" FOREIGN KEY ("rated_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings_reviews" ADD CONSTRAINT "FK_96b3eeb4ffe20a31736d3b0639e" FOREIGN KEY ("rated_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rides" ADD CONSTRAINT "FK_d8ca08acdee36ad9774cbf1c57a" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rides" ADD CONSTRAINT "FK_fb13184768dea9734b022874c6f" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_profiles" ADD CONSTRAINT "FK_cec43742cd6dea0e8fcae3e29d8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_profiles" ADD CONSTRAINT "FK_4fe8dd207c95a17ef5f7c8475f3" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_profiles" DROP CONSTRAINT "FK_4fe8dd207c95a17ef5f7c8475f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_profiles" DROP CONSTRAINT "FK_cec43742cd6dea0e8fcae3e29d8"`,
    );
    await queryRunner.query(`ALTER TABLE "rides" DROP CONSTRAINT "FK_fb13184768dea9734b022874c6f"`);
    await queryRunner.query(`ALTER TABLE "rides" DROP CONSTRAINT "FK_d8ca08acdee36ad9774cbf1c57a"`);
    await queryRunner.query(
      `ALTER TABLE "ratings_reviews" DROP CONSTRAINT "FK_96b3eeb4ffe20a31736d3b0639e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings_reviews" DROP CONSTRAINT "FK_ff2b0c521abdea425bf588e6a01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings_reviews" DROP CONSTRAINT "FK_6efdf3647a0103ec178852905f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_ab8f98d6ab110b8657d69dcebd0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ride_tracking" DROP CONSTRAINT "FK_9edd0497c0dd7602efa239671de"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aa8cb429c830046250258ef2e9"`);
    await queryRunner.query(`DROP TABLE "ride_requests"`);
    await queryRunner.query(`DROP TYPE "public"."ride_requests_ride_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_df669298b2b977f2344128ec50"`);
    await queryRunner.query(`DROP TABLE "surge_pricing"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TYPE "public"."vehicles_vehicle_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ec5a8166adb9d716d387573d85"`);
    await queryRunner.query(`DROP TABLE "driver_profiles"`);
    await queryRunner.query(`DROP TYPE "public"."driver_profiles_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_user_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_47c2fd0e6f809516476b51a544"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_14548a56b921e600f378f8657a"`);
    await queryRunner.query(`DROP TABLE "rides"`);
    await queryRunner.query(`DROP TYPE "public"."rides_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rides_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rides_ride_type_enum"`);
    await queryRunner.query(`DROP TABLE "ratings_reviews"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_payment_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_payment_method_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd9d15dfc78db62767a2fd2350"`);
    await queryRunner.query(`DROP TABLE "ride_tracking"`);
  }
}
