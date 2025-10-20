# Krishe Emerald Visitor Management System

A comprehensive visitor management system built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring real-time notifications, image capture, queue management, and admin dashboards.

## 🚀 Features

### Core Functionality
- **Company Management**: Multi-company support with member directories
- **Visitor Registration**: Complete visitor information capture with photo
- **Request Flow**: Streamlined visitor request and approval process
- **Queue Management**: Real-time queue tracking with wait time estimates
- **Real-time Updates**: WebSocket integration for live status updates

### User Roles
- **Visitors**: Public interface for requesting visits
- **Members**: Dashboard for managing visitor requests
- **Admins**: Complete system management and oversight

### Notifications
- **Email Notifications**: Automated email alerts for all stakeholders
- **SMS Notifications**: Twilio integration for SMS alerts
- **Real-time Updates**: Live status updates via WebSocket

### Security & Compliance
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against spam and abuse
- **Audit Logging**: Complete activity tracking
- **Image Storage**: Secure cloud-based image storage

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.io** for real-time communication
- **Cloudinary** for image storage
- **Nodemailer** for email notifications
- **Twilio** for SMS notifications

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form management
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Webcam** for image capture

### DevOps
- **Docker** containerization
- **Docker Compose** for orchestration
- **Nginx** reverse proxy
- **MongoDB** with persistent storage

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v7.0 or higher)
- Docker and Docker Compose (for containerized deployment)
- Cloudinary account (for image storage)
- Twilio account (for SMS notifications)
- Email service (Gmail, SendGrid, etc.)

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd visitorManagement
   ```

2. **Configure environment variables**
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8090
   - MongoDB: localhost:27017

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration
   
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   
   # Or install MongoDB locally
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=8090
MONGODB_URI=mongodb://localhost:27017/visitor_management

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Frontend URL
CLIENT_URL=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8090/api
REACT_APP_SOCKET_URL=http://localhost:8090
```

### Service Configuration

#### Cloudinary Setup
1. Create a Cloudinary account
2. Get your cloud name, API key, and API secret
3. Add them to your backend .env file

#### Twilio Setup
1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Add them to your backend .env file

#### Email Setup
1. For Gmail: Enable 2FA and create an App Password
2. For other providers: Use appropriate SMTP settings

## 📱 Usage

### For Visitors
1. Visit the landing page
2. Select a company
3. Choose a member to visit
4. Fill out the visitor form with photo capture
5. Submit the request
6. Track request status in real-time

### For Members
1. Login to the member dashboard
2. View pending visitor requests
3. Accept, decline, or reschedule requests
4. Manage notification preferences
5. Update profile information

### For Admins
1. Login to the admin dashboard
2. Manage companies and members
3. Oversee all visitor requests
4. Generate reports and analytics
5. Configure system settings
6. Monitor audit logs

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/member/login` - Member login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout

### Company Endpoints
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create company (admin)
- `PUT /api/companies/:id` - Update company (admin)
- `DELETE /api/companies/:id` - Delete company (admin)

### Member Endpoints
- `GET /api/members/company/:companyId` - Get members by company
- `GET /api/members` - Get all members (admin)
- `POST /api/members` - Create member (admin)
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member (admin)

### Request Endpoints
- `POST /api/requests` - Create visitor request
- `GET /api/requests/member/:memberId` - Get member requests
- `GET /api/requests/company/:companyId` - Get company requests (admin)
- `PUT /api/requests/:id/status` - Update request status
- `PUT /api/requests/:id/enter` - Mark visitor as entered (admin)
- `PUT /api/requests/:id/exit` - Mark visitor as exited (admin)

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 Monitoring and Logging

### Health Checks
- Backend health check endpoint: `GET /api/health`
- Docker health checks configured
- MongoDB connection monitoring

### Audit Logging
- All user actions are logged
- Admin can view audit logs
- Logs include IP address and user agent

### Error Handling
- Comprehensive error handling
- User-friendly error messages
- Detailed logging for debugging

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Input validation and sanitization
- SQL injection protection
- XSS protection headers

## 🚀 Deployment

### Production Deployment

1. **Set up production environment variables**
2. **Configure SSL certificates**
3. **Set up domain and DNS**
4. **Deploy using Docker Compose**
5. **Configure monitoring and backups**

### Scaling Considerations

- Use MongoDB replica sets for high availability
- Implement Redis for session storage
- Use load balancers for multiple backend instances
- Configure CDN for static assets
- Set up monitoring with tools like Prometheus

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks
- Update dependencies
- Monitor security vulnerabilities
- Backup database regularly
- Review and rotate API keys
- Monitor system performance

### Version Updates
- Follow semantic versioning
- Maintain backward compatibility
- Update documentation
- Test thoroughly before release

---

**Built with ❤️ for efficient visitor management**
