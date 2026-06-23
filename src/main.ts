import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }))

  app.setGlobalPrefix("api/v1")

  app.useStaticAssets(join(process.cwd(), 'src', 'uploads'), { prefix: '/uploads/' });
  console.log("Uploads path:", join(process.cwd(), 'src', 'uploads'));
  const config = new DocumentBuilder()
    .setTitle("CRM N26 group")
    .addBearerAuth()
    .build()

  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("swagger", app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    }
  })

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
