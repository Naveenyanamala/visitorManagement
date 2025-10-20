const nodemailer = require('nodemailer');
const twilio = require('twilio');
const moment = require('moment');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  async initializeServices() {
    // Initialize email service
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    // Initialize SMS service
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    if (!this.emailTransporter) {
      console.warn('Email service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"Krishe Emerald Visitor Management" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    if (!this.twilioClient) {
      console.warn('SMS service not configured');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      console.log('SMS sent successfully:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send visitor request notification to member
  async notifyMemberOfVisitorRequest(member, visitor, request, company) {
    const subject = `New Visitor Request - ${visitor.fullName}`;
    const message = `You have a new visitor request from ${visitor.fullName} (${visitor.phone}) for ${request.purpose} at ${company.name}. Please respond to the request.`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Visitor Request</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Visitor Details</h3>
          <p><strong>Name:</strong> ${visitor.fullName}</p>
          <p><strong>Phone:</strong> ${visitor.phone}</p>
          ${visitor.email ? `<p><strong>Email:</strong> ${visitor.email}</p>` : ''}
          <p><strong>Purpose:</strong> ${request.purpose}</p>
          <p><strong>Duration:</strong> ${request.duration} minutes</p>
          ${request.purposeDescription ? `<p><strong>Description:</strong> ${request.purposeDescription}</p>` : ''}
        </div>
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">Company</h3>
          <p><strong>Name:</strong> ${company.name}</p>
          <p><strong>Location:</strong> ${company.location}</p>
        </div>
        <p style="color: #666;">Please log in to your dashboard to accept or decline this request.</p>
        <p style="color: #666; font-size: 12px;">This is an automated message from Krishe Emerald Visitor Management System.</p>
      </div>
    `;

    const results = {};

    // Send email if member has email notifications enabled
    if (member.preferences.emailNotifications) {
      results.email = await this.sendEmail(member.email, subject, html);
    }

    // Send SMS if member has SMS notifications enabled
    if (member.preferences.smsNotifications) {
      results.sms = await this.sendSMS(member.phone, message);
    }

    return results;
  }

  // Send request status update to visitor
  async notifyVisitorOfStatusUpdate(visitor, request, member, company) {
    let subject, message, html;

    switch (request.status) {
      case 'accepted':
        subject = `Visit Request Accepted - ${company.name}`;
        message = `Your visit request to ${company.name} has been accepted by ${member.fullName}. You can now proceed to the reception.`;
        html = this.getAcceptedEmailTemplate(visitor, request, member, company);
        break;
      case 'declined':
        subject = `Visit Request Declined - ${company.name}`;
        message = `Your visit request to ${company.name} has been declined by ${member.fullName}.`;
        html = this.getDeclinedEmailTemplate(visitor, request, member, company);
        break;
      case 'completed':
        subject = `Visit Completed - ${company.name}`;
        message = `Your visit to ${company.name} has been completed. Thank you for visiting!`;
        html = this.getCompletedEmailTemplate(visitor, request, member, company);
        break;
      default:
        return { success: false, message: 'Unknown status' };
    }

    const results = {};

    // Send email if visitor has email
    if (visitor.email) {
      results.email = await this.sendEmail(visitor.email, subject, html);
    }

    // Send SMS to visitor
    results.sms = await this.sendSMS(visitor.phone, message);

    return results;
  }

  // Email templates
  getAcceptedEmailTemplate(visitor, request, member, company) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Visit Request Accepted!</h2>
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Your visit has been approved</h3>
          <p><strong>Company:</strong> ${company.name}</p>
          <p><strong>Host:</strong> ${member.fullName}</p>
          <p><strong>Purpose:</strong> ${request.purpose}</p>
          <p><strong>Duration:</strong> ${request.duration} minutes</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Next Steps</h3>
          <p>1. Proceed to the reception desk at ${company.name}</p>
          <p>2. Show this email or your phone number to the security personnel</p>
          <p>3. You will be directed to meet ${member.fullName}</p>
        </div>
        <p style="color: #666; font-size: 12px;">This is an automated message from Krishe Emerald Visitor Management System.</p>
      </div>
    `;
  }

  getDeclinedEmailTemplate(visitor, request, member, company) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Visit Request Declined</h2>
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Your visit request has been declined</h3>
          <p><strong>Company:</strong> ${company.name}</p>
          <p><strong>Host:</strong> ${member.fullName}</p>
          <p><strong>Purpose:</strong> ${request.purpose}</p>
          ${request.memberResponse.message ? `<p><strong>Reason:</strong> ${request.memberResponse.message}</p>` : ''}
        </div>
        <p style="color: #666;">You can submit a new request at a later time or contact ${member.fullName} directly.</p>
        <p style="color: #666; font-size: 12px;">This is an automated message from Krishe Emerald Visitor Management System.</p>
      </div>
    `;
  }

  getCompletedEmailTemplate(visitor, request, member, company) {
    const duration = request.totalDuration ? `${request.totalDuration} minutes` : 'Unknown';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #17a2b8;">Visit Completed</h2>
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h3 style="color: #0c5460; margin-top: 0;">Thank you for visiting!</h3>
          <p><strong>Company:</strong> ${company.name}</p>
          <p><strong>Host:</strong> ${member.fullName}</p>
          <p><strong>Purpose:</strong> ${request.purpose}</p>
          <p><strong>Visit Duration:</strong> ${duration}</p>
          <p><strong>Exit Time:</strong> ${moment(request.entryDetails.exitedAt).format('DD/MM/YYYY HH:mm')}</p>
        </div>
        <p style="color: #666;">We hope you had a pleasant visit. Please feel free to visit us again!</p>
        <p style="color: #666; font-size: 12px;">This is an automated message from Krishe Emerald Visitor Management System.</p>
      </div>
    `;
  }

  // Utility function to strip HTML tags
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Send welcome email to new member
  async sendWelcomeEmail(member, company, tempPassword = null) {
    const subject = `Welcome to ${company.name} - Visitor Management System`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to ${company.name}!</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Your Account Details</h3>
          <p><strong>Name:</strong> ${member.fullName}</p>
          <p><strong>Email:</strong> ${member.email}</p>
          <p><strong>Employee ID:</strong> ${member.employeeId}</p>
          <p><strong>Department:</strong> ${member.department}</p>
          <p><strong>Position:</strong> ${member.position}</p>
          ${tempPassword ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : ''}
        </div>
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">Getting Started</h3>
          <p>1. Log in to your dashboard using your email and password</p>
          <p>2. Update your profile and preferences</p>
          <p>3. You will receive notifications when visitors request to meet you</p>
          <p>4. You can accept, decline, or reschedule visitor requests</p>
        </div>
        <p style="color: #666; font-size: 12px;">This is an automated message from Krishe Emerald Visitor Management System.</p>
      </div>
    `;

    return await this.sendEmail(member.email, subject, html);
  }
}

module.exports = new NotificationService();
