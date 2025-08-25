# Comment Reports System Setup Guide

Este guia explica como configurar o sistema de denúncias de comentários no banco de dados.

## 1. Executar o Schema SQL

Execute o arquivo `comment-reports-schema.sql` no seu banco de dados Supabase:

```sql
-- Execute todo o conteúdo do arquivo comment-reports-schema.sql
```

## 2. Funcionalidades Implementadas

### Tabela comment_reports
- **id**: UUID único da denúncia
- **comment_id**: Referência ao comentário denunciado
- **reporter_id**: ID do usuário que fez a denúncia
- **reason**: Motivo da denúncia (spam, harassment, hate_speech, inappropriate_content, misinformation, other)
- **description**: Descrição opcional da denúncia
- **status**: Status da denúncia (pending, reviewed, resolved, dismissed)
- **created_at/updated_at**: Timestamps de criação e atualização
- **reviewed_by/reviewed_at**: Informações de revisão por admin

### Políticas de Segurança (RLS)
- Usuários podem criar denúncias
- Usuários podem ver suas próprias denúncias
- Admins podem gerenciar todas as denúncias

### Funcionalidades
- Prevenção de denúncias duplicadas (mesmo usuário, mesmo comentário)
- Função para contar denúncias pendentes de um comentário
- Triggers automáticos para atualizar timestamps

## 3. Como Usar

### No Frontend
- Botão "Denunciar" em cada comentário
- Modal com opções de motivos
- Feedback visual após denúncia
- Prevenção de denúncias duplicadas

### Para Admins
- Dashboard para revisar denúncias
- Ações: aprovar, rejeitar, resolver
- Histórico de denúncias

## 4. Próximos Passos

1. Execute o SQL no Supabase
2. Teste as funcionalidades no app
3. Configure notificações para admins (opcional)
4. Implemente dashboard admin (opcional)

## 5. Considerações de Segurança

- RLS habilitado para proteger dados
- Validação de motivos no banco
- Prevenção de spam de denúncias
- Logs de auditoria automáticos