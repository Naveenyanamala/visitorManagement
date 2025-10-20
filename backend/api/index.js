const serverless = require('serverless-http');
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

let cached = global.__mongoConn;
if (!cached) cached = global.__mongoConn = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor_management';
    cached.promise = mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());

  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  const corsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
    allowedHeaders: ['Content-Type','Authorization']
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount existing routers
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/companies', require('../routes/companies'));
  app.use('/api/members', require('../routes/members'));
  app.use('/api/visitors', require('../routes/visitors'));
  app.use('/api/requests', require('../routes/requests'));
  app.use('/api/admin', require('../routes/admin'));

  app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
  });

  return app;
}

let cachedHandler;
module.exports = async (req, res) => {
  try {
    await connectDB();
    if (!cachedHandler) {
      const app = createApp();
      cachedHandler = serverless(app);
    }
    return cachedHandler(req, res);
  } catch (e) {
    console.error('Serverless error:', e);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};


