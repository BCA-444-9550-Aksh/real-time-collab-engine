import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Real-Time Collaborative Editing Engine API',
      version: '1.0.0',
      description:
        'Production-grade backend for a Google-Docs-style collaborative document editing platform. Supports JWT auth, RBAC, CRDT-based real-time editing, version history, and WebSocket presence.',
      contact: {
        name: 'API Support',
        email: 'support@collab-engine.dev',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Resource not found' },
            code: { type: 'string', example: 'NOT_FOUND' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scan all route files for JSDoc comments
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
