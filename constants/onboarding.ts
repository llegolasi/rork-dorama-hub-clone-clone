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
  WELCOME: 'welcome',
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

// Welcome screen features
export const APP_FEATURES = [
  {
    id: 'discover',
    title: 'Descubra Novos Doramas',
    description: 'Explore milhares de doramas coreanos, japoneses e chineses com recomendações personalizadas',
    icon: '🎭',
    gradient: ['#FF6B6B', '#FF8E8E'],
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop'
  },
  {
    id: 'track',
    title: 'Organize Suas Listas',
    description: 'Mantenha controle do que está assistindo, já assistiu e planeja assistir',
    icon: '📝',
    gradient: ['#4ECDC4', '#44A08D'],
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop'
  },
  {
    id: 'community',
    title: 'Conecte-se com Fãs',
    description: 'Compartilhe opiniões, avaliações e descubra o que outros fãs estão assistindo',
    icon: '👥',
    gradient: ['#A8E6CF', '#7FCDCD'],
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop'
  },
  {
    id: 'reviews',
    title: 'Avalie e Comente',
    description: 'Deixe suas avaliações e leia reviews detalhadas de outros usuários',
    icon: '⭐',
    gradient: ['#FFD93D', '#FF6B6B'],
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop'
  },
  {
    id: 'calendar',
    title: 'Calendário de Lançamentos',
    description: 'Nunca perca um episódio com nosso calendário de lançamentos atualizado',
    icon: '📅',
    gradient: ['#667eea', '#764ba2'],
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  },
  {
    id: 'stats',
    title: 'Estatísticas Pessoais',
    description: 'Acompanhe suas estatísticas de visualização e conquiste achievements',
    icon: '📊',
    gradient: ['#f093fb', '#f5576c'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'
  }
];