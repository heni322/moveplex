// 1. First, create a TypeORM migration
// Run: npm run migration:generate -- UpdateDriverProfileLocation

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDriverProfileLocation1719659400000 implements MigrationInterface {
  name = 'UpdateDriverProfileLocation1719659400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // Drop the existing current_location column if it exists and recreate it properly
    await queryRunner.query(
      `ALTER TABLE "driver_profiles" DROP COLUMN IF EXISTS "current_location"`,
    );

    // Add the geography column with proper PostGIS type
    await queryRunner.query(`
      ALTER TABLE "driver_profiles" 
      ADD COLUMN "current_location" geography(POINT, 4326)
    `);

    // Create spatial index for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_driver_profiles_current_location" 
      ON "driver_profiles" USING GIST ("current_location")
    `);

    // Update existing records to populate current_location from lat/lng if they exist
    await queryRunner.query(`
      UPDATE "driver_profiles" 
      SET "current_location" = ST_SetSRID(ST_MakePoint("current_longitude", "current_latitude"), 4326)::geography
      WHERE "current_latitude" IS NOT NULL 
      AND "current_longitude" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the spatial index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_driver_profiles_current_location"`);

    // Drop the geography column
    await queryRunner.query(
      `ALTER TABLE "driver_profiles" DROP COLUMN IF EXISTS "current_location"`,
    );
  }
}
