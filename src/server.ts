import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(express.urlencoded({ extended: true }));

(async () => {
  app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
  });
})();
