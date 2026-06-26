import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Company, CompanyPlan } from '../../modules/companies/company.entity';
import { User, UserRole } from '../../modules/users/user.entity';
import { databaseConfig } from '../../config/database.config';

dotenv.config();

async function seed() {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  const companyRepo = dataSource.getRepository(Company);
  const userRepo = dataSource.getRepository(User);

  let company = await companyRepo.findOne({
    where: { email: 'demo@sendi.com.br' },
  });

  if (!company) {
    company = companyRepo.create({
      name: 'Sendi Demo',
      email: 'demo@sendi.com.br',
      plan: CompanyPlan.FREE,
    });
    company = await companyRepo.save(company);
    console.log(`Empresa criada: ${company.name} (${company.id})`);
  }

  let user = await userRepo.findOne({ where: { email: 'admin@sendi.com.br' } });

  if (!user) {
    const password = await bcrypt.hash('admin123', 12);
    user = userRepo.create({
      name: 'Admin Sendi',
      email: 'admin@sendi.com.br',
      password,
      role: UserRole.OWNER,
      companyId: company.id,
    });
    user = await userRepo.save(user);
    console.log(`Usuário criado: ${user.email}`);
    console.log('Senha: admin123');
  }

  await dataSource.destroy();
  console.log('Seed concluído!');
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
