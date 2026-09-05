import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { helmetConfig, apiRateLimiter, conditionalCsrf, sanitizeInput, securityHeaders, suspiciousActivityDetector } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import orderRoutes from './routes/orders.js';
import { initializeDatabase } from './utils/initDb.js';
import { PORT, FRONTEND_URL, isProduction } from './config/env.js';

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);
app.use(suspiciousActivityDetector);

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for refresh token
app.use(cookieParser());

// Input sanitization (XSS protection)
app.use(sanitizeInput);

// CSRF protection (conditional - skip for JWT Bearer tokens)
app.use(conditionalCsrf);

// General rate limiting
app.use(apiRateLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${isProduction ? 'production' : 'development'} mode`);
      console.log(`Frontend URL: ${FRONTEND_URL}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;