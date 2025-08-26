# Correção do Problema de Runtime dos Dramas

## Problema Identificado

O erro `column "runtime" does not exist` ocorre porque o código estava tentando acessar uma tabela `dramas` que não existe no banco de dados. Os dados dos dramas vêm da API externa (TMDB), não de uma tabela local.

## Solução Implementada

### 1. Remoção de Triggers Conflitantes
- Removidos todos os triggers duplicados e conflitantes da tabela `user_drama_lists`
- Removidas funções que faziam referência à tabela `dramas` inexistente

### 2. Nova Lógica de Cálculo
- **total_runtime_minutes**: Estimado como `total_episodes * 60` (60 minutos por episódio)
- **current_episode**: 
  - `watchlist`: 0 (não assistiu nada)
  - `completed`: igual ao `total_episodes`
  - `watching`: valor definido pelo usuário
- **watched_minutes**: Calculado proporcionalmente baseado no `current_episode`

### 3. Campos Adicionados
- `watched_episodes`: Array JSON para controle futuro
- `episodes_watched`: Número de episódios assistidos
- `watched_minutes`: Tempo total assistido em minutos

### 4. Triggers Simplificados
- **BEFORE INSERT/UPDATE**: Calcula automaticamente os valores
- **AFTER INSERT/UPDATE/DELETE**: Atualiza estatísticas do usuário

## Como Usar

1. Execute o arquivo `database/fix-drama-runtime-issue.sql` no Supabase
2. Isso irá:
   - Limpar todos os triggers conflitantes
   - Criar a nova lógica simplificada
   - Corrigir todos os dados existentes
   - Mostrar os primeiros 10 registros para verificação

## Comportamento Esperado

### Ao Adicionar Drama
- **Watchlist**: `current_episode = 0`, `watched_minutes = 0`
- **Watching**: `current_episode = 0`, `watched_minutes = 0` (usuário define depois)
- **Completed**: `current_episode = total_episodes`, `watched_minutes = total_runtime_minutes`

### Ao Atualizar Episódio Atual
- `watched_minutes` é recalculado automaticamente
- Exemplo: 10 episódios, 600 minutos total, assistiu 3 eps = 180 minutos

### Estatísticas do Usuário
- `total_watch_time_minutes` soma todos os `watched_minutes` dos dramas
- Atualizado automaticamente via trigger