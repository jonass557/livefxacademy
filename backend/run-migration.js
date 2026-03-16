const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const migrationFile = process.argv[2] || '002_trainer_strategies.sql';
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    console.log('Running migration:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log('⏭️  Skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            console.error('❌ Error:', err.message);
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
