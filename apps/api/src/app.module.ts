import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import databaseConfig from './config/database.config';
import { CatalogModule } from './catalog/catalog.module';
import { HealthController } from './common/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('database'),
      inject: [ConfigService],
    }),
    TerminusModule,
    CatalogModule,
    // PlansModule will be added in Phase 4
    // MerchantModule will be added in Phase 7
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
