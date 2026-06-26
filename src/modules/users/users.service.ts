import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { companyId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, companyId },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async create(companyId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email já está em uso');
    }

    const user = this.userRepository.create({
      ...dto,
      companyId,
    });
    return this.userRepository.save(user);
  }

  async update(id: string, companyId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id, companyId);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async remove(id: string, companyId: string, requestingUserId: string): Promise<void> {
    const user = await this.findById(id, companyId);

    if (user.id === requestingUserId) {
      throw new ForbiddenException('Não é possível remover o próprio usuário');
    }

    if (user.role === UserRole.OWNER) {
      throw new ForbiddenException('Não é possível remover o owner da empresa');
    }

    user.isActive = false;
    await this.userRepository.save(user);
  }
}
