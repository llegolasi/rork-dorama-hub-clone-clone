# Melhorias no Sistema de Listas de Dramas

## Resumo das Mudanças

Este documento descreve as melhorias implementadas no sistema de listas de dramas para usar apenas a tabela `user_drama_lists` para todas as estatísticas, eliminando a dependência da tabela `drama_completions`.

## Principais Alterações

### 1. Estrutura da Tabela `user_drama_lists`

Foram adicionados novos campos para melhor controle:
- `episodes_watched`: Número de episódios assistidos pelo usuário
- `watched_minutes`: Total de minutos assistidos baseado nos episódios

### 2. Lógica de Completar Dramas

**Antes:**
- Ao completar um drama, era criado um registro na tabela `drama_completions`
- As estatísticas eram calculadas usando dados de ambas as tabelas

**Agora:**
- Ao completar um drama, apenas a tabela `user_drama_lists` é atualizada:
  - `list_type` muda para 'completed'
  - `current_episode` = `total_episodes`
  - `episodes_watched` = `total_episodes`
  - `watched_minutes` = `total_runtime_minutes`

### 3. Cálculo de Estatísticas

As estatísticas agora são calculadas exclusivamente da tabela `user_drama_lists`:

- **Tempo Total Assistido**: 
  - Dramas completos: `total_runtime_minutes`
  - Dramas em andamento: `watched_minutes` (calculado proporcionalmente)
  
- **Contadores**:
  - Dramas completos: COUNT onde `list_type = 'completed'`
  - Dramas assistindo: COUNT onde `list_type = 'watching'`
  - Dramas na watchlist: COUNT onde `list_type = 'watchlist'`

### 4. Funções SQL Criadas

#### `update_user_stats_from_lists(p_user_id UUID)`
Atualiza as estatísticas do usuário baseado apenas na tabela `user_drama_lists`.

#### `get_user_comprehensive_stats(p_user_id UUID)`
Retorna estatísticas completas do usuário em formato JSON.

#### `update_user_statistics(p_user_id UUID)`
Função pública para atualizar estatísticas manualmente.

### 5. Triggers Automáticos

Foi criado um trigger que atualiza automaticamente as estatísticas sempre que há mudanças na tabela `user_drama_lists`:
- INSERT: Novo drama adicionado
- UPDATE: Drama movido entre listas ou progresso atualizado
- DELETE: Drama removido

### 6. Melhorias no Frontend

#### Backend (tRPC)
- `completeDramaProcedure`: Agora atualiza apenas `user_drama_lists`
- `getUserStatsProcedure`: Calcula estatísticas apenas de `user_drama_lists`
- Removida dependência de `drama_completions`

#### Hook `useUserStore`
- `updateProgress`: Calcula `watched_minutes` baseado na proporção de episódios assistidos
- `removeFromList`: Não precisa mais limpar `drama_completions`
- Lógica simplificada para completar dramas

#### Componente `WatchingList`
- Removida chamada para `completeDramaMutation`
- Processo de completar drama simplificado

## Benefícios das Mudanças

1. **Simplicidade**: Uma única fonte de verdade para todas as informações de dramas
2. **Consistência**: Eliminação de possíveis inconsistências entre tabelas
3. **Performance**: Menos JOINs e consultas mais simples
4. **Manutenibilidade**: Código mais limpo e fácil de manter
5. **Precisão**: Cálculo mais preciso do tempo assistido baseado em episódios

## Como Aplicar as Mudanças

1. Execute o arquivo SQL `database/user-drama-lists-improvements.sql` no seu banco de dados
2. O arquivo irá:
   - Adicionar os novos campos necessários
   - Migrar dados existentes
   - Criar as funções e triggers
   - Atualizar estatísticas de todos os usuários

## Campos Importantes

### `user_drama_lists`
- `current_episode`: Episódio atual (0 para watchlist, progresso para watching, total para completed)
- `episodes_watched`: Número de episódios assistidos (igual ao current_episode)
- `watched_minutes`: Minutos assistidos calculados proporcionalmente
- `total_runtime_minutes`: Tempo total do drama (sempre preenchido)

### Cálculo de `watched_minutes`
```sql
-- Para dramas em andamento
watched_minutes = (current_episode / total_episodes) * total_runtime_minutes

-- Para dramas completos
watched_minutes = total_runtime_minutes
```

## Compatibilidade

As mudanças são retrocompatíveis e não quebram funcionalidades existentes. O sistema continua funcionando normalmente, mas agora com uma arquitetura mais limpa e eficiente.