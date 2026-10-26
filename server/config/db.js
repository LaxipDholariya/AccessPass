import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

/**
 * Build database connection pool configuration supporting both:
 * 1. Discrete environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
 * 2. Unified Service URI (DATABASE_URL / MYSQL_URL) as provided by Aiven
 * 3. Secure TLS / SSL connection for Aiven cloud hosting
 */
function buildDbConfig() {
  let config = {};

  const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (connectionUri) {
    try {
      const parsedUrl = new URL(connectionUri);
      config = {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port) || 3306,
        user: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        database: parsedUrl.pathname.replace(/^\//, '') || 'defaultdb',
      };
    } catch (err) {
      console.warn('⚠️  Could not parse DATABASE_URL as a URL, falling back to discrete variables.');
    }
  }

  // Fallback to discrete variables if DATABASE_URL was not parsed
  if (!config.host) {
    config = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'accesspass_db',
    };
  }

  // Determine whether SSL/TLS should be enabled
  const isLocalHost = config.host === 'localhost' || config.host === '127.0.0.1';
  const shouldEnableSsl = 
    process.env.DB_SSL === 'true' || 
    (process.env.NODE_ENV === 'production' && !isLocalHost);

  if (shouldEnableSsl) {
    let caCertificate = process.env.DB_SSL_CA;

    // Check if a CA certificate file path is supplied
    if (!caCertificate && process.env.DB_SSL_CA_PATH && fs.existsSync(process.env.DB_SSL_CA_PATH)) {
      try {
        caCertificate = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf-8');
      } catch (err) {
        console.warn('⚠️  Failed to read DB_SSL_CA_PATH file:', err.message);
      }
    }

    if (caCertificate) {
      config.ssl = {
        ca: caCertificate,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      };
    } else {
      // Connect with TLS transport encryption required by Aiven
      // Defaults to rejectUnauthorized: false if custom CA file is not mounted
      const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';
      config.ssl = {
        rejectUnauthorized,
      };
    }
  }

  return {
    ...config,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    connectTimeout: 15000,
  };
}

const poolConfig = buildDbConfig();

// Create connection pool
const pool = mysql.createPool(poolConfig);

/**
 * Utility function to test database connectivity on server startup.
 * Logs clean, credential-safe status messages.
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const sanitizedHost = poolConfig.host || 'unknown';
    const sanitizedPort = poolConfig.port || 3306;
    const sanitizedDb = poolConfig.database || 'defaultdb';
    
    console.log(`✅ Connected successfully to MySQL database (${sanitizedHost}:${sanitizedPort}/${sanitizedDb}).`);
    connection.release();
    return true;
  } catch (error) {
    console.error('⚠️  Database Connection Notice:');
    console.error(`   Error code: ${error.code || 'ERR_CONNECTION'}`);
    console.error(`   Message: ${error.message}`);
    
    if (poolConfig.host === 'localhost' || poolConfig.host === '127.0.0.1') {
      console.error('   👉 Local troubleshooting: Ensure local MySQL/XAMPP is running and database exists.');
    } else {
      console.error('   👉 Cloud troubleshooting: Check Aiven host, port, credentials, and SSL settings.');
    }
    return false;
  }
}

export default pool;
