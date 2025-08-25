# User Blocks System Setup Guide

Este guia explica como configurar o sistema de bloqueio de usuários no banco de dados.

## 1. Executar o Schema SQL

Execute o arquivo `user-blocks-schema.sql` no seu banco de dados Supabase:

```sql
-- Execute este arquivo no SQL Editor do Supabase
```

## 2. Funcionalidades Implementadas

### Tabela user_blocks
- `id`: Identificador único do bloqueio
- `blocker_id`: ID do usuário que está bloqueando
- `blocked_id`: ID do usuário que está sendo bloqueado
- `created_at`: Data/hora do bloqueio

### Funções Disponíveis

1. **is_user_blocked(blocker_uuid, blocked_uuid)**: Verifica se um usuário está bloqueado
2. **block_user(blocked_uuid)**: Bloqueia um usuário
3. **unblock_user(blocked_uuid)**: Desbloqueia um usuário

### Políticas RLS
- Usuários só podem ver seus próprios bloqueios
- Usuários só podem criar/deletar seus próprios bloqueios

## 3. Como Usar

### No Backend (tRPC)
```typescript
// Verificar se usuário está bloqueado
const isBlocked = await supabase.rpc('is_user_blocked', {
  blocker_uuid: currentUserId,
  blocked_uuid: targetUserId
});

// Bloquear usuário
await supabase.rpc('block_user', {
  blocked_uuid: targetUserId
});

// Desbloquear usuário
await supabase.rpc('unblock_user', {
  blocked_uuid: targetUserId
});
```

### No Frontend
```typescript
// Usar através das rotas tRPC
const blockMutation = trpc.users.blockUser.useMutation();
const unblockMutation = trpc.users.unblockUser.useMutation();
const isBlockedQuery = trpc.users.isUserBlocked.useQuery({ userId });
```

## 4. Considerações de Segurança

- RLS está habilitado para proteger dados
- Usuários só podem gerenciar seus próprios bloqueios
- Índices criados para performance
- Constraint UNIQUE previne bloqueios duplicados

## 5. Próximos Passos

1. Executar o SQL no Supabase
2. Implementar as rotas tRPC
3. Atualizar componentes de comentários
4. Adicionar menu de bloqueio no perfil
5. Filtrar conteúdo de usuários bloqueados