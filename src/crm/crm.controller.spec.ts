import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';

describe('CrmController', () => {
  let controller: CrmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
    }).compile();

    controller = module.get<CrmController>(CrmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
