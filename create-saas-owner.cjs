const bcrypt = require('bcrypt');
const { neonConfig, Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { saasOwners } = require('./shared/schema.ts');
const ws = require("ws");

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createSaaSOwner() {
  try {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle({ client: pool });

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const [owner] = await db.insert(saasOwners).values({
      username: 'saas_admin',
      password: hashedPassword,
      email: 'admin@curapms.ai',
      firstName: 'SaaS',
      lastName: 'Administrator',
      isActive: true,
    }).returning();

    console.log('✅ SaaS Owner created successfully:');
    console.log('Username: saas_admin');
    console.log('Password: admin123');
    console.log('Email:', owner.email);
    console.log('ID:', owner.id);
    console.log('\n🔐 You can now access the SaaS portal at /saas');

  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.log('ℹ️  SaaS owner already exists');
      console.log('Username: saas_admin');
      console.log('Password: admin123');
      console.log('\n🔐 You can access the SaaS portal at /saas');
    } else {
      console.error('Error creating SaaS owner:', error);
    }
  }
}

createSaaSOwner();