# Correções do Sistema de Episódios - Guia Completo

## Problemas Identificados e Soluções

### 1. **Problema: total_runtime_minutes vazio**
**Causa**: O campo não estava sendo calculado corretamente ao adicionar dramas às listas.

**Solução**: 
- Modificado `addToList` para sempre calcular o `total_runtime_minutes`
- Adicionado fallback para estimar 60 minutos por episódio quando a API falha
- Garantido que o valor nunca seja 0 ou NULL

### 2. **Problema: current_episode NULL**
**Causa**: O campo não estava sendo inicializado corretamente.

**Solução**:
- Modificado para sempre inicializar `current_episode` como 0 para watchlist e watching
- Para completed, inicializa com o número total de episódios
- Atualizado SQL para corrigir registros existentes

### 3. **Problema: watched_minutes não atualiza ao completar**
**Causa**: A função de completar não estava atualizando o campo `watched_minutes`.

**Solução**:
- Modificado `updateProgress` para calcular corretamente os minutos assistidos
- Ao completar, `watched_minutes` recebe o valor total de `total_runtime_minutes`
- Adicionado logs para debug

### 4. **Problema: Episódios não atualizam no banco**
**Causa**: Erro na lógica de atualização e falta de tratamento de erros.

**Solução**:
- Corrigido cálculo de `watched_minutes` baseado na proporção de episódios assistidos
- Adicionado tratamento de erro adequado
- Melhorado logs para debug

### 5. **Problema: Estatísticas não somam tempo assistido**
**Causa**: A função de estatísticas não estava considerando o campo `watched_minutes`.

**Solução**:
- Criado nova função SQL `update_user_stats_from_lists` que soma corretamente
- Trigger automático para atualizar estatísticas quando user_drama_lists muda
- Função RPC melhorada para cálculos precisos

## Arquivos Modificados

### 1. `database/fix-episode-system-complete.sql`
- Correções na estrutura da tabela
- Funções SQL para cálculos corretos
- Triggers automáticos
- Migração de dados existentes

### 2. `hooks/useUserStore.ts`
- Corrigido `addToList` para calcular runtime corretamente
- Melhorado `updateProgress` com cálculos precisos
- Adicionado logs detalhados para debug
- Tratamento de erro melhorado

### 3. `components/EpisodeManagementModal.tsx`
- UI reorganizada para melhor UX
- Botão "Marcar até Ep. X" movido para posição mais clara
- Ações rápidas reorganizadas
- Melhor feedback visual

### 4. `backend/trpc/routes/users/route.ts`
- Função `getUserStatsProcedure` atualizada para usar novos cálculos
- Fallback melhorado quando RPC falha
- Cálculos baseados em `watched_minutes`

## Como Usar o Sistema Corrigido

### 1. **Executar as Correções SQL**
```sql
-- Execute o arquivo database/fix-episode-system-complete.sql
-- Isso corrigirá todos os dados existentes e criará as funções necessárias
```

### 2. **Adicionar Drama à Lista**
- Ao adicionar um drama, o `total_runtime_minutes` será calculado automaticamente
- `current_episode` será inicializado como 0
- `watched_minutes` será 0 para watching/watchlist, total para completed

### 3. **Atualizar Progresso de Episódios**
- Use o modal de episódios para marcar episódios assistidos
- `watched_minutes` será calculado proporcionalmente
- Estatísticas serão atualizadas automaticamente via trigger

### 4. **Completar Drama**
- Ao marcar como concluído, todos os episódios são marcados como assistidos
- `watched_minutes` recebe o valor total de `total_runtime_minutes`
- Drama é movido para lista de concluídos
- Estatísticas são atualizadas automaticamente

## Fluxo de Dados Corrigido

```
1. Adicionar Drama → Calcular total_runtime_minutes → Salvar com current_episode=0
2. Assistir Episódios → Atualizar current_episode → Calcular watched_minutes proporcionalmente
3. Completar Drama → current_episode=total_episodes → watched_minutes=total_runtime_minutes
4. Trigger SQL → Atualizar user_stats automaticamente → Estatísticas corretas
```

## Campos Importantes

- `current_episode`: Episódio atual assistido (nunca NULL)
- `episodes_watched`: Igual ao current_episode (para compatibilidade)
- `watched_minutes`: Minutos assistidos calculados proporcionalmente
- `total_runtime_minutes`: Tempo total do drama (sempre preenchido)
- `total_episodes`: Número total de episódios

## Verificações de Qualidade

1. **Logs detalhados** para debug em todas as operações
2. **Tratamento de erro** adequado em todas as funções
3. **Triggers automáticos** para manter consistência
4. **Fallbacks** quando APIs externas falham
5. **Validações** para evitar dados inconsistentes

## Testes Recomendados

1. Adicionar drama à watchlist → Verificar total_runtime_minutes preenchido
2. Mover para watching → Verificar current_episode=0
3. Marcar episódios assistidos → Verificar watched_minutes calculado
4. Completar drama → Verificar watched_minutes=total_runtime_minutes
5. Verificar estatísticas → Tempo total deve somar corretamente