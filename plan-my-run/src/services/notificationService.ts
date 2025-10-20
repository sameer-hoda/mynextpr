import { LocalNotifications } from '@capacitor/local-notifications';

// When a plan is generated
const scheduleNotifications = async (workouts) => {
  // First, clear any old pending notifications
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ ids: pending.notifications.map(n => n.id) });
  }

  // Schedule new notifications
  const notifications = workouts.map(w => ({
    id: w.id,
    title: `Workout Reminder: ${w.title}`,
    body: "Time for your scheduled run!",
    schedule: { at: new Date(w.scheduledDate) }, // Adjust time as needed
  }));

  await LocalNotifications.schedule({ notifications });
};

export { scheduleNotifications };
