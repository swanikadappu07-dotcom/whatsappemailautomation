# WhatsApp Business Automation Platform

A comprehensive WhatsApp Business automation platform that allows you to send alerts, manage billing, book appointments, and send bulk messages with templates. This platform is designed to be client-ready and can be offered to multiple clients.

## Features

### 🚀 Core Features
- **WhatsApp Business API Integration** - Send messages, templates, and media
- **Contact Management** - Organize and manage customer contacts
- **Template Management** - Create and manage WhatsApp message templates
- **Bulk Messaging** - Send messages to multiple contacts at once
- **Appointment Booking** - Schedule and manage appointments with automated reminders
- **Billing System** - Create and send bills with payment reminders
- **Alert System** - Automated alerts and notifications
- **Multi-tenant Architecture** - Support for multiple clients
- **Real-time Updates** - WebSocket integration for live updates
- **Analytics & Reporting** - Track message delivery and engagement

### 📱 WhatsApp Features
- Send text messages, images, documents
- Template-based messaging with variables
- Message status tracking (sent, delivered, read)
- Auto-reply system for incoming messages
- Webhook integration for real-time updates

### 👥 Client Management
- Multi-tenant system for multiple clients
- Subscription management (Basic, Premium, Enterprise)
- Message limits and usage tracking
- Client dashboard and analytics

### 📊 Business Features
- Appointment scheduling with availability checking
- Automated appointment reminders
- Billing and invoice management
- Payment tracking and overdue notifications
- Custom alerts and promotional messages

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- WhatsApp Business API access
- SSL certificate for webhook (production)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Whatsappvautomation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/whatsapp_automation
   
   # JWT Secret
   JWT_SECRET=your_super_secret_jwt_key_here
   
   # WhatsApp Business API
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_VERIFY_TOKEN=your_verify_token
   WHATSAPP_WEBHOOK_URL=https://yourdomain.com/webhook
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/whatsapp-config` - Configure WhatsApp settings

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/import` - Import contacts from CSV

### Messages
- `GET /api/messages` - Get all messages
- `POST /api/messages/send` - Send single message
- `POST /api/messages/bulk` - Send bulk messages
- `POST /api/messages/template` - Send template message
- `GET /api/messages/analytics/overview` - Get message analytics

### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `POST /api/templates/:id/submit` - Submit template for approval
- `POST /api/templates/sync` - Sync templates from WhatsApp

### Appointments
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `GET /api/appointments/availability/:date` - Get available time slots

### Billing
- `GET /api/billing` - Get all bills
- `POST /api/billing` - Create bill
- `POST /api/billing/:id/send` - Send bill to customer
- `POST /api/billing/:id/paid` - Mark bill as paid
- `GET /api/billing/overdue/list` - Get overdue bills

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create custom alert
- `POST /api/alerts/appointments/remind` - Send appointment reminders
- `POST /api/alerts/billing/remind` - Send billing reminders
- `POST /api/alerts/overdue/notify` - Send overdue notifications

### Webhook
- `GET /api/webhook` - Verify webhook
- `POST /api/webhook` - Handle incoming messages

## WhatsApp Business API Setup

1. **Get WhatsApp Business API Access**
   - Apply for WhatsApp Business API through Meta Business
   - Get your access token and phone number ID

2. **Configure Webhook**
   - Set up your webhook URL: `https://yourdomain.com/api/webhook`
   - Use the verify token from your environment variables

3. **Create Message Templates**
   - Create templates in the WhatsApp Business Manager
   - Submit templates for approval
   - Use approved templates in your messages

## Usage Examples

### Send a Simple Message
```javascript
const response = await fetch('/api/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    contactId: 'contact-id',
    type: 'text',
    content: {
      text: 'Hello! This is a test message.'
    }
  })
});
```

### Send Bulk Messages
```javascript
const response = await fetch('/api/messages/bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    contacts: ['contact1', 'contact2', 'contact3'],
    message: 'Bulk message content',
    type: 'text'
  })
});
```

### Create Appointment
```javascript
const response = await fetch('/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    contactId: 'contact-id',
    title: 'Consultation',
    date: '2024-01-15',
    time: '10:00',
    duration: 60,
    location: 'Office'
  })
});
```

## Client Management

### Admin Features
- View all clients and their statistics
- Manage client subscriptions
- Monitor message usage
- Activate/deactivate clients
- Reset message usage limits

### Client Features
- Personal dashboard
- Contact management
- Message scheduling
- Template management
- Appointment booking
- Billing management

## Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers

## Deployment

### Production Setup
1. Set up MongoDB Atlas or self-hosted MongoDB
2. Configure SSL certificate for webhook
3. Set up environment variables
4. Use PM2 for process management
5. Configure reverse proxy (Nginx)

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring & Analytics

- Message delivery rates
- Client usage statistics
- Revenue tracking
- Appointment completion rates
- Template performance

## Support

For support and questions:
- Create an issue in the repository
- Contact: your-email@domain.com

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: This platform requires WhatsApp Business API access and proper configuration. Make sure to comply with WhatsApp's terms of service and message template policies.
