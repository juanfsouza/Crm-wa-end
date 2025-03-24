import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

export const SOCKET_IO_SERVER = 'SOCKET_IO_SERVER';

@Module({
  imports: [forwardRef(() => WhatsappModule)],
  providers: [
    ChatGateway,
    {
      provide: SOCKET_IO_SERVER,
      useFactory: (gateway: ChatGateway) => {
        console.log('Fornecendo SOCKET_IO_SERVER, server disponível:', !!gateway.server);
        return gateway.server;
      },
      inject: [ChatGateway],
    },
  ],
  exports: [SOCKET_IO_SERVER],
})
export class ChatModule {}