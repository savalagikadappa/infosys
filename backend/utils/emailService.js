const nodemailer = require('nodemailer');

// Create a transporter object using SMTP credentials
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'example@example.com',
    pass: process.env.EMAIL_PASS || 'missing_app_password'
  }
});

/**
 * Sends an email using the configured transporter.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Subject of the email.
 * @param {string} text - Plain text body of the email.
 * @param {string} [html] - HTML body of the email (optional).
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com',
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;
