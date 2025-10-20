// backend/services/emailService.js
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set. Email service is disabled.');
      this.enabled = false;
      return;
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL;
    this.enabled = true;
  }

  async sendWorkoutEmail(user, workout) {
    if (!this.enabled) return;

    const workoutDate = new Date(workout.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const msg = {
      to: user.email, // This assumes the user object has an email property
      from: this.fromEmail,
      subject: `Your Runna Workout for Tomorrow: ${workout.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Hi ${user.displayName || 'Runner'},</h2>
          <p>Here is your workout for tomorrow, ${workoutDate}:</p>
          <div style="border: 1px solid #eee; padding: 15px; border-radius: 8px;">
            <h3>${workout.title}</h3>
            <p><strong>Type:</strong> ${workout.type}</p>
            <p><strong>Duration:</strong> ${workout.duration_minutes} min | <strong>Distance:</strong> ${workout.distance_km} km</p>
            <hr>
            <h4>Warm-up</h4>
            <p>${workout.warmup}</p>
            <h4>Main Workout</h4>
            <p>${workout.main_set || workout.description}</p>
            <h4>Cool-down</h4>
            <p>${workout.cooldown}</p>
          </div>
          <a href="http://localhost:8080/plan" style="display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">View in App</a>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log(`Workout email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      if (error.response) {
        console.error(error.response.body);
      }
    }
  }
}

module.exports = new EmailService();
