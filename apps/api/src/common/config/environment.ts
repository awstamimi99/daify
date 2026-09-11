import * as Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'log', 'debug', 'verbose')
    .default('log'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  WEB_ORIGIN: Joi.string().uri({ scheme: ['http', 'https'] }).when('NODE_ENV', { is: 'production', then: Joi.string().uri({ scheme: ['https'] }).required(), otherwise: Joi.any().default('http://localhost:3000') }),
  EMAIL_TRANSPORT: Joi.string().valid('smtp', 'test').when('NODE_ENV', { is: 'test', then: Joi.any().default('test'), otherwise: Joi.invalid('test').default('smtp') }),
  SMTP_HOST: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.any().default('127.0.0.1') }),
  SMTP_PORT: Joi.number().port().when('NODE_ENV', { is: 'production', then: Joi.any().default(587), otherwise: Joi.any().default(1025) }),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_REQUIRE_TLS: Joi.boolean().default(false),
  SMTP_USER: Joi.string(),
  SMTP_PASSWORD: Joi.string().when('SMTP_USER', { is: Joi.exist(), then: Joi.required() }),
  EMAIL_FROM: Joi.string().email({ tlds: { allow: false } }).when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.any().default('no-reply@daify.test') }),
  SESSION_COOKIE_NAME: Joi.string().default('daify_session'),
  ALLOW_DEV_SEED: Joi.boolean().truthy('true').falsy('false').default(false),
});
