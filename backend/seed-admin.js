const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  try {
    // Informations de l'admin
    const adminData = {
      email: 'admin@livefx.com',
      password: 'Admin123!',  // Changez ce mot de passe !
      full_name: 'Administrateur LiveFx',
      role: 'admin',
      phone: '+221000000000'
    };

    // Vérifier si l'admin existe déjà
    const exists = await pool.query('SELECT * FROM users WHERE email = $1', [adminData.email]);
    if (exists.rows.length > 0) {
      console.log('⚠️  Un admin avec cet email existe déjà.');
      console.log('📧 Email:', adminData.email);
      process.exit(0);
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(adminData.password, salt);

    // Insérer l'admin
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, full_name',
      [adminData.email, password_hash, adminData.full_name, adminData.role, adminData.phone]
    );

    console.log('✅ Administrateur créé avec succès !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Mot de passe:', adminData.password);
    console.log('👤 Nom:', adminData.full_name);
    console.log('🎭 Rôle:', adminData.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Changez le mot de passe après la première connexion !');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createAdmin();
