# Sistema de Comentários e Curtidas para Notícias

Este documento descreve o sistema de comentários e curtidas implementado para as notícias do aplicativo.

## Funcionalidades Implementadas

### 1. Curtidas em Artigos
- ✅ Usuários podem curtir/descurtir artigos de notícias
- ✅ Contador de curtidas em tempo real
- ✅ Status de curtida do usuário atual
- ✅ Prevenção de curtidas duplicadas

### 2. Sistema de Comentários
- ✅ Usuários podem adicionar comentários em artigos
- ✅ Visualização de comentários com informações do usuário
- ✅ Timestamp formatado (ex: "2h atrás", "Ontem")
- ✅ Contador de comentários
- ✅ Suporte para comentários editados (flag "editado")

### 3. Curtidas em Comentários
- ✅ Usuários podem curtir/descurtir comentários individuais
- ✅ Contador de curtidas por comentário
- ✅ Status de curtida do usuário em cada comentário

### 4. Interface do Usuário
- ✅ Componente `NewsCommentSection` integrado
- ✅ Design consistente com o resto do app
- ✅ Estados de loading e erro
- ✅ Validação de entrada (máximo 1000 caracteres)
- ✅ Feedback visual para ações (curtir/comentar)

## Estrutura do Banco de Dados

### Tabelas Criadas

1. **`news_article_likes`**
   - Armazena curtidas dos artigos
   - Relaciona usuário com artigo
   - Previne curtidas duplicadas

2. **`news_article_comments`**
   - Armazena comentários dos artigos
   - Suporte para comentários aninhados (replies)
   - Flags para edição e exclusão lógica
   - Contador de curtidas por comentário

3. **`news_comment_likes`**
   - Armazena curtidas dos comentários
   - Relaciona usuário com comentário
   - Previne curtidas duplicadas

### Views e Funções

1. **`news_comments_with_user`** (View)
   - Combina comentários com informações do usuário
   - Inclui contador de respostas
   - Filtra comentários não deletados

2. **Funções Utilitárias**
   - `get_article_stats()` - Retorna estatísticas do artigo
   - `user_liked_article()` - Verifica se usuário curtiu artigo
   - `user_liked_comment()` - Verifica se usuário curtiu comentário

## API tRPC

### Rotas Implementadas

```typescript
// Comentários
trpc.news.getComments.useQuery({ articleId })
trpc.news.addComment.useMutation({ articleId, content })
trpc.news.toggleCommentLike.useMutation({ commentId })

// Curtidas de Artigos
trpc.news.getArticleLikes.useQuery({ articleId })
trpc.news.getUserLikedArticle.useQuery({ articleId })
trpc.news.toggleArticleLike.useMutation({ articleId })
```

## Como Usar

### 1. Visualizar Comentários e Curtidas
```typescript
import NewsCommentSection from '@/components/NewsCommentSection';

// Em qualquer página de notícia
<NewsCommentSection articleId={articleId} />
```

### 2. Adicionar Cover Image nos Cards
Os cards de notícias agora mostram automaticamente a `cover_image_url` quando disponível:

```typescript
// Nos cards da lista de notícias
{item.cover_image_url && (
  <Image 
    source={{ uri: item.cover_image_url }}
    style={styles.coverImage}
    resizeMode="cover"
  />
)}
```

## Segurança e Permissões

### Row Level Security (RLS)
- ✅ Todas as tabelas têm RLS habilitado
- ✅ Usuários só podem gerenciar suas próprias curtidas
- ✅ Usuários só podem editar/deletar seus próprios comentários
- ✅ Comentários são visíveis para todos os usuários autenticados

### Validações
- ✅ Comentários: 1-1000 caracteres
- ✅ Prevenção de curtidas/comentários duplicados
- ✅ Verificação de autenticação para ações

## Performance

### Índices Criados
- ✅ Índices em `user_id`, `article_id`, `comment_id`
- ✅ Índices em `created_at` para ordenação
- ✅ Índices compostos para consultas frequentes

### Otimizações
- ✅ Contadores atualizados via triggers
- ✅ Consultas otimizadas com JOINs eficientes
- ✅ Cache de status de curtidas do usuário

## Próximos Passos (Opcionais)

### Funcionalidades Futuras
- [ ] Respostas a comentários (threading)
- [ ] Notificações para curtidas/comentários
- [ ] Moderação de comentários
- [ ] Relatórios de comentários inadequados
- [ ] Edição de comentários
- [ ] Menções de usuários (@username)

### Melhorias de UX
- [ ] Animações para curtidas
- [ ] Paginação de comentários
- [ ] Ordenação de comentários (mais curtidos, mais recentes)
- [ ] Preview de links em comentários
- [ ] Emojis/reações além de curtidas

## Troubleshooting

### Problemas Comuns

1. **Comentários não aparecem**
   - Verificar se o usuário está autenticado
   - Verificar se a view `news_comments_with_user` existe
   - Verificar logs do Supabase

2. **Curtidas não funcionam**
   - Verificar se as tabelas de likes foram criadas
   - Verificar se os triggers estão ativos
   - Verificar permissões RLS

3. **Erros de TypeScript**
   - Verificar se as rotas tRPC foram adicionadas ao router
   - Verificar se os tipos estão corretos
   - Regenerar tipos do tRPC se necessário

### Logs Úteis
```typescript
// Para debug, adicionar nos componentes:
console.log('Comments data:', commentsQuery.data);
console.log('Likes data:', likesQuery.data);
console.log('User liked:', userLikedQuery.data);
```