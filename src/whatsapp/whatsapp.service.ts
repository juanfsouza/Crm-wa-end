import { Injectable } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappService {
  private client: Client | null = null;
  private io: Server | null = null;
  private pendingQrCode: string | null = null;

  constructor() {
    // Criar diretório para armazenar imagens temporariamente
    const imagesDir = path.join(__dirname, '..', '..', 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
  }

  setIo(io: Server) {
    console.log('Definindo io no WhatsappService');
    this.io = io;
    if (this.pendingQrCode) {
      console.log('Emitindo QR Code pendente:', this.pendingQrCode);
      this.io.emit('qrCode', this.pendingQrCode);
      this.pendingQrCode = null;
    }
  }

  private initializeClient() {
    console.log('Inicializando cliente WhatsApp...');
    this.client = new Client({
      authStrategy: new LocalAuth(),
    });

    this.client.on('qr', (qr) => {
      console.log('QR Code recebido, escaneie:', qr);
      if (this.io) {
        this.io.emit('qrCode', qr);
        console.log('Evento qrCode emitido via Socket.IO');
        this.pendingQrCode = null;
      } else {
        console.error('io não está disponível, armazenando QR Code temporariamente');
        this.pendingQrCode = qr;
      }
    });

    this.client.on('ready', () => {
      console.log('WhatsApp Client pronto!');
      if (this.io) {
        this.io.emit('whatsappReady', true);
      }
    });

    this.client.on('message', (msg) => {
      console.log('Mensagem recebida:', msg.body);
      if (this.io) {
        this.io.emit('newMessage', msg);
      }
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp desconectado:', reason);
      if (this.io) {
        this.io.emit('whatsappDisconnected', true);
      }
      this.client = null;
    });

    this.client.initialize();
  }

  private async downloadImage(url: string, contactId: string): Promise<string | null> {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      const imagePath = path.join(__dirname, '..', '..', 'public', 'images', `${contactId}.jpg`);
      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/images/${contactId}.jpg`));
        writer.on('error', (err) => {
          console.error(`Erro ao baixar imagem para ${contactId}:`, err);
          resolve(null);
        });
      });
    } catch (err) {
      console.error(`Erro ao baixar imagem para ${contactId}:`, err);
      return null;
    }
  }

  async getContacts(page: number = 1, limit: number = 50) {
    if (!this.client) {
      throw new Error('Cliente WhatsApp não inicializado. Gere o QR Code primeiro.');
    }

    const contacts = await this.client.getContacts();
    const filteredContacts = await Promise.all(
      contacts
        .filter((contact) => !contact.isGroup) // Exclui contatos de grupos
        .filter((contact) => {
          const number = contact.number?.replace(/\D/g, '') || '';
          return number.startsWith('55') && number.length === 12;
        }) // Filtra números válidos
        .map(async (contact) => {
          let photoUrl = await contact.getProfilePicUrl().catch((err) => {
            console.error(`Erro ao buscar foto para ${contact.id._serialized}:`, err);
            return null;
          });

          // Baixar a imagem e servir localmente
          let photo: string | null = null;
          if (photoUrl) {
            photo = await this.downloadImage(photoUrl, contact.id._serialized);
          }

          return {
            id: contact.id._serialized,
            name: contact.name || contact.pushname || 'Sem Nome',
            number: contact.number,
            photo,
          };
        }),
    );

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

    return {
      contacts: paginatedContacts,
      total: filteredContacts.length,
      page,
      limit,
      hasMore: endIndex < filteredContacts.length,
    };
  }

  async sendMessage(to: string, content: string) {
    if (!this.client) {
      throw new Error('Cliente WhatsApp não inicializado. Gere o QR Code primeiro.');
    }
    return this.client.sendMessage(to, content);
  }

  async regenerateQrCode() {
    console.log('Chamando regenerateQrCode...');
    if (this.client) {
      console.log('Destruindo cliente existente...');
      await this.client.destroy();
    }
    this.initializeClient();
  }

  async disconnect() {
    console.log('Desconectando cliente WhatsApp...');
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      if (this.io) {
        this.io.emit('whatsappDisconnected', true);
      }
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      const state = await this.client.getState();
      return state === 'CONNECTED';
    } catch (error) {
      console.error('Erro ao verificar estado de conexão:', error);
      return false;
    }
  }
}