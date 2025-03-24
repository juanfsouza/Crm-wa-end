import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { CrmModule } from './crm/crm.module';

@Module({
  imports: [WhatsappModule, ChatModule, AuthModule, PrismaModule, CrmModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
