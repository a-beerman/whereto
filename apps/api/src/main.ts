import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, getSchemaPath } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { VenueResponseDto } from './catalog/dto/venue-response.dto';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // API prefix
  const apiPrefix = process.env.API_PREFIX || 'api';
  const apiVersion = process.env.API_VERSION || 'v1';
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('WhereTo API')
    .setDescription(
      'WhereTo API - City guide service API for discovering venues and group planning',
    )
    .setVersion('1.0')
    .addTag('catalog', 'Catalog endpoints for venues and cities')
    .addTag('plans', 'Group planning endpoints')
    .addTag('merchant', 'Merchant/partner endpoints for booking management')
    .addTag('ingestion', 'Data ingestion endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('metrics', 'Metrics endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Service token for bot authentication',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Telegram-Init-Data',
        description: 'Telegram WebApp initData for miniapp authentication',
      },
      'telegram-webapp',
    )
    .addServer(`http://localhost:${process.env.API_PORT || 3000}`, 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [VenueResponseDto],
  });
  // Swagger is set up at root level (not under api/v1 prefix) for easier access
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  logger.log(`📚 Swagger UI available at: http://localhost:${process.env.API_PORT || 3000}/docs`);
  logger.log(
    `📄 OpenAPI JSON available at: http://localhost:${process.env.API_PORT || 3000}/docs-json`,
  );

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 API is running on: http://localhost:${port}/${apiPrefix}/${apiVersion}`);
}

bootstrap();
