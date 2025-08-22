# Auto-Follow Official Account Setup

Este guia explica como configurar o seguimento automático da conta oficial do app.

## Visão Geral

O sistema foi configurado para que todos os novos usuários sigam automaticamente a conta oficial do app (UUID: `d3a81a4e-3919-457e-a4e4-e3b9dbdf97d6`) durante o processo de cadastro e onboarding.

## Para Usuários Existentes

Execute o script SQL `auto-follow-official-account.sql` para adicionar o seguimento da conta oficial para todos os usuários existentes:

```sql
-- Execute este script no seu banco de dados Supabase
\i database/auto-follow-official-account.sql
```

## Funcionalidades Implementadas

### 1. Nova Tab "Seguindo" na Comunidade
- Adicionada nova aba "Seguindo" na tela de comunidade
- Mostra posts e rankings apenas de usuários que o usuário atual segue
- Funciona com os mesmos filtros de ordenação (Recentes/Populares)

### 2. Seguimento Automático
- **Novos usuários**: Seguem automaticamente a conta oficial durante o cadastro
- **Onboarding**: Também seguem a conta oficial ao completar o onboarding
- **Usuários existentes**: Use o script SQL fornecido

### 3. Backend Atualizado
- Endpoint `/api/trpc/community.getPosts` agora suporta o tipo `following`
- Filtra posts baseado na tabela `user_follows`
- Retorna array vazio se o usuário não estiver autenticado ou não seguir ninguém

## Estrutura do Banco de Dados

O sistema utiliza a tabela `user_follows` com a seguinte estrutura:
- `follower_user_id`: UUID do usuário que está seguindo
- `followed_user_id`: UUID do usuário sendo seguido
- `created_at`: Timestamp da criação do relacionamento

## Conta Oficial

- **UUID**: `d3a81a4e-3919-457e-a4e4-e3b9dbdf97d6`
- **Propósito**: Conta oficial do app para posts importantes, atualizações, etc.
- **Seguimento**: Todos os usuários seguem automaticamente esta conta

## Verificação

Para verificar se o sistema está funcionando:

1. Crie uma nova conta - deve seguir automaticamente a conta oficial
2. Acesse a aba "Seguindo" na comunidade
3. Verifique se os posts da conta oficial aparecem
4. Execute a query de verificação no final do script SQL para contar seguidores

## Notas Importantes

- O seguimento automático não falha o processo de cadastro/onboarding se houver erro
- Erros são logados mas não impedem o usuário de continuar
- A conta oficial deve existir no banco antes de executar o script
- O script evita duplicatas e auto-seguimento da conta oficial