import { Controller, Post, Get, Query } from '@nestjs/common';
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
}