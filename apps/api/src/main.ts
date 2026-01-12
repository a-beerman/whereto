import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { VenueResponse } from './catalog/dto/venue-response';

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
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints).join(', ')
            : 'Validation failed';
          return `${error.property}: ${constraints}`;
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
          details: errors,
        });
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
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:4200'];

  // Allow ngrok origins dynamically (they change frequently)
  const allowNgrok = process.env.CORS_ALLOW_NGROK !== 'false';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Allow ngrok origins if enabled
      if (
        allowNgrok &&
        (origin.includes('.ngrok-free.dev') ||
          origin.includes('.ngrok.io') ||
          origin.includes('.ngrok-free.app'))
      ) {
        callback(null, true);
        return;
      }

      // Allow Cloudflare Tunnel origins if enabled (default: true)
      const allowCloudflare = process.env.CORS_ALLOW_CLOUDFLARE !== 'false';
      if (allowCloudflare && origin.includes('.trycloudflare.com')) {
        callback(null, true);
        return;
      }

      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
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
    extraModels: [VenueResponse],
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

void bootstrap();
