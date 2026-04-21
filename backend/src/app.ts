import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { logger } from './config/logger';

import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes          from './routes/auth.routes';
import documentRoutes      from './routes/document.routes';
import collaboratorRoutes  from './routes/collaborator.routes';
import versionRoutes       from './routes/version.routes';
import chatRoutes          from './routes/chat.routes';

export function createApp(): Application {
  const app = express();

  // ─── Security ────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      // Allow swagger-ui inline scripts
      contentSecurityPolicy:
        env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // ─── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin / server-to-server calls (no Origin header)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
      },
      credentials: true,
    }),
  );

  // ─── Body / Compression ──────────────────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Request Logging (non-prod) ──────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use((req, _res, next) => {
      logger.http(`${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // ─── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Swagger UI ──────────────────────────────────────────────────────────────
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Collab Engine API',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  // Raw OpenAPI spec JSON
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ─── API Rate Limit (broad) ──────────────────────────────────────────────────
  app.use('/api', apiRateLimiter);

  // ─── Routes ──────────────────────────────────────────────────────────────────
  app.use('/api/auth',                    authRoutes);
  app.use('/api/docs/:id/messages',       chatRoutes);
  app.use('/api/docs/:id/versions',       versionRoutes);
  app.use('/api/docs/:id/collaborators',  collaboratorRoutes);
  app.use('/api/docs',                    documentRoutes);

  // ─── 404 ─────────────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      code: 'NOT_FOUND',
    });
  });

  // ─── Global Error Handler ────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
