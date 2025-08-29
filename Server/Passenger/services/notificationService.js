const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    this.emailTransporter = this.setupEmailTransporter();
    this.smsClient = this.setupSMSClient();
    this.notificationQueue = [];
    this.processingInterval = null;
  }

  setupEmailTransporter() {
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  setupSMSClient() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return null;
  }

  // Send bus arrival notification
  async sendBusArrivalNotification(passenger, scheduleData) {
    try {
      const notificationData = {
        type: 'bus_arrival',
        passenger,
        data: scheduleData,
        timestamp: new Date()
      };

      // Send push notification (via Socket.IO)
      if (passenger.preferences?.notifications?.push) {
        await this.sendPushNotification(passenger.citizenId, {
          title: '🚌 Bus Arriving Soon!',
          body: `${scheduleData.routeName} will arrive in ${scheduleData.arrivalTime} minutes`,
          data: {
            type: 'bus_arrival',
            scheduleId: scheduleData.scheduleId,
            routeName: scheduleData.routeName
          }
        });
      }

      // Send SMS notification
      if (passenger.preferences?.notifications?.sms && this.smsClient) {
        await this.sendSMSNotification(passenger.phone, {
          message: `🚌 Transit Lanka: ${scheduleData.routeName} arriving in ${scheduleData.arrivalTime} minutes at ${scheduleData.stopName}. Track live: ${process.env.BASE_URL}/track/${scheduleData.scheduleId}`
        });
      }

      // Send email notification
      if (passenger.preferences?.notifications?.email) {
        await this.sendEmailNotification(passenger.email, {
          subject: '🚌 Bus Arrival Notification - Transit Lanka',
          template: 'bus_arrival',
          data: {
            passengerName: passenger.firstName,
            routeName: scheduleData.routeName,
            arrivalTime: scheduleData.arrivalTime,
            stopName: scheduleData.stopName,
            vehicleNumber: scheduleData.vehicleNumber
          }
        });
      }

      console.log(`📱 Bus arrival notification sent to passenger: ${passenger.citizenId}`);

    } catch (error) {
      console.error('Bus arrival notification error:', error);
    }
  }

  // Send booking confirmation notification
  async sendBookingConfirmation(passenger, bookingData) {
    try {
      const notificationData = {
        type: 'booking_confirmation',
        passenger,
        data: bookingData,
        timestamp: new Date()
      };

      // Send push notification
      if (passenger.preferences?.notifications?.push) {
        await this.sendPushNotification(passenger.citizenId, {
          title: '✅ Booking Confirmed!',
          body: `Your booking for ${bookingData.routeName} on ${new Date(bookingData.departureTime).toLocaleDateString()} has been confirmed`,
          data: {
            type: 'booking_confirmation',
            bookingId: bookingData.bookingId
          }
        });
      }

      // Send email with ticket
      if (passenger.preferences?.notifications?.email) {
        await this.sendEmailNotification(passenger.email, {
          subject: '✅ Booking Confirmation - Transit Lanka',
          template: 'booking_confirmation',
          data: {
            passengerName: passenger.firstName,
            bookingId: bookingData.bookingId,
            routeName: bookingData.routeName,
            departureTime: bookingData.departureTime,
            totalAmount: bookingData.totalAmount,
            seatNumbers: bookingData.seatNumbers
          },
          attachments: bookingData.tickets?.map(ticket => ({
            filename: `ticket-${ticket.ticketId}.pdf`,
            content: ticket.pdfData
          }))
        });
      }

      console.log(`📱 Booking confirmation sent to passenger: ${passenger.citizenId}`);

    } catch (error) {
      console.error('Booking confirmation notification error:', error);
    }
  }

  // Send journey completion notification
  async sendJourneyCompletion(passenger, journeyData) {
    try {
      // Send push notification
      if (passenger.preferences?.notifications?.push) {
        await this.sendPushNotification(passenger.citizenId, {
          title: '🏁 Journey Completed!',
          body: `Your journey on ${journeyData.routeName} has been completed. Rate your experience!`,
          data: {
            type: 'journey_completion',
            journeyId: journeyData.journeyId,
            bookingId: journeyData.bookingId
          }
        });
      }

      // Send email with receipt
      if (passenger.preferences?.notifications?.email) {
        await this.sendEmailNotification(passenger.email, {
          subject: '🏁 Journey Completed - Transit Lanka',
          template: 'journey_completion',
          data: {
            passengerName: passenger.firstName,
            routeName: journeyData.routeName,
            completedAt: journeyData.completedAt,
            duration: journeyData.duration,
            distance: journeyData.distance
          }
        });
      }

      console.log(`📱 Journey completion notification sent to passenger: ${passenger.citizenId}`);

    } catch (error) {
      console.error('Journey completion notification error:', error);
    }
  }

  // Send route delay notification
  async sendRouteDelayNotification(passenger, delayData) {
    try {
      // Send push notification
      if (passenger.preferences?.notifications?.push) {
        await this.sendPushNotification(passenger.citizenId, {
          title: '⏰ Route Delay Alert',
          body: `${delayData.routeName} is delayed by ${delayData.delayMinutes} minutes`,
          data: {
            type: 'route_delay',
            scheduleId: delayData.scheduleId,
            delayMinutes: delayData.delayMinutes
          }
        });
      }

      // Send SMS for significant delays (> 15 minutes)
      if (delayData.delayMinutes > 15 && passenger.preferences?.notifications?.sms && this.smsClient) {
        await this.sendSMSNotification(passenger.phone, {
          message: `⏰ Transit Lanka: ${delayData.routeName} is delayed by ${delayData.delayMinutes} minutes. Updated arrival time: ${delayData.newArrivalTime}`
        });
      }

      console.log(`📱 Route delay notification sent to passenger: ${passenger.citizenId}`);

    } catch (error) {
      console.error('Route delay notification error:', error);
    }
  }

  // Send push notification via Socket.IO
  async sendPushNotification(passengerId, notificationData) {
    try {
      const socketService = require('./socketService');
      
      if (socketService.io) {
        socketService.io.to(`passenger-${passengerId}`).emit('notification', {
          ...notificationData,
          timestamp: new Date().toISOString(),
          id: Date.now().toString()
        });
      }

    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // Send SMS notification
  async sendSMSNotification(phoneNumber, smsData) {
    try {
      if (!this.smsClient) {
        console.warn('SMS client not configured');
        return;
      }

      await this.smsClient.messages.create({
        body: smsData.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 SMS sent to: ${phoneNumber}`);

    } catch (error) {
      console.error('SMS notification error:', error);
    }
  }

  // Send email notification
  async sendEmailNotification(email, emailData) {
    try {
      const { subject, template, data, attachments } = emailData;
      
      const htmlContent = await this.generateEmailTemplate(template, data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@transitlanka.com',
        to: email,
        subject,
        html: htmlContent,
        attachments: attachments || []
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`📧 Email sent to: ${email}`);

    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  // Generate email template
  async generateEmailTemplate(template, data) {
    const templates = {
      bus_arrival: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2ba471;">🚌 Bus Arriving Soon!</h2>
          <p>Dear ${data.passengerName},</p>
          <p>Your bus <strong>${data.routeName}</strong> (Vehicle: ${data.vehicleNumber}) will arrive in <strong>${data.arrivalTime} minutes</strong> at ${data.stopName}.</p>
          <p>Please be ready at the bus stop.</p>
          <p>Best regards,<br>Transit Lanka Team</p>
        </div>
      `,
      booking_confirmation: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2ba471;">✅ Booking Confirmed!</h2>
          <p>Dear ${data.passengerName},</p>
          <p>Your booking has been confirmed!</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Booking ID:</strong> ${data.bookingId}</p>
            <p><strong>Route:</strong> ${data.routeName}</p>
            <p><strong>Departure:</strong> ${new Date(data.departureTime).toLocaleString()}</p>
            <p><strong>Seats:</strong> ${data.seatNumbers?.join(', ') || 'TBA'}</p>
            <p><strong>Total Amount:</strong> LKR ${data.totalAmount}</p>
          </div>
          <p>Your digital tickets are attached to this email.</p>
          <p>Best regards,<br>Transit Lanka Team</p>
        </div>
      `,
      journey_completion: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2ba471;">🏁 Journey Completed!</h2>
          <p>Dear ${data.passengerName},</p>
          <p>Your journey on <strong>${data.routeName}</strong> has been completed successfully.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Completed At:</strong> ${new Date(data.completedAt).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${data.duration}</p>
            <p><strong>Distance:</strong> ${data.distance} km</p>
          </div>
          <p>Thank you for choosing Transit Lanka. We hope you had a pleasant journey!</p>
          <p>Best regards,<br>Transit Lanka Team</p>
        </div>
      `
    };

    return templates[template] || `<p>Notification: ${JSON.stringify(data)}</p>`;
  }

  // Start notification processing
  startNotificationProcessor() {
    this.processingInterval = setInterval(async () => {
      await this.processNotificationQueue();
    }, 5000); // Process every 5 seconds

    console.log('📱 Notification processor started');
  }

  // Process notification queue
  async processNotificationQueue() {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      try {
        await this.processNotification(notification);
      } catch (error) {
        console.error('Notification processing error:', error);
      }
    }
  }

  // Add notification to queue
  queueNotification(notification) {
    this.notificationQueue.push({
      ...notification,
      queuedAt: new Date()
    });
  }

  // Process individual notification
  async processNotification(notification) {
    const { type, passenger, data } = notification;

    switch (type) {
      case 'bus_arrival':
        await this.sendBusArrivalNotification(passenger, data);
        break;
      case 'booking_confirmation':
        await this.sendBookingConfirmation(passenger, data);
        break;
      case 'journey_completion':
        await this.sendJourneyCompletion(passenger, data);
        break;
      case 'route_delay':
        await this.sendRouteDelayNotification(passenger, data);
        break;
      default:
        console.warn('Unknown notification type:', type);
    }
  }

  // Stop notification processor
  stopNotificationProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

module.exports = new NotificationService();