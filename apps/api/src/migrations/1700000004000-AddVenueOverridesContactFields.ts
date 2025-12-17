import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVenueOverridesContactFields1700000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add phone override field
    await queryRunner.addColumn(
      'venue_overrides',
      new TableColumn({
        name: 'phone_override',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    // Add website override field
    await queryRunner.addColumn(
      'venue_overrides',
      new TableColumn({
        name: 'website_override',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Add social_media_override field (JSONB)
    await queryRunner.addColumn(
      'venue_overrides',
      new TableColumn({
        name: 'social_media_override',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('venue_overrides', 'social_media_override');
    await queryRunner.dropColumn('venue_overrides', 'website_override');
    await queryRunner.dropColumn('venue_overrides', 'phone_override');
  }
}
