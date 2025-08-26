# Sistema de Rastreamento de Episódios e Categorias

Este sistema implementa um rastreamento completo e automático de episódios assistidos, com sincronização automática entre as tabelas e cálculo de estatísticas detalhadas.

## Estrutura do Sistema

### 1. Tabelas Principais

#### `episode_watch_history`
- **Propósito**: Registra cada episódio assistido individualmente
- **Campos principais**:
  - `user_id`: ID do usuário
  - `drama_id`: ID do drama
  - `episode_number`: Número do episódio
  - `episode_duration_minutes`: Duração do episódio
  - `watched_at`: Quando foi assistido
  - `started_at`: Quando começou a assistir
  - `completed_at`: Quando terminou de assistir

#### `user_drama_lists` (modificada)
- **Novo campo**: `drama_category` - categoria do drama (romance, comédia, etc.)
- **Sincronização automática**: Os campos `episodes_watched`, `current_episode` e `watched_minutes` são atualizados automaticamente baseados no histórico

#### `user_stats` (atualizada)
- **Sincronização automática**: Todas as estatísticas são recalculadas automaticamente
- **Novo campo**: `favorite_genres` - gêneros favoritos baseados nas categorias dos dramas

### 2. Fluxo de Sincronização

```
episode_watch_history → user_drama_lists → user_stats
```

1. **Histórico → Lista**: Quando um episódio é marcado como assistido, atualiza automaticamente a lista do usuário
2. **Lista → Estatísticas**: Quando a lista é modificada, recalcula automaticamente as estatísticas do usuário

### 3. Funções Principais

#### `mark_episode_watched()`
Marca um episódio específico como assistido:
```sql
SELECT mark_episode_watched(
    'user-uuid',     -- ID do usuário
    12345,           -- ID do drama
    5,               -- Número do episódio
    65,              -- Duração em minutos (opcional, padrão 60)
    '2024-01-15 20:00:00'::timestamp, -- Quando começou (opcional)
    '2024-01-15 21:05:00'::timestamp  -- Quando terminou (opcional, padrão NOW())
);
```

#### `complete_drama_with_date_range()`
Marca um drama como completo distribuindo os episódios ao longo de um período:
```sql
SELECT complete_drama_with_date_range(
    'user-uuid',     -- ID do usuário
    12345,           -- ID do drama
    16,              -- Total de episódios
    '2024-01-01',    -- Data de início
    '2024-01-10',    -- Data de fim
    60,              -- Duração por episódio (opcional)
    'Romance'        -- Categoria do drama (opcional)
);
```

#### `get_user_detailed_stats()`
Retorna estatísticas detalhadas do usuário:
```sql
SELECT * FROM get_user_detailed_stats('user-uuid');
```

Retorna:
- Tempo total assistido
- Contadores de dramas (completos, assistindo, watchlist)
- Gêneros favoritos
- Estatísticas semanais, mensais e anuais
- Média de episódios por dia
- Hora mais ativa
- Taxa de conclusão

## Como Usar no App

### 1. Marcar Episódio Individual
Quando o usuário marca um episódio como assistido no modal:

```typescript
// No backend (tRPC)
await ctx.supabase.rpc('mark_episode_watched', {
  p_user_id: userId,
  p_drama_id: dramaId,
  p_episode_number: episodeNumber,
  p_episode_duration_minutes: 60
});
```

### 2. Completar Drama Diretamente
Quando o usuário marca um drama como completo sem ter assistido episódio por episódio:

```typescript
// Mostrar modal para o usuário escolher datas
const startDate = '2024-01-01';
const endDate = '2024-01-10';
const category = 'Romance';

// No backend (tRPC)
await ctx.supabase.rpc('complete_drama_with_date_range', {
  p_user_id: userId,
  p_drama_id: dramaId,
  p_total_episodes: totalEpisodes,
  p_start_date: startDate,
  p_end_date: endDate,
  p_episode_duration_minutes: 60,
  p_drama_category: category
});
```

### 3. Obter Estatísticas Detalhadas
Para a tela de estatísticas:

```typescript
// No backend (tRPC)
const stats = await ctx.supabase.rpc('get_user_detailed_stats', {
  p_user_id: userId
});
```

## Vantagens do Sistema

1. **Automático**: Toda sincronização é feita via triggers, sem necessidade de código manual
2. **Consistente**: Os dados sempre estarão sincronizados entre as tabelas
3. **Detalhado**: Registra quando cada episódio foi assistido, permitindo análises temporais
4. **Flexível**: Suporta tanto marcação individual quanto em lote
5. **Performático**: Índices otimizados para consultas rápidas
6. **Histórico Completo**: Mantém registro de quando cada episódio foi assistido

## Migração de Dados Existentes

O script automaticamente migra os dados existentes:
- Cria registros no histórico baseado nos episódios já marcados como assistidos
- Distribui as datas de forma retroativa
- Mantém a consistência dos dados atuais

## Próximos Passos

1. Executar o SQL no banco de dados
2. Atualizar o backend para usar as novas funções
3. Modificar o modal de episódios para usar `mark_episode_watched()`
4. Criar modal de completar drama com seleção de datas
5. Atualizar a tela de estatísticas para usar `get_user_detailed_stats()`