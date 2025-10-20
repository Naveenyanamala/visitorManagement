const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const membersRoutes = require('./routes/members');
const visitorsRoutes = require('./routes/visitors');
const requestsRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');

const app = express();
const server = createServer(app);
// Allowed origins for CORS (UI hosts)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // keep API host harmlessly; origin is usually the UI host (3000)
  'http://localhost:8090',
  'https://visitor-management-drob.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket"],
  allowUpgrades: false,
  pingInterval: 30000,
  pingTimeout: 30000
});

// Middleware
// If a proxy (like CRA dev server/nginx) sets X-Forwarded-For, trust it so rate-limit can read the real IP
app.set('trust proxy', 1);
app.use(helmet());
// const corsOptions = {
//   origin: function(origin, callback) {
//     // allow REST tools/no-origin requests
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
//   methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
//   allowedHeaders: ['Content-Type','Authorization']
// };
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/admin', adminRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor_management', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => {
//   console.log('Connected to MongoDB');
// })
// .catch((error) => {
//   console.error('MongoDB connection error:', error);
//   process.exit(1);
// });


let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
connectDB();
console.log('Connected to MongoDB');

// console.log('Connecting to MongoDB');
// app.use((req, res, next) => {
//   console.log('Connecting to MongoDB');
 
//   connectDB();
//   console.log('Connecting to MongoDB');

//  next();
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

module.exports = app;
