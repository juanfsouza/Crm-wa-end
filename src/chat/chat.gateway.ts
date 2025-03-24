import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  afterInit(server: Server) {
    console.log('ChatGateway inicializado, server disponível:', !!server);
    this.whatsappService.setIo(server); // Define o io no WhatsappService
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() data: { to: string; content: string }) {
    await this.whatsappService.sendMessage(data.to, data.content);
    this.server.emit('newMessage', { from: 'me', body: data.content });
  }
}