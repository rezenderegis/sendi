import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { Company, CompanyPlan } from '../companies/company.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingCompany = await this.companyRepository.findOne({
      where: { email: dto.companyEmail },
    });
    if (existingCompany) {
      throw new ConflictException('Já existe uma empresa com este email');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.userEmail },
    });
    if (existingUser) {
      throw new ConflictException('Já existe um usuário com este email');
    }

    const company = this.companyRepository.create({
      name: dto.companyName,
      email: dto.companyEmail,
      plan: CompanyPlan.FREE,
    });
    const savedCompany = await this.companyRepository.save(company);

    const user = this.userRepository.create({
      name: dto.userName,
      email: dto.userEmail,
      password: dto.password,
      role: UserRole.OWNER,
      companyId: savedCompany.id,
    });
    const savedUser = await this.userRepository.save(user);

    const token = this.generateToken(savedUser, savedCompany.id);

    return {
      accessToken: token,
      user: this.sanitizeUser(savedUser),
      company: savedCompany,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, isActive: true },
      select: ['id', 'email', 'name', 'password', 'role', 'companyId', 'isActive'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const token = this.generateToken(user, user.companyId);

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return this.sanitizeUser(user);
  }

  private generateToken(user: User, companyId: string) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId,
      role: user.role,
    });
  }

  private sanitizeUser(user: User) {
    const { password, ...rest } = user as any;
    return rest;
  }
}
