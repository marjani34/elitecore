import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  /** Create or replace the product's full state. */
  @Put(':id')
  save(@Param('id') id: string, @Body() body: { data?: unknown }) {
    return this.products.save(id, body?.data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
