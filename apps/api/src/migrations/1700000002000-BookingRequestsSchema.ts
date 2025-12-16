import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class BookingRequestsSchema1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Booking Requests Table
    await queryRunner.createTable(
      new Table({
        name: 'booking_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'plan_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'venue_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'requested_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'requested_time',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'participants_count',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'confirmed_time',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'proposed_time',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'response_time_seconds',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'merchant_user_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'booking_requests',
      new TableForeignKey({
        columnNames: ['plan_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'plans',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'booking_requests',
      new TableForeignKey({
        columnNames: ['venue_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'venues',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'booking_requests',
      new TableIndex({
        name: 'IDX_BOOKING_REQUESTS_PLAN_ID',
        columnNames: ['plan_id'],
      }),
    );

    await queryRunner.createIndex(
      'booking_requests',
      new TableIndex({
        name: 'IDX_BOOKING_REQUESTS_VENUE_ID',
        columnNames: ['venue_id'],
      }),
    );

    await queryRunner.createIndex(
      'booking_requests',
      new TableIndex({
        name: 'IDX_BOOKING_REQUESTS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'booking_requests',
      new TableIndex({
        name: 'IDX_BOOKING_REQUESTS_MERCHANT_USER_ID',
        columnNames: ['merchant_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'booking_requests',
      new TableIndex({
        name: 'IDX_BOOKING_REQUESTS_REQUESTED_DATE',
        columnNames: ['requested_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('booking_requests');
  }
}
