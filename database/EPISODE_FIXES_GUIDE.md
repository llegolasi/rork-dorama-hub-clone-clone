# Correções do Sistema de Episódios

Este documento descreve as correções implementadas para resolver os problemas no sistema de episódios e estatísticas.

## Problemas Identificados e Soluções

### 1. **Problema: Campo `watched_minutes` não atualizado ao completar drama**

**Problema**: Ao marcar um drama como concluído, o campo `watched_minutes` não estava sendo atualizado com o valor de `total_runtime_minutes`.

**Solução**: 
- Corrigido em `backend/trpc/routes/completions/route.ts`
- Agora usa `dramaData.total_runtime_minutes || totalRuntimeMinutes` para garantir que o tempo total seja salvo

### 2. **Problema: Cálculo incorreto do `watched_minutes` na atualização de episódios**

**Problema**: O cálculo do tempo assistido baseado nos episódios não estava correto.

**Solução**:
- Corrigido em `hooks/useUserStore.ts` na função `updateProgress`
- Agora calcula corretamente: `currentEpisode * (total_runtime_minutes / total_episodes)`

### 3. **Problema: Campos não inicializados ao adicionar à lista**

**Problema**: Ao adicionar um drama à lista, os campos `current_episode`, `watched_minutes` e `episodes_watched` não eram inicializados corretamente.

**Solução**:
- Corrigido em `hooks/useUserStore.ts` na função `addToList`
- Agora inicializa todos os campos necessários:
  - `current_episode`: 0 para watchlist e watching
  - `watched_minutes`: 0 inicialmente
  - `episodes_watched`: 0 inicialmente

### 4. **Problema: Exibição incorreta do tempo assistido na UI**

**Problema**: A interface mostrava o tempo total do drama em vez do tempo realmente assistido.

**Solução**:
- Corrigido em `components/EpisodeManagementModal.tsx` e `components/lists/ListCard.tsx`
- Agora usa `watched_minutes` do banco de dados em vez de `total_runtime_minutes`
- Atualizado `userListItem.progress.totalWatchTimeMinutes` para refletir `watched_minutes`

### 5. **Problema: Estatísticas não atualizadas corretamente**

**Problema**: As estatísticas do usuário não consideravam o tempo assistido dos episódios parciais.

**Solução**:
- Criado arquivo SQL `database/fix-episode-progress-system.sql` com:
  - Função `update_user_statistics()` que calcula corretamente o tempo total
  - Função `get_user_comprehensive_stats()` para estatísticas completas
  - Trigger automático para atualizar estatísticas quando `user_drama_lists` muda
  - Correção de dados existentes

## Arquivos Modificados

1. **backend/trpc/routes/completions/route.ts**
   - Corrigido para usar `total_runtime_minutes` ao completar drama

2. **hooks/useUserStore.ts**
   - Corrigido cálculo de `watched_minutes` na função `updateProgress`
   - Corrigido inicialização de campos na função `addToList`
   - Atualizado para usar `watched_minutes` em vez de `total_runtime_minutes` no progress

3. **components/EpisodeManagementModal.tsx**
   - Corrigido para mostrar tempo assistido correto
   - Atualizado para usar dados do `progress` em vez de campos diretos

4. **components/lists/ListCard.tsx**
   - Corrigido cálculo do tempo assistido exibido

5. **database/fix-episode-progress-system.sql** (NOVO)
   - Script SQL completo para corrigir banco de dados
   - Funções para atualizar estatísticas automaticamente
   - Triggers para manter dados sincronizados

## Como Aplicar as Correções

1. **Execute o script SQL**:
   ```sql
   -- Execute o arquivo database/fix-episode-progress-system.sql no seu banco Supabase
   ```

2. **Reinicie a aplicação** para carregar as correções do código

3. **Teste o fluxo completo**:
   - Adicione um drama à lista "Quero Assistir" (deve ter `current_episode = 0`)
   - Mova para "Assistindo" (deve manter `current_episode = 0`)
   - Atualize episódios assistidos (deve calcular `watched_minutes` corretamente)
   - Complete o drama (deve ter `watched_minutes = total_runtime_minutes`)
   - Verifique as estatísticas (deve somar tempo de dramas completos + tempo parcial)

## Validações Implementadas

- ✅ `current_episode` sempre inicializado (0 para watchlist/watching)
- ✅ `watched_minutes` calculado corretamente baseado em episódios assistidos
- ✅ `total_runtime_minutes` sempre preenchido ao adicionar drama
- ✅ Estatísticas consideram tempo parcial + tempo completo
- ✅ Interface mostra dados reais do banco de dados
- ✅ Triggers automáticos mantêm estatísticas atualizadas

## Comportamento Esperado

### Ao adicionar drama:
- **Watchlist**: `current_episode = 0`, `watched_minutes = 0`
- **Watching**: `current_episode = 0`, `watched_minutes = 0`
- **Completed**: `current_episode = total_episodes`, `watched_minutes = total_runtime_minutes`

### Ao atualizar episódios:
- `current_episode` = episódio atual
- `watched_minutes` = `current_episode * (total_runtime_minutes / total_episodes)`

### Ao completar drama:
- `current_episode = total_episodes`
- `watched_minutes = total_runtime_minutes`
- Move para lista "Completed"

### Nas estatísticas:
- Soma `total_runtime_minutes` dos dramas completed
- Soma `watched_minutes` dos dramas watching
- Ignora dramas em watchlist (tempo = 0)