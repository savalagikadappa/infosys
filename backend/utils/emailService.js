const nodemailer = require('nodemailer');

// Create a transporter object using SMTP credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kadappasavalagi@gmail.com', // Sender's email address
    pass: 'cvshnbljnqonpiox', // App password
  },
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
      from: 'kadappasavalagi@gmail.com', // Sender address
      to: '01fe22bcs181@kletech.ac.in',
      subject, // Subject line
      text, // Plain text body
      html, // HTML body (optional)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;
