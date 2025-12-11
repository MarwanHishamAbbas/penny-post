import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import router from './routes/v1/index.route';
import logger from './lib/winston';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    ...corsOptions,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

(async () => {
  app.use('/api/v1', router);
  app.listen(env.PORT, () => {
    logger.info(`Server Running on Port http://localhost:${env.PORT}`);
  });
})();
