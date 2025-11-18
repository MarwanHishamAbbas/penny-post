import { CorsOptions } from 'cors';
import { env } from './env';

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (
      env.NODE_ENV === 'development' ||
      !origin ||
      env.CORS_ORIGIN.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(
        new Error(`CORS Error: ${origin} is not allowed by cors`),
        false,
      );
    }
  },
};
