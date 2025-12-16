import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';

/**
 * Create a mock repository for testing
 */
export function createMockRepository<T extends ObjectLiteral>(): Partial<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

/**
 * Create a testing module with mocked dependencies
 */
export async function createTestingModule(
  providers: any[],
  controllers: any[] = [],
): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers,
    providers,
  }).compile();
}

/**
 * Mock repository factory for TypeORM entities
 */
export function mockRepositoryFactory<T extends ObjectLiteral>(entity: any) {
  return {
    provide: getRepositoryToken(entity),
    useValue: createMockRepository<T>(),
  };
}
