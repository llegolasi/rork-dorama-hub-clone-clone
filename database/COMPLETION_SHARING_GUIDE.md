# Funcionalidade de Compartilhamento de Conclusão de Dorama

## Visão Geral

Esta funcionalidade permite que os usuários compartilhem automaticamente quando concluem um K-drama, criando um "certificado de conclusão" personalizado com estatísticas de tempo de maratona.

## Como Funciona

### 1. Gatilho Automático
- A funcionalidade é ativada automaticamente quando o usuário marca um dorama como "Concluído"
- Não requer ação adicional do usuário além de marcar como concluído

### 2. Cálculo do Tempo Total
- O sistema calcula automaticamente o tempo total de maratona usando a API do TMDB
- Busca informações de todas as temporadas e episódios
- Soma o runtime de todos os episódios
- Usa estimativas quando dados específicos não estão disponíveis

### 3. Geração do Certificado
- Cria uma imagem personalizada com:
  - Fundo usando o backdrop do dorama
  - Pôster do dorama
  - Nome do usuário
  - Nome do dorama
  - Tempo total de maratona formatado
  - Branding do Dorama Hub

### 4. Opções de Compartilhamento
- **Compartilhar**: Usa a API nativa de compartilhamento do sistema
- **Baixar**: Salva a imagem na galeria do usuário

## Implementação Técnica

### Componentes Principais

#### 1. `CompletionShareModal.tsx`
- Modal principal para iOS
- Usa `Modal` do React Native com `presentationStyle="pageSheet"`

#### 2. `CompletionShareModal.android.tsx`
- Modal específico para Android
- Usa overlay customizado para melhor compatibilidade

#### 3. `ListToggle.tsx` (Modificado)
- Detecta quando um dorama é marcado como concluído
- Dispara a funcionalidade de compartilhamento automaticamente

### Backend

#### 1. Banco de Dados
- Nova tabela `drama_completions` para rastrear conclusões
- Atualização automática das estatísticas do usuário
- Funções SQL para gerenciar completions

#### 2. API tRPC
- `completions.completeDrama`: Salva a conclusão no banco
- `completions.getHistory`: Histórico de conclusões
- `completions.getStats`: Estatísticas de conclusão
- `completions.checkCompletion`: Verifica se um dorama foi concluído

### Cálculo de Runtime

#### 1. `calculateDramaTotalRuntime()`
- Busca detalhes da série no TMDB
- Itera por todas as temporadas
- Soma o runtime de todos os episódios
- Usa fallbacks para estimativas quando necessário

## Fluxo de Uso

1. **Usuário marca dorama como concluído**
   ```typescript
   // No ListToggle.tsx
   handleToggle('completed')
   ```

2. **Sistema detecta conclusão**
   ```typescript
   if (wasNotCompleted && isNowCompleted && user) {
     handleCompletionShare();
   }
   ```

3. **Calcula tempo total**
   ```typescript
   const totalRuntimeMinutes = await calculateDramaTotalRuntime(dramaId);
   ```

4. **Salva no banco de dados**
   ```typescript
   await completeDramaMutation.mutateAsync({
     dramaId,
     dramaName: dramaDetails.name,
     totalRuntimeMinutes,
   });
   ```

5. **Exibe modal de compartilhamento**
   ```typescript
   setShowCompletionModal(true);
   ```

## Recursos Técnicos

### Dependências Adicionais
- `expo-media-library`: Para salvar imagens na galeria
- `react-native-view-shot`: Para capturar o certificado como imagem
- `expo-linear-gradient`: Para gradientes no certificado

### Compatibilidade
- **iOS**: Usa Modal nativo com apresentação em sheet
- **Android**: Usa overlay customizado para melhor funcionamento
- **Web**: Funciona com limitações (sem download de imagem)

### Permissões
- **Android/iOS**: Permissão de galeria para salvar imagens
- Solicitação automática quando necessário

## Personalização

### Design do Certificado
O certificado pode ser personalizado modificando:
- Cores e gradientes
- Layout dos elementos
- Fontes e tamanhos
- Branding

### Formato de Tempo
```typescript
const formatTime = (hours: number, minutes: number): string => {
  if (hours === 0) return `${minutes} minutos`;
  if (minutes === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} minutos`;
};
```

## Estatísticas Salvas

### Banco de Dados
- Tempo total de maratona por dorama
- Data de conclusão
- Estatísticas agregadas do usuário
- Histórico de conclusões

### Uso das Estatísticas
- Achievements baseados em tempo assistido
- Rankings de usuários mais ativos
- Análises de comportamento de visualização
- Recomendações personalizadas

## Considerações de Performance

### Otimizações
- Cálculo de runtime em background
- Cache de dados do TMDB quando possível
- Geração de imagem otimizada
- Fallbacks para casos de erro

### Tratamento de Erros
- Timeout para requests do TMDB
- Fallbacks para estimativas de runtime
- Mensagens de erro user-friendly
- Retry automático em falhas temporárias

## Futuras Melhorias

### Possíveis Adições
1. **Certificados Temáticos**: Diferentes designs por gênero
2. **Conquistas Especiais**: Certificados para marcos especiais
3. **Compartilhamento Social**: Integração direta com redes sociais
4. **Estatísticas Avançadas**: Gráficos de tempo assistido
5. **Comparações**: Comparar tempo com outros usuários

### Melhorias Técnicas
1. **Cache Inteligente**: Cache de runtimes calculados
2. **Processamento Offline**: Cálculos em background
3. **Compressão de Imagens**: Otimização automática
4. **Analytics**: Tracking de uso da funcionalidade