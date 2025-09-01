import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dataRoutes from './routes/data.js';
import gitDataRoutes from './routes/gitData.js';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import wordsRoutes from './routes/words.js';
import learningRoutes from './routes/learning.js';
import DataService from './services/dataService.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
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
    timestamp: new Date().toISOString()
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

app.listen(PORT, async () => {
  console.log(`🚀 Bluesky LangApp API Server running at http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  
  // Initialize data service
  try {
    const dataService = new DataService();
    await dataService.initialize();
    console.log(`💾 Data service initialized successfully`);
  } catch (error) {
    console.error('❌ Failed to initialize data service:', error);
  }
});

export default app;