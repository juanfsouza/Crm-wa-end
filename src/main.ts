import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de CORS para HTTP
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Configuração do Socket.IO com CORS
  app.useWebSocketAdapter(
    new IoAdapter(app)
  );

  app.use('/images', express.static(join(__dirname, '..', 'public', 'images')));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Servidor rodando na porta ${port}`);
}

bootstrap();