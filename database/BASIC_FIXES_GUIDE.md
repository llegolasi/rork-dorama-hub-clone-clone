# Correção dos Problemas Básicos - Guia de Implementação

## Problemas Identificados e Soluções

### 1. **total_runtime_minutes sempre 0**
**Problema:** Quando adiciona um drama à lista, o campo `total_runtime_minutes` fica como 0.

**Solução Implementada:**
- Corrigido no código JavaScript (`hooks/useUserStore.ts`) para sempre calcular o runtime
- Adicionado fallback de 60 minutos por episódio quando a API falha
- Criado trigger no banco para garantir que nunca seja 0

### 2. **watched_minutes não atualiza ao completar**
**Problema:** Quando marca como completado, o `watched_minutes` não recebe o valor de `total_runtime_minutes`.

**Solução Implementada:**
- Corrigido no backend (`backend/trpc/routes/completions/route.ts`)
- Adicionado trigger no banco para automaticamente definir `watched_minutes = total_runtime_minutes` para dramas completados

### 3. **current_episode não atualiza**
**Problema:** Quando atualiza episódios assistidos, o `current_episode` não é salvo no banco.

**Solução Implementada:**
- Corrigido no código JavaScript (`hooks/useUserStore.ts`) na função `updateProgress`
- Adicionado logs para debug
- Melhorado o refresh de dados após atualizações

## Arquivos Modificados

### 1. `hooks/useUserStore.ts`
- Melhorado cálculo de `total_runtime_minutes`
- Corrigido lógica de `current_episode` e `watched_minutes`
- Adicionado logs detalhados para debug

### 2. `backend/trpc/routes/completions/route.ts`
- Garantido que `watched_minutes` seja atualizado corretamente ao completar

### 3. `components/EpisodeManagementModal.tsx`
- Melhorado feedback visual durante atualizações
- Adicionado refresh forçado após mudanças

### 4. `database/fix-basic-issues.sql`
- Script SQL para corrigir dados existentes
- Triggers para garantir consistência futura
- Função de fallback para runtime

## Como Aplicar as Correções

### 1. Executar o Script SQL
```sql
-- Execute o arquivo database/fix-basic-issues.sql no seu banco Supabase
-- Isso vai:
-- - Corrigir dados existentes
-- - Criar triggers para consistência
-- - Atualizar estatísticas dos usuários
```

### 2. Testar as Funcionalidades

#### Teste 1: Adicionar à Lista
1. Adicione um drama a qualquer lista
2. Verifique se `total_runtime_minutes` > 0
3. Verifique se `current_episode` tem valor correto

#### Teste 2: Atualizar Episódios
1. Marque alguns episódios como assistidos
2. Verifique se `current_episode` é atualizado
3. Verifique se `watched_minutes` é calculado proporcionalmente

#### Teste 3: Completar Drama
1. Marque um drama como completado
2. Verifique se `watched_minutes = total_runtime_minutes`
3. Verifique se `current_episode = total_episodes`

#### Teste 4: Estatísticas
1. Vá para a tela de perfil
2. Verifique se o tempo total está correto
3. Verifique se conta tanto dramas completados quanto parciais

## Logs para Debug

O sistema agora inclui logs detalhados:

```javascript
// No console você verá:
"Calculated runtime for drama X: Y minutes"
"Updating existing drama X: listType=completed, watchedMinutes=Y"
"updateProgress: Successfully updated drama X with data: {...}"
```

## Estrutura de Dados Corrigida

### user_drama_lists
```sql
-- Para watchlist:
current_episode = 0
episodes_watched = 0  
watched_minutes = 0
total_runtime_minutes = [calculado]

-- Para watching:
current_episode = [episódio atual]
episodes_watched = [episódio atual]
watched_minutes = [proporcional ao progresso]
total_runtime_minutes = [calculado]

-- Para completed:
current_episode = total_episodes
episodes_watched = total_episodes
watched_minutes = total_runtime_minutes
total_runtime_minutes = [calculado]
```

## Verificação de Funcionamento

Após aplicar as correções, teste:

1. ✅ Adicionar drama → `total_runtime_minutes` > 0
2. ✅ Marcar episódios → `current_episode` atualizado
3. ✅ Completar drama → `watched_minutes` = `total_runtime_minutes`
4. ✅ Estatísticas → tempo total correto
5. ✅ Refresh automático → dados atualizados na UI

## Próximos Passos

Se ainda houver problemas:

1. Verifique os logs no console
2. Confirme que o script SQL foi executado
3. Teste com um drama novo (não existente no banco)
4. Verifique se as triggers estão ativas no Supabase