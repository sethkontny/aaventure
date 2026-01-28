const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
        user: process.env.EMAIL_USER || 'placeholder',
        pass: process.env.EMAIL_PASS || 'placeholder'
    }
});

/**
 * Send a welcome email to a new user
 * @param {string} email - Recipient email
 * @param {string} username - User's name
 */
const sendWelcomeEmail = async (email, username) => {
    const mailOptions = {
        from: `"AAVenture Team" <${process.env.EMAIL_FROM || 'noreply@aaventure.com'}>`,
        to: email,
        subject: 'Welcome to AAVenture - Your Recovery Journey Begins!',
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h1 style="color: #6366f1;">Welcome to AAVenture!</h1>
                <p>Hello ${username},</p>
                <p>Thank you for joining our community. We are excited to support you on your recovery journey.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3>Quick Tips to Get Started:</h3>
                    <ul>
                        <li><strong>Join a Meeting:</strong> Check our calendar for live video sessions.</li>
                        <li><strong>Chat Anytime:</strong> Enter our 24/7 rooms for instant fellowship.</li>
                        <li><strong>Get Proof of Attendance:</strong> Subscribe to generate court-ordered certificates.</li>
                    </ul>
                </div>
                <p>If you have any questions, simply reply to this email.</p>
                <p>Recovery Together,<br>The AAVenture Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${email}`);
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
    }
};

/**
 * Send a certificate notification email
 * @param {string} email - Recipient email
 * @param {Object} certificateDetails - Details for the email
 */
const sendCertificateEmail = async (email, details) => {
    const mailOptions = {
        from: `"AAVenture Proof" <${process.env.EMAIL_FROM || 'noreply@aaventure.com'}>`,
        to: email,
        subject: `Your Proof of Attendance: ${details.meetingTitle}`,
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h1 style="color: #10b981;">Certificate Generated!</h1>
                <p>Hello,</p>
                <p>Your proof of attendance certificate for the meeting <strong>"${details.meetingTitle}"</strong> is now ready.</p>
                <div style="background: #f0fdfa; padding: 20px; border-radius: 12px; border: 1px solid #10b981; margin: 20px 0; text-align: center;">
                    <p style="font-size: 0.9rem; color: #065f46; margin-bottom: 5px;">Certificate ID</p>
                    <p style="font-size: 1.2rem; font-weight: bold; margin: 0;">${details.certificateId}</p>
                    <a href="${process.env.BASE_URL}/api/attendance/download/${details.certificateId}" 
                       style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Download Certificate (PDF)
                    </a>
                </div>
                <p>Verified attendance: ${Math.round(details.duration / 60)} minutes</p>
                <p>Thank you for participating in our community.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Certificate email sent to ${email}`);
    } catch (error) {
        console.error('❌ Error sending certificate email:', error);
    }
};

module.exports = {
    sendWelcomeEmail,
    sendCertificateEmail
};
