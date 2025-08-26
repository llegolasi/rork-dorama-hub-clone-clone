# Comment Likes Setup Guide

Este guia explica como configurar o sistema de likes para comentários de posts e rankings.

## Arquivos Relacionados

- `database/comment-likes-schema.sql` - Schema das tabelas de likes
- `backend/trpc/routes/community/posts/route.ts` - APIs para posts
- `backend/trpc/routes/rankings/route.ts` - APIs para rankings
- `components/NewsCommentSection.tsx` - Componente unificado de comentários

## Tabelas Criadas

### post_comment_likes
- Armazena likes de comentários de posts
- Relaciona comment_id com user_id
- Constraint UNIQUE para evitar likes duplicados

### ranking_comment_likes
- Armazena likes de comentários de rankings
- Relaciona comment_id com user_id
- Constraint UNIQUE para evitar likes duplicados

## Funcionalidades

### Para Posts
- `togglePostCommentLike` - Curtir/descurtir comentário
- `deletePostComment` - Deletar comentário próprio

### Para Rankings
- `toggleRankingCommentLike` - Curtir/descurtir comentário
- `deleteRankingComment` - Deletar comentário próprio

## Como Usar

1. Execute o SQL no Supabase:
```sql
-- Execute o conteúdo de database/comment-likes-schema.sql
```

2. O componente NewsCommentSection agora funciona para:
   - Notícias: `<NewsCommentSection articleId="..." type="news" />`
   - Posts: `<NewsCommentSection postId="..." type="post" />`
   - Rankings: `<NewsCommentSection rankingId="..." type="ranking" />`

## Recursos Implementados

- ✅ Sistema unificado de comentários
- ✅ Likes em comentários e respostas
- ✅ Deletar comentários próprios
- ✅ Respostas aninhadas
- ✅ Contadores automáticos via triggers
- ✅ RLS policies para segurança
- ✅ Interface consistente entre todas as telas

## Segurança

- RLS habilitado em todas as tabelas
- Usuários só podem deletar seus próprios comentários
- Usuários só podem curtir/descurtir uma vez por comentário
- Validação de permissões no backend