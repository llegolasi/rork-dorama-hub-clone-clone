export const DRAMA_GENRES = [
  { id: 'romance', name: 'Romance', emoji: '💕' },
  { id: 'comedy', name: 'Comédia', emoji: '😂' },
  { id: 'drama', name: 'Drama', emoji: '😢' },
  { id: 'thriller', name: 'Suspense', emoji: '🔥' },
  { id: 'fantasy', name: 'Fantasia', emoji: '✨' },
  { id: 'historical', name: 'Histórico', emoji: '🏛️' },
  { id: 'action', name: 'Ação', emoji: '⚡' },
  { id: 'mystery', name: 'Mistério', emoji: '🔍' },
  { id: 'slice-of-life', name: 'Slice of Life', emoji: '🌸' },
  { id: 'medical', name: 'Médico', emoji: '🏥' },
  { id: 'legal', name: 'Jurídico', emoji: '⚖️' },
  { id: 'school', name: 'Escolar', emoji: '🎓' }
];

// Popular K-dramas for initial taste selection (filtered: with posters and rating > 7)
export const POPULAR_DRAMAS = [
  {
    id: 124364,
    name: 'Squid Game',
    poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
    year: '2021',
    rating: 8.0
  },
  {
    id: 69050,
    name: 'Crash Landing on You',
    poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    year: '2019',
    rating: 8.7
  },
  {
    id: 83097,
    name: 'Kingdom',
    poster_path: '/qXbqzMRhXgp4W6HZHZVVYhKqgVF.jpg',
    year: '2019',
    rating: 8.3
  },
  {
    id: 100757,
    name: 'Hometown\'s Embrace',
    poster_path: '/6oFisV8lOhTOYgIjJAEhKjdAVyF.jpg',
    year: '2021',
    rating: 7.8
  },
  {
    id: 71712,
    name: 'The World of the Married',
    poster_path: '/jQGJOT3QYlQNGGWOGnZaVjsKNUu.jpg',
    year: '2020',
    rating: 7.9
  },
  {
    id: 85552,
    name: 'Itaewon Class',
    poster_path: '/qijKLnYmeqbNqtOagqpUbTuFcJE.jpg',
    year: '2020',
    rating: 8.2
  },
  {
    id: 70593,
    name: 'Reply 1988',
    poster_path: '/lbB1VcWJp1vlb7Ew9GVYKZKa2Xj.jpg',
    year: '2015',
    rating: 9.0
  },
  {
    id: 61889,
    name: 'Goblin',
    poster_path: '/qT4YIlKpOjOKxKoI6QOONx7FIZE.jpg',
    year: '2016',
    rating: 8.6
  },
  {
    id: 85271,
    name: 'Hospital Playlist',
    poster_path: '/1tKwjkKU2cWqbQzL8kYYNQpBbWX.jpg',
    year: '2020',
    rating: 8.8
  },
  {
    id: 100088,
    name: 'Start-Up',
    poster_path: '/hZJ9lYXlJ2P1xJOyNHWmKtUdAhJ.jpg',
    year: '2020',
    rating: 7.4
  },
  {
    id: 110492,
    name: 'Vincenzo',
    poster_path: '/dvXJgEDQXhL9Ouot2WkBHpQiHGd.jpg',
    year: '2021',
    rating: 8.4
  },
  {
    id: 197067,
    name: 'Business Proposal',
    poster_path: '/8kOWDBK6XlPUzckuHDdvLWOveT6.jpg',
    year: '2022',
    rating: 8.1
  },
  {
    id: 95403,
    name: 'My Love from the Star',
    poster_path: '/uAjMQlbPkVHmUahhCouANlHSDW2.jpg',
    year: '2013',
    rating: 8.2
  },
  {
    id: 88329,
    name: 'Descendants of the Sun',
    poster_path: '/o4TzTK9gEGGuGVzEqZNhbgE4QJM.jpg',
    year: '2016',
    rating: 8.3
  },
  {
    id: 135157,
    name: 'Hometown Cha-Cha-Cha',
    poster_path: '/1tKwjkKU2cWqbQzL8kYYNQpBbWX.jpg',
    year: '2021',
    rating: 8.5
  }
];

// Filter dramas with posters and rating > 7
export const getFilteredDramas = () => {
  return POPULAR_DRAMAS.filter(drama => 
    drama.poster_path && 
    drama.poster_path.trim() !== '' && 
    drama.rating > 7.0
  );
};

export const ONBOARDING_STEPS = {
  LOGIN: 'login',
  CREDENTIALS: 'credentials',
  PERSONAL_INFO: 'personal_info',
  PROFILE_PHOTO: 'profile_photo',
  PROFILE_INFO: 'profile_info',
  PREFERENCES: 'preferences'
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

export const GENDER_OPTIONS = [
  { id: 'male', label: 'Masculino', emoji: '👨' },
  { id: 'female', label: 'Feminino', emoji: '👩' },
  { id: 'non_binary', label: 'Não-binário', emoji: '🧑' },
  { id: 'prefer_not_to_say', label: 'Prefiro não dizer', emoji: '🤐' }
] as const;

export type GenderOption = typeof GENDER_OPTIONS[number]['id'];