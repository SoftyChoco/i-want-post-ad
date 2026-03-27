import 'reflect-metadata';
import AppDataSource from '../data-source';
import { User } from '../lib/entities/User';
import { PolicyDocument } from '../lib/entities/PolicyDocument';
import bcrypt from 'bcryptjs';
import { DEFAULT_POLICY_CONTENT, DEFAULT_POLICY_VERSION, applyVersionToContent } from '../lib/policy';

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connection established');

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin1234';
  const name = 'Admin';

  const userRepository = AppDataSource.getRepository(User);
  const policyRepository = AppDataSource.getRepository(PolicyDocument);

  const existingUser = await userRepository.findOneBy({ email });
  if (existingUser) {
    console.log('Admin user already exists');
  } else {
    const passwordHash = await bcrypt.hash(password, 10);

    const adminUser = userRepository.create({
      email,
      passwordHash,
      name,
      role: 'admin',
    });

    await userRepository.save(adminUser);
    console.log('Admin user created');
  }

  const existingPolicy = await policyRepository.findOneBy({ key: 'default' });
  if (existingPolicy) {
    console.log('Default policy already exists');
  } else {
    const seededContent = applyVersionToContent(DEFAULT_POLICY_CONTENT, DEFAULT_POLICY_VERSION);
    const policyDocument = policyRepository.create({
      key: 'default',
      version: DEFAULT_POLICY_VERSION,
      content: seededContent,
    });
    await policyRepository.save(policyDocument);
    console.log('Default policy created');
  }

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding error:', error);
  process.exit(1);
});
