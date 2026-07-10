import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  findAll(companyId: string): Promise<Product[]> {
    return this.productRepo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id, companyId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async findOrCreateByName(name: string, companyId: string): Promise<Product> {
    let product = await this.productRepo.findOne({ where: { name, companyId } });
    if (!product) {
      product = this.productRepo.create({ name, companyId });
      await this.productRepo.save(product);
    }
    return product;
  }

  async create(companyId: string, dto: CreateProductDto): Promise<Product> {
    const exists = await this.productRepo.findOne({ where: { name: dto.name, companyId } });
    if (exists) throw new ConflictException('Produto com este nome já existe');
    const product = this.productRepo.create({ ...dto, companyId });
    return this.productRepo.save(product);
  }

  async update(id: string, companyId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id, companyId);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const product = await this.findOne(id, companyId);
    await this.productRepo.remove(product);
  }
}
