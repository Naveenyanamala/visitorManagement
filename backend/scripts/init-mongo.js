// MongoDB initialization script
db = db.getSiblingDB('visitor_management');

// Create collections with validation
db.createCollection('companies', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'location', 'contactEmail', 'contactPhone'],
      properties: {
        name: { bsonType: 'string', maxLength: 100 },
        location: { bsonType: 'string', maxLength: 200 },
        contactEmail: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        contactPhone: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('members', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firstName', 'lastName', 'email', 'phone', 'password', 'employeeId', 'department', 'position'],
      properties: {
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        phone: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('visitors');
db.createCollection('requests');
db.createCollection('admins');
db.createCollection('auditlogs');

// Create indexes for better performance
db.companies.createIndex({ name: 1 });
db.companies.createIndex({ location: 1 });
db.companies.createIndex({ isActive: 1 });

db.members.createIndex({ email: 1 }, { unique: true });
db.members.createIndex({ phone: 1 }, { unique: true });
db.members.createIndex({ employeeId: 1 });
db.members.createIndex({ 'companies.company': 1 });

db.visitors.createIndex({ phone: 1 });
db.visitors.createIndex({ email: 1 });
db.visitors.createIndex({ isBlacklisted: 1 });

db.requests.createIndex({ company: 1, status: 1 });
db.requests.createIndex({ member: 1, status: 1 });
db.requests.createIndex({ visitor: 1 });
db.requests.createIndex({ createdAt: -1 });
db.requests.createIndex({ status: 1, priority: -1, createdAt: 1 });

db.admins.createIndex({ email: 1 }, { unique: true });
db.admins.createIndex({ role: 1 });
db.admins.createIndex({ isActive: 1 });

db.auditlogs.createIndex({ action: 1 });
db.auditlogs.createIndex({ entityType: 1, entityId: 1 });
db.auditlogs.createIndex({ performedBy: 1 });
db.auditlogs.createIndex({ timestamp: -1 });

// Create a default super admin
db.admins.insertOne({
  firstName: 'Super',
  lastName: 'Admin',
  email: 'admin@krisheemerald.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K5K5K5K', // password: admin123
  role: 'super_admin',
  permissions: {
    manageCompanies: true,
    manageMembers: true,
    manageRequests: true,
    viewReports: true,
    manageSettings: true
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');
