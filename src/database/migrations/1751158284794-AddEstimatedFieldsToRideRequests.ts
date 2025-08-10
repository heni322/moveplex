import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstimatedFieldsToRideRequests1719619745000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ride_requests 
            ADD COLUMN estimated_distance DECIMAL(10,4),
            ADD COLUMN estimated_duration DECIMAL(10,2),
            ADD COLUMN estimated_fare DECIMAL(10,2),
            ADD COLUMN surge_multiplier DECIMAL(3,2) DEFAULT 1.0
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ride_requests 
            DROP COLUMN estimated_distance,
            DROP COLUMN estimated_duration,
            DROP COLUMN estimated_fare,
            DROP COLUMN surge_multiplier
        `);
  }
}
