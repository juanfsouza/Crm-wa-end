import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('cards')
  async createCard(
    @Body() body: { title: string; contactId: string; status?: string },
  ) {
    return this.crmService.createCard(body.title, body.contactId, body.status);
  }

  @Get('cards')
  async getCards() {
    return this.crmService.getCards();
  }

  @Put('cards/:id')
  async updateCard(@Param('id') id: string, @Body() body: { status: string }) {
    return this.crmService.updateCard(parseInt(id), body.status);
  }

  @Delete('cards/:id')
  async deleteCard(@Param('id') id: string) {
    return this.crmService.deleteCard(parseInt(id));
  }
}