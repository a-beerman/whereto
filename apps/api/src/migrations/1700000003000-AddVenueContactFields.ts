import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVenueContactFields1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add phone field
    await queryRunner.addColumn(
      'venues',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    // Add website field
    await queryRunner.addColumn(
      'venues',
      new TableColumn({
        name: 'website',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Add social_media field (JSONB)
    await queryRunner.addColumn(
      'venues',
      new TableColumn({
        name: 'social_media',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('venues', 'social_media');
    await queryRunner.dropColumn('venues', 'website');
    await queryRunner.dropColumn('venues', 'phone');
  }
}
