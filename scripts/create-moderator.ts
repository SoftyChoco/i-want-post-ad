import 'reflect-metadata';
import AppDataSource from '../data-source';
import { User } from '../lib/entities/User';
import bcrypt from 'bcryptjs';

async function createModerator() {
  await AppDataSource.initialize();
  console.log('Database connection established');

  const email = process.env.MODERATOR_EMAIL || 'moderator@example.com';
  const password = process.env.MODERATOR_PASSWORD || 'mod1234';
  const name = 'Moderator';  // ASCII name to avoid token encoding issues

  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOneBy({ email });
  if (existingUser) {
    console.log('Moderator user already exists, skipping creation');
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const moderatorUser = userRepository.create({
    email,
    passwordHash,
    name,
    role: 'moderator',
  });

  await userRepository.save(moderatorUser);
  console.log('Moderator user created');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Name:', name);
  console.log('Role:', moderatorUser.role);

  await AppDataSource.destroy();
}

createModerator().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
