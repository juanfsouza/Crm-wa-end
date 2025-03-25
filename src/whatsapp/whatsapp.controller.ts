import { Controller, Post, Get, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('regenerate-qr')
  async regenerateQrCode() {
    console.log('Requisição POST /whatsapp/regenerate-qr recebida');
    await this.whatsappService.regenerateQrCode();
    return { message: 'Solicitando novo QR Code...' };
  }

  @Post('disconnect')
  async disconnect() {
    console.log('Requisição POST /whatsapp/disconnect recebida');
    await this.whatsappService.disconnect();
    return { message: 'WhatsApp desconectado' };
  }

  @Get('status')
  async getStatus() {
    console.log('Requisição GET /whatsapp/status recebida');
    const isConnected = await this.whatsappService.isConnected();
    return { isConnected };
  }

  @Get('contacts')
  async getContacts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    console.log('Requisição GET /whatsapp/contacts recebida');
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return await this.whatsappService.getContacts(pageNum, limitNum);
  }

  @Get('messages/:contactId')
  async getMessages(
    @Param('contactId') contactId: string,
    @Query('limit') limit: string = '50',
  ) {
    console.log('Requisição GET /whatsapp/messages/:contactId recebida');
    const limitNum = parseInt(limit, 10);
    const messages = await this.whatsappService.getChatMessages(contactId, limitNum);
    return { messages };
  }

  @Put('messages/:messageId')
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() body: { to: string; newContent: string },
  ) {
    console.log('Requisição PUT /whatsapp/messages/:messageId recebida');
    return { success: true };
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Query('to') to: string,
  ) {
    console.log('Requisição DELETE /whatsapp/messages/:messageId recebida');
    return { success: true };
  }
}