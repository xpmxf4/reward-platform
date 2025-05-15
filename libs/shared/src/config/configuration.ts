export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  mongodb: {
    auth: {
      uri: process.env.AUTH_MONGODB_URI || 'mongodb://root:password@auth-mongodb:27017/auth?authSource=admin',
    },
    event: {
      uri: process.env.EVENT_MONGODB_URI || 'mongodb://root:password@event-mongodb:27017/event?authSource=admin',
    },
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || 'localhost:9092',
  },
});
