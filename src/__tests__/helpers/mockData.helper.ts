/**
 * Mock data and fixtures for testing
 */

export const mockWeatherData = {
  current: {
    temperature: 72,
    feelsLike: 70,
    condition: 'Partly Cloudy',
    icon: '02d',
  },
  hourly: [
    { time: '12 PM', temp: 72, icon: '02d' },
    { time: '1 PM', temp: 74, icon: '01d' },
    { time: '2 PM', temp: 76, icon: '01d' },
    { time: '3 PM', temp: 75, icon: '02d' },
    { time: '4 PM', temp: 73, icon: '03d' },
  ],
};

export const mockCalendarEvents = [
  {
    id: '1',
    title: 'Team Meeting',
    start: new Date('2024-01-15T10:00:00'),
    end: new Date('2024-01-15T11:00:00'),
    allDay: false,
    location: 'Conference Room A',
  },
  {
    id: '2',
    title: "Doctor's Appointment",
    start: new Date('2024-01-15T14:30:00'),
    end: new Date('2024-01-15T15:30:00'),
    allDay: false,
    location: 'Medical Center',
  },
  {
    id: '3',
    title: 'Lunch with Client',
    start: new Date('2024-01-16T12:00:00'),
    end: new Date('2024-01-16T13:00:00'),
    allDay: false,
  },
];

export const mockFeastDay = {
  feastDay: 'The Epiphany of the Lord',
  season: 'Christmas',
  color: 'White',
  rank: 'SOLEMNITY',
};
