import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async createCard(title: string, contactId: string, status: string = 'TODO') {
    return this.prisma.crmCard.create({
      data: { title, contactId, status },
    });
  }

  async getCards() {
    return this.prisma.crmCard.findMany({
      include: { contact: true },
    });
  }

  async updateCard(id: number, status: string) {
    return this.prisma.crmCard.update({
      where: { id },
      data: { status },
    });
  }

  async deleteCard(id: number) {
    return this.prisma.crmCard.delete({
      where: { id },
    });
  }
}