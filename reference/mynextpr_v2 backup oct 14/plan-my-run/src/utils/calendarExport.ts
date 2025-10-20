interface WorkoutEvent {
  title: string;
  description: string;
  duration: number;
  distance?: number;
  scheduledDate: string;
  type: string;
  intensity?: number;
}

const formatDate = (date: Date): string => {
  // Format: YYYYMMDDTHHMMSSZ
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

const getIntensityEmoji = (intensity?: number): string => {
  if (!intensity) return '🏃';
  const emojis = {
    1: '😊',
    2: '🙂', 
    3: '😐',
    4: '😓',
    5: '😤'
  };
  return emojis[intensity as keyof typeof emojis] || '🏃';
};

export const generateICS = (workouts: WorkoutEvent[]): string => {
  const now = new Date();
  const timestamp = formatDate(now);

  const events = workouts.map((workout) => {
    // Parse the scheduled date and set to 7 AM local time
    const startDate = new Date(workout.scheduledDate);
    startDate.setHours(7, 0, 0, 0);
    
    // Calculate end time based on duration
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + workout.duration);

    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);

    // Build description with workout details
    const intensityEmoji = getIntensityEmoji(workout.intensity);
    let description = `${intensityEmoji} ${workout.description}\\n\\n`;
    if (workout.duration) {
      description += `Duration: ${workout.duration} minutes\\n`;
    }
    if (workout.distance) {
      description += `Distance: ${workout.distance} km\\n`;
    }
    description += `\\nType: ${workout.type.replace('_', ' ')}`;
    description += `\\n\\nOpen in your running app to view full workout details.`;

    return `BEGIN:VEVENT
UID:${workout.scheduledDate}-${Math.random().toString(36).substring(7)}@runningcoach.app
DTSTAMP:${timestamp}
DTSTART:${startFormatted}
DTEND:${endFormatted}
SUMMARY:${intensityEmoji} ${workout.title}
DESCRIPTION:${description}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Workout starts in 15 minutes
END:VALARM
END:VEVENT`;
  }).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Running Coach//Workout Plan//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Running Workout Plan
X-WR-TIMEZONE:UTC
${events}
END:VCALENDAR`;
};

export const downloadICS = (icsContent: string, filename: string = 'running-plan.ics'): void => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
