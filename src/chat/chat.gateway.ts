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
    console.log('ChatGateway inicializado');
    this.whatsappService.setIo(server);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() data: { to: string; content: string }) {
    console.log('Enviando mensagem:', data);
    try {
      const message = await this.whatsappService.sendMessage(data.to, data.content);
      this.server.emit('newMessage', {
        id: message.id,
        content: message.content,
        senderId: 'me',
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw new Error('Não foi possível enviar a mensagem. Cliente WhatsApp não inicializado.');
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(@MessageBody() data: { messageId: string; to: string }) {
    console.log('Deletando mensagem:', data);
    try {
      const chatId = data.to.replace(/\D/g, '') + '@c.us';
      await this.whatsappService.deleteMessage(data.messageId, chatId);
      this.server.emit('messageDeleted', { messageId: data.messageId, to: data.to });
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw new Error('Não foi possível deletar a mensagem: ' + error.message);
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(@MessageBody() data: { messageId: string; to: string; newContent: string }) {
    console.log('Editando mensagem:', data);
    try {
      const chatId = data.to.replace(/\D/g, '') + '@c.us';
      await this.whatsappService.editMessage(data.messageId, data.newContent, chatId);
      this.server.emit('messageEdited', {
        messageId: data.messageId,
        to: data.to,
        content: data.newContent,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
      throw new Error('Não foi possível editar a mensagem: ' + error.message);
    }
  }
}