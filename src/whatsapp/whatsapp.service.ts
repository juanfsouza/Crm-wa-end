import { Injectable } from '@nestjs/common';
import { Client, LocalAuth, Message as WAMessage } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappService {
  private client: Client | null = null;
  private io: Server | null = null;
  private pendingQrCode: string | null = null;
  private clientNumber: string | null = null;

  constructor() {
    const imagesDir = path.join(__dirname, '..', '..', 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    this.initializeClient();
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

  private async initializeClient() {
    console.log('Inicializando cliente WhatsApp...');
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true },
    });

    this.client.on('qr', (qr) => {
      console.log('QR Code recebido:', qr);
      if (this.io) {
        this.io.emit('qrCode', qr);
        this.pendingQrCode = null;
      } else {
        console.error('io não disponível, armazenando QR Code');
        this.pendingQrCode = qr;
      }
    });

    this.client.on('ready', async () => {
      console.log('WhatsApp Client pronto!');
      if (this.client) {
        const user = await this.client.getContactById(this.client.info.wid._serialized);
        this.clientNumber = user.number;
        console.log('Número do cliente:', this.clientNumber);
        if (this.io) {
          this.io.emit('whatsappReady', true);
        }
      }
    });

    this.client.on('message', (msg: WAMessage) => {
      console.log('Mensagem recebida:', msg.body);
      if (this.io) {
        const message = {
          id: msg.id.id,
          content: msg.body,
          senderId: msg.from === this.clientNumber ? 'me' : msg.from,
          createdAt: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
        };
        this.io.emit('newMessage', message);
      }
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp desconectado:', reason);
      if (this.io) {
        this.io.emit('whatsappDisconnected', true);
      }
      this.client = null;
      this.clientNumber = null;
      this.initializeClient();
    });

    try {
      await this.client.initialize();
    } catch (error) {
      console.error('Erro ao inicializar cliente WhatsApp:', error);
      this.client = null;
    }
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
      throw new Error('Cliente WhatsApp não inicializado.');
    }

    const contacts = await this.client.getContacts();
    const filteredContacts = await Promise.all(
      contacts
        .filter((contact) => !contact.isGroup)
        .filter((contact) => {
          const number = contact.number?.replace(/\D/g, '') || '';
          return number.startsWith('55') && number.length === 12;
        })
        .map(async (contact) => {
          let photoUrl = await contact.getProfilePicUrl().catch(() => null);
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

  async getChatMessages(contactId: string, limit: number = 50) {
    if (!this.client) {
      throw new Error('Cliente WhatsApp não inicializado.');
    }

    const chat = await this.client.getChatById(contactId);
    const messages = await chat.fetchMessages({ limit });

    return {
      messages: messages.map((msg) => ({
        id: msg.id.id,
        content: msg.body,
        senderId: msg.from === this.clientNumber ? 'me' : msg.from,
        createdAt: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
      })),
    };
  }

  async sendMessage(to: string, content: string) {
    if (!this.client) {
      throw new Error('Cliente WhatsApp não inicializado.');
    }
    const formattedTo = to.replace(/\D/g, '') + '@c.us';
    const message = await this.client.sendMessage(formattedTo, content);
    return {
      id: message.id.id,
      content: message.body,
      senderId: 'me',
      createdAt: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
    };
  }

  async editMessage(messageId: string, newContent: string, chatId: string) {
    if (!this.client) {
      throw new Error('Cliente WhatsApp não inicializado.');
    }
    console.log(`Simulando edição da mensagem ${messageId} para o conteúdo: ${newContent} no chat ${chatId}`);
    return true;
  }

  async deleteMessage(messageId: string, chatId: string) {
    if (!this.client) {
      throw new Error('Cliente WhatsApp não inicializado.');
    }

    const chat = await this.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 100 });
    const message = messages.find((msg) => msg.id.id === messageId);

    if (!message) {
      throw new Error('Mensagem não encontrada.');
    }

    await message.delete(true);
    return true;
  }

  async regenerateQrCode() {
    console.log('Regenerando QR Code...');
    if (this.client) {
      await this.client.destroy();
    }
    this.initializeClient();
  }

  async disconnect() {
    console.log('Desconectando cliente WhatsApp...');
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.clientNumber = null;
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
      console.error('Erro ao verificar estado:', error);
      return false;
    }
  }
}