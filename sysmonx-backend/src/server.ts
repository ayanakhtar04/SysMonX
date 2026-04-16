import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import vmRouter from './routes/vm.routes';
import engineRouter from './routes/engine.routes';
import predictionsRouter from './routes/predictions';

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

export const createServer = (): Application => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/vms', vmRouter);
  app.use('/api/engine', engineRouter);
  app.use('/api/predictions', predictionsRouter);

  app.use((req, res) => {
    const body: ApiErrorResponse = { error: `Route not found: ${req.method} ${req.path}` };
    res.status(404).json(body);
  });

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: Error, _req: Request, res: Response<ApiErrorResponse>, _next: NextFunction) => {
      const isProduction = process.env.NODE_ENV === 'production';
      const body: ApiErrorResponse = {
        error: 'Internal server error',
        details: isProduction ? undefined : err.message,
      };
      res.status(500).json(body);
    },
  );

  return app;
};
