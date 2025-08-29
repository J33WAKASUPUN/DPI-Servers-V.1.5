const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class QRService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads/qr';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:4002';
    this.qrExpiryHours = parseInt(process.env.QR_CODE_EXPIRY_HOURS) || 24;
  }

  // Generate QR code data
  generateQRData(ticketData) {
    const qrPayload = {
      ticketId: ticketData.ticketId,
      bookingId: ticketData.bookingId,
      passengerId: ticketData.passengerId,
      scheduleId: ticketData.scheduleId,
      departureTime: ticketData.ticketDetails.departureTime,
      seatNumber: ticketData.ticketDetails.seatNumber,
      timestamp: new Date().getTime(),
      hash: this.generateHash(ticketData)
    };

    return Buffer.from(JSON.stringify(qrPayload)).toString('base64');
  }

  // Generate security hash
  generateHash(ticketData) {
    const secret = process.env.QR_SECRET || 'default-secret';
    const dataString = `${ticketData.ticketId}-${ticketData.passengerId}-${ticketData.scheduleId}`;
    return crypto.createHmac('sha256', secret).update(dataString).digest('hex');
  }

  // Generate QR code image
  async generateQRCode(ticketData) {
    try {
      // Ensure upload directory exists
      await this.ensureUploadDir();

      const qrData = this.generateQRData(ticketData);
      const fileName = `qr_${ticketData.ticketId}_${Date.now()}.png`;
      const filePath = path.join(this.uploadDir, fileName);

      // QR Code options
      const options = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      };

      // Generate QR code
      await QRCode.toFile(filePath, qrData, options);

      const imageUrl = `${this.baseUrl}/uploads/qr/${fileName}`;

      return {
        success: true,
        data: {
          qrData,
          imageUrl,
          filePath,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('QR generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate QR code
  async validateQRCode(qrData) {
    try {
      // Decode QR data
      const decodedData = JSON.parse(Buffer.from(qrData, 'base64').toString());
      
      // Check timestamp (within expiry period)
      const now = new Date().getTime();
      const qrTimestamp = decodedData.timestamp;
      const expiryTime = this.qrExpiryHours * 60 * 60 * 1000;
      
      if (now - qrTimestamp > expiryTime) {
        return {
          success: false,
          error: 'QR code has expired'
        };
      }

      // Validate hash
      const ticketData = {
        ticketId: decodedData.ticketId,
        passengerId: decodedData.passengerId,
        scheduleId: decodedData.scheduleId
      };

      const expectedHash = this.generateHash(ticketData);
      if (decodedData.hash !== expectedHash) {
        return {
          success: false,
          error: 'Invalid QR code - security check failed'
        };
      }

      return {
        success: true,
        data: decodedData
      };
    } catch (error) {
      console.error('QR validation error:', error);
      return {
        success: false,
        error: 'Invalid QR code format'
      };
    }
  }

  // Generate QR code for digital display (base64)
  async generateQRCodeBase64(ticketData) {
    try {
      const qrData = this.generateQRData(ticketData);
      
      const options = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      };

      const qrImageBuffer = await QRCode.toBuffer(qrData, options);
      const base64Image = qrImageBuffer.toString('base64');

      return {
        success: true,
        data: {
          qrData,
          base64Image: `data:image/png;base64,${base64Image}`,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('QR base64 generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Ensure upload directory exists
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // Clean up expired QR codes
  async cleanupExpiredQRCodes() {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const expiryTime = this.qrExpiryHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > expiryTime) {
          await fs.unlink(filePath);
          console.log(`Cleaned up expired QR code: ${file}`);
        }
      }
    } catch (error) {
      console.error('QR cleanup error:', error);
    }
  }
}

module.exports = new QRService();