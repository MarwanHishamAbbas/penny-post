import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { env } from './config/env';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

(async () => {
  app.listen(env.PORT, () => {
    console.log(`Server started on http://localhost:${env.PORT}`);
  });
})();
