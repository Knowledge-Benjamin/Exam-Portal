import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './src/db/schema';
import { env } from './src/config/env';
import bcrypt from 'bcryptjs';

const sql = neon(env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const users = await db
    .insert(schema.users)
    .values([
      {
        fullName: 'Demo Teacher',
        email: 'teacher@multitech.ac',
        passwordHash: teacherPassword,
        role: 'teacher',
      },
      {
        fullName: 'Demo Student',
        email: 'student@multitech.ac',
        passwordHash: studentPassword,
        role: 'student',
      },
    ])
    .returning();

  console.log('✅ Seed complete. Created users:');
  console.table(
    users.map((u) => ({
      email: u.email,
      role: u.role,
      password: u.role === 'teacher' ? 'teacher123' : 'student123',
    }))
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
