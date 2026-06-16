// Production SaaS Setup Fix
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

async function setupSaaSAdmin() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Setting up SaaS admin user...');
    
    // Check if SaaS admin exists
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1 AND "organizationId" = 0', ['saas_admin']);
    
    if (checkUser.rows.length === 0) {
      // Create SaaS admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(`
        INSERT INTO users (username, email, password, "firstName", "lastName", "organizationId", role, "isActive", "isSaaSOwner")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, ['saas_admin', 'saas_admin@curaemr.ai', hashedPassword, 'SaaS', 'Administrator', 0, 'admin', true, true]);
      
      console.log('✅ SaaS admin user created successfully');
    } else {
      console.log('✅ SaaS admin user already exists');
    }
    
    console.log('Production setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await pool.end();
  }
}

setupSaaSAdmin();
