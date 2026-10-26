import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { testConnection } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import hostRoutes from './routes/hostRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load environment configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// =========================================================================
// CORS Configuration (Configured for Vercel Frontend and local dev)
// =========================================================================
const rawOrigins = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-side health checks)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');

      // Allow wildcard or explicit match with configured Vercel origin
      if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      // Allow localhost ports in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        if (cleanOrigin.startsWith('http://localhost:') || cleanOrigin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
      }

      // Allow all Vercel preview deployment URLs if explicitly enabled
      if (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && cleanOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON request bodies
app.use(express.json());

// Serve production static assets if client build exists in monorepo
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// =========================================================================
// Health Check Endpoints (For Render monitoring and system verification)
// =========================================================================
app.get(['/health', '/api/health'], async (req, res) => {
  let dbStatus = 'connected';
  try {
    const isConnected = await testConnection();
    if (!isConnected) dbStatus = 'disconnected';
  } catch (err) {
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'AccessPass Backend API',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Mount application API modules
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' does not exist on this server.`,
  });
});

// Single Page Application (SPA) HTML fallback for client-side routing on page refresh
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (fs.existsSync(clientDistPath)) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.json({
    message: 'AccessPass API Server is running',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Centralized error-handling middleware (prevents leaking internal stack traces)
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
  });
});

// Start the Express server binding to 0.0.0.0 and process.env.PORT
app.listen(PORT, HOST, async () => {
  console.log(`=========================================`);
  console.log(`🚀 AccessPass Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`=========================================`);

  // Verify MySQL connectivity
  await testConnection();
});
