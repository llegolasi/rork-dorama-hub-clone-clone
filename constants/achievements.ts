import type { Achievement } from '@/types/user';

export const ACHIEVEMENTS: Achievement[] = [
  // Basic Achievements (Free)
  {
    id: 'first-drama',
    name: 'Primeiro Passo',
    description: 'Adicione seu primeiro K-drama à lista',
    icon: '🎬',
    rarity: 'common',
    isPremium: false,
  },
  {
    id: 'marathoner-beginner',
    name: 'Maratonista Iniciante',
    description: 'Complete seu primeiro K-drama',
    icon: '🏃‍♀️',
    rarity: 'common',
    isPremium: false,
  },
  {
    id: 'critic',
    name: 'Crítico de Sofá',
    description: 'Faça 10 comentários',
    icon: '💬',
    rarity: 'common',
    isPremium: false,
  },
  {
    id: 'opinion-maker',
    name: 'Formador de Opinião',
    description: 'Crie seu primeiro ranking',
    icon: '📝',
    rarity: 'common',
    isPremium: false,
  },
  {
    id: 'social-butterfly',
    name: 'Borboleta Social',
    description: 'Siga 10 usuários',
    icon: '🦋',
    rarity: 'common',
    isPremium: false,
  },
  {
    id: 'collector',
    name: 'Colecionador',
    description: 'Tenha 50 dramas na sua lista "Quero Ver"',
    icon: '📚',
    rarity: 'common',
    isPremium: false,
  },

  // Premium Achievements
  {
    id: 'romance-expert',
    name: 'Especialista em Romance',
    description: 'Assista a 20 K-dramas de romance',
    icon: '💕',
    rarity: 'rare',
    isPremium: true,
  },
  {
    id: 'thriller-master',
    name: 'Mestre do Suspense',
    description: 'Complete 15 K-dramas de thriller',
    icon: '🔍',
    rarity: 'rare',
    isPremium: true,
  },
  {
    id: 'time-traveler',
    name: 'Viajante do Tempo',
    description: 'Assista a 10 K-dramas históricos',
    icon: '⏰',
    rarity: 'rare',
    isPremium: true,
  },
  {
    id: 'community-legend',
    name: 'Lenda da Comunidade',
    description: 'Receba 100 curtidas em um ranking',
    icon: '👑',
    rarity: 'legendary',
    isPremium: true,
  },
  {
    id: 'marathon-king',
    name: 'Rei da Maratona',
    description: 'Assista a mais de 100 horas em um mês',
    icon: '🏆',
    rarity: 'legendary',
    isPremium: true,
  },
  {
    id: 'trendsetter',
    name: 'Formador de Tendências',
    description: 'Tenha um ranking em destaque na comunidade',
    icon: '🌟',
    rarity: 'legendary',
    isPremium: true,
  },
];

export const PROFILE_THEMES = [
  { id: 'default', name: 'Padrão', color: '#FF5FA2' },
  { id: 'sakura', name: 'Sakura', color: '#FFB7C5' },
  { id: 'seoul-night', name: 'Noite de Seul', color: '#6C5CE7' },
  { id: 'hanbok', name: 'Hanbok', color: '#FD79A8' },
  { id: 'autumn', name: 'Outono Coreano', color: '#E17055' },
  { id: 'ocean', name: 'Oceano', color: '#74B9FF' },
];

export const PROFILE_BORDERS = [
  { id: 'default', name: 'Padrão', preview: '⭕' },
  { id: 'sakura', name: 'Flores de Cerejeira', preview: '🌸' },
  { id: 'neon', name: 'Luzes de Neon', preview: '💫' },
  { id: 'founder', name: 'Membro Fundador', preview: '👑' },
  { id: 'premium', name: 'Premium Gold', preview: '✨' },
  { id: 'diamond', name: 'Diamante', preview: '💎' },
];

export const REACTION_EMOJIS = [
  { id: 'like', emoji: '❤️', name: 'Curtir' },
  { id: 'clap', emoji: '👏', name: 'Palmas' },
  { id: 'cry', emoji: '😭', name: 'Chorar' },
  { id: 'surprise', emoji: '😮', name: 'Surpresa' },
  { id: 'fire', emoji: '🔥', name: 'Incrível' },
  { id: 'laugh', emoji: '😂', name: 'Engraçado' },
];