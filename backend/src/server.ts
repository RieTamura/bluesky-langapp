import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import dataRoutes from './routes/data.js';
import gitDataRoutes from './routes/gitData.js';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import wordsRoutes from './routes/words.js';
import learningRoutes from './routes/learning.js';
import atProtocolRoutes from './routes/atProtocol.js';
import DataService from './services/dataService.js';
import { atProtocolService } from './services/atProtocolService.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File path for request logging (used by debug middleware)
const LOG_PATH = path.join(__dirname, '../../request.log');

// Load environment variables
dotenv.config();

// Track AT Protocol auto-init status for health checks
let atProtocolInitialized = false;
let atProtocolInitError: Error | null = null;

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
// ファイルの先頭でログパスを定義 (defined above)

// Debug middleware
app.use((req, res, next) => {
  const line = `${new Date().toISOString()} - ${req.method} ${req.url}\n`;
  console.log(line.trim());
  // Fire-and-forget async logging
  fs.appendFile(LOG_PATH, line).catch(err => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to write request log:', err);
    }
  });
  next();
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bluesky LangApp API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Test Bluesky connection
app.get('/api/test-bluesky', async (req, res) => {
  try {
    const BlueskyService = (await import('./services/blueskyService.js')).default;
    const service = new BlueskyService();
    
    // Test with the credentials from index.js
    await service.login({
      identifier: 'connectobasan.com',
      password: 'vzb3-3vm3-7xhw-2w4i'
    });
    
    console.log('Test Bluesky login successful');
    
    // Try to get some posts
    const posts = await service.getUserPosts('connectobasan.com', 5);
    console.log('Test posts fetched:', posts.length);
    
    res.json({
      success: true,
      message: 'Bluesky connection test successful',
      postsCount: posts.length,
      posts: posts
    });
  } catch (error) {
    console.error('Bluesky test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    atProtocol: {
  initialized: atProtocolInitialized,
  // Access message defensively to avoid narrow-type issues from the compiler
  error: atProtocolInitError ? (atProtocolInitError as any).message || String(atProtocolInitError) : null
    }
  });
});

// API routes
console.log('Registering API routes...');
app.use('/api/data', dataRoutes);
app.use('/api/data', gitDataRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/atprotocol', atProtocolRoutes);
console.log('API routes registered successfully');

// API routes placeholder for other endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not implemented yet',
    path: req.path 
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Serve the main HTML file for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  // Only serve HTML for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ 
      error: 'API route not found',
      path: req.originalUrl 
    });
  }
});

async function start(port: number, attempt = 0) {
  // Determine bind address from environment with a safe default.
  // For security, bind to localhost in production unless an explicit override is provided.
  const envBind = (process.env.BIND_ADDRESS || process.env.HOST || '').trim();
  const DEFAULT_BIND = '127.0.0.1';
  const bindAllOverride = String(process.env.BIND_ALL_OVERRIDE || process.env.ALLOW_BIND_ALL || '').toLowerCase() === 'true';

  let bindAddress = envBind || DEFAULT_BIND;

  // If user requested bind-all via explicit value
  if (bindAddress === '0.0.0.0') {
    if (process.env.NODE_ENV === 'production' && !bindAllOverride) {
      // Fail fast in production unless override flag is set
      console.error(`Refusing to bind to 0.0.0.0 in production. Set BIND_ALL_OVERRIDE=true to override (not recommended).`);
      process.exit(1);
    }
    // Allow 0.0.0.0 in non-production or when override present
  }

  // Validate the bindAddress is a plausible IPv4/IPv6 or hostname
  try {
    // Basic validation: non-empty and not contain control characters
    if (!bindAddress || /[\0-\x1F]/.test(bindAddress)) throw new Error('Invalid bind address');
  } catch (err) {
    console.error('Invalid BIND_ADDRESS/HOST provided:', err);
    process.exit(1);
  }

  // Bind server to the selected address
  const server = app.listen(port, bindAddress, () => {
  const ifaces = os.networkInterfaces();
    let lanIp = 'localhost';
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          lanIp = iface.address;
          break;
        }
      }
      if (lanIp !== 'localhost') break;
    }

    console.log(`🚀 Bluesky LangApp API Server running at http://localhost:${port}`);
    console.log(`Bound to address: ${bindAddress}`);
    if (bindAddress === '0.0.0.0') {
      console.warn('Server is bound to 0.0.0.0 (all interfaces). This is unsafe in production unless explicitly allowed.');
    }
    console.log(`� LAN address: http://${lanIp}:${port}`);
    console.log(`�📊 Health check available at http://${lanIp}:${port}/health`);

    // Run async initialization in an IIFE so the listen callback remains synchronous
    (async () => {
      // Initialize data service
      try {
        const dataService = new DataService();
        await dataService.initialize();
        console.log(`💾 Data service initialized successfully`);
      } catch (error) {
        console.error('❌ Failed to initialize data service:', error);
      }

      // Optional: automatic Bluesky AT Protocol initialization is intentionally disabled.
      // If you want automatic initialization, set BLUESKY_HANDLE/BLUESKY_PASSWORD in
      // the environment and re-enable the initialization logic here.
      const handle = process.env.BLUESKY_HANDLE;
      const password = process.env.BLUESKY_PASSWORD;
      if (handle && password) {
        console.log('AT Protocol auto-init is disabled in code; enable it explicitly if desired');
      } else {
        console.log('AT Protocol auto-init skipped (BLUESKY_HANDLE/BLUESKY_PASSWORD not set)');
      }
    })();
  });

  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      if (attempt > 5) {
        console.error(`❌ Port selection failed after multiple attempts. Last tried: ${port}`);
        process.exit(1);
      }
      const nextPort = port + 1;
      console.warn(`⚠️  Port ${port} in use. Retrying with ${nextPort}...`);
      setTimeout(() => start(nextPort, attempt + 1), 300);
    } else {
      console.error('Server error:', err);
    }
  });
}

start(BASE_PORT);

export default app;