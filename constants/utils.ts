import { Dimensions } from 'react-native';

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'agora';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}sem`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mês${diffInMonths > 1 ? 'es' : ''}`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}ano${diffInYears > 1 ? 's' : ''}`;
};

// Função para calcular número de colunas baseado no tamanho da tela
export const getResponsiveColumns = (type: 'small' | 'medium' | 'large' = 'medium'): number => {
  const { width } = Dimensions.get('window');
  
  // Breakpoints baseados em tamanhos comuns de dispositivos
  const isSmallDevice = width < 375; // iPhone SE, dispositivos pequenos
  const isMediumDevice = width >= 375 && width < 414; // iPhone 8, iPhone X
  
  switch (type) {
    case 'small':
      // Para cards pequenos (como na busca)
      if (isSmallDevice) return 2;
      if (isMediumDevice) return 2;
      return 3; // dispositivos grandes
      
    case 'medium':
      // Para cards médios (como trending/popular)
      return 2; // sempre 2 colunas para cards médios
      
    case 'large':
      // Para cards grandes (como categorias)
      if (isSmallDevice) return 2;
      if (isMediumDevice) return 2;
      return 3; // dispositivos grandes
      
    default:
      return 2;
  }
};

// Função para calcular largura do card baseado no número de colunas e largura da tela
export const getCardWidth = (numColumns: number, containerPadding: number = 12): number => {
  const { width } = Dimensions.get('window');
  const itemPadding = 4; // padding entre os itens
  
  // Largura disponível após descontar o padding do container
  const availableWidth = width - (containerPadding * 2);
  
  // Largura de cada item considerando o padding entre eles
  const itemWidth = (availableWidth - (itemPadding * 2 * numColumns)) / numColumns;
  
  return Math.floor(itemWidth);
};

// Função para calcular dimensões responsivas dos cards
export const getResponsiveCardDimensions = (type: 'small' | 'medium' | 'large' = 'medium') => {
  const numColumns = getResponsiveColumns(type);
  const cardWidth = getCardWidth(numColumns);
  
  return {
    numColumns,
    cardWidth,
    itemPadding: 4
  };
};