# Guia de Configuração das Estatísticas do Usuário

Este guia explica como configurar o sistema de estatísticas automáticas do usuário no banco de dados Supabase.

## Problema Identificado

As estatísticas dos usuários não estavam sendo atualizadas automaticamente quando:
- Usuários adicionavam/removiam dramas das listas
- Usuários completavam dramas
- Usuários faziam alterações em suas listas

## Solução Implementada

Criamos um sistema completo de triggers e funções que mantém as estatísticas sempre atualizadas automaticamente.

## Scripts SQL para Executar

Execute os seguintes scripts SQL no seu banco de dados Supabase na ordem apresentada:

### 1. Script de Triggers de Estatísticas (OBRIGATÓRIO)

Execute o arquivo `database/user-stats-triggers.sql` no SQL Editor do Supabase.

Este script:
- Cria funções para recalcular estatísticas automaticamente
- Adiciona triggers que são executados quando listas de dramas são modificadas
- Inicializa as estatísticas para todos os usuários existentes
- Mantém as estatísticas sempre atualizadas

### 2. Script de Compartilhamento de Conclusão (JÁ EXECUTADO)

O arquivo `database/completion-sharing-schema.sql` já deve ter sido executado anteriormente, mas se não foi, execute-o também.

## Como Executar os Scripts

1. Acesse o painel do Supabase
2. Vá para "SQL Editor"
3. Cole o conteúdo do arquivo `database/user-stats-triggers.sql`
4. Execute o script
5. Verifique se não há erros

## Funcionalidades Implementadas

### Backend (tRPC)

Adicionamos as seguintes rotas:

- `trpc.users.getStats` - Busca estatísticas completas do usuário
- `trpc.users.updateStats` - Atualiza estatísticas manualmente (para debug)

### Frontend

- Componente `UserStatsDisplay` que mostra estatísticas em tempo real
- Integração na tela de perfil para visualizar as estatísticas
- Botão para atualizar estatísticas manualmente

### Triggers Automáticos

O sistema agora atualiza automaticamente:

1. **Contadores de listas**: Quando dramas são adicionados/removidos
2. **Tempo total assistido**: Quando dramas são completados
3. **Estatísticas mensais/anuais**: Baseado nas conclusões
4. **Dados de atores favoritos**: Baseado nos dramas assistidos

## Testando o Sistema

1. Execute os scripts SQL
2. Adicione/remova dramas das suas listas
3. Complete alguns dramas
4. Verifique se as estatísticas são atualizadas automaticamente
5. Use o botão "Atualizar" no componente de estatísticas se necessário

## Verificação

Para verificar se está funcionando:

1. Vá para a tela de Perfil
2. Você deve ver o componente "Estatísticas" com dados atualizados
3. As contagens devem corresponder aos dramas nas suas listas
4. O tempo total deve refletir os dramas completados

## Estrutura das Estatísticas

As estatísticas incluem:

- **Tempo Total**: Minutos assistidos (calculado dos dramas completados)
- **Dramas Completados**: Contagem de dramas na lista "completed"
- **Dramas Assistindo**: Contagem de dramas na lista "watching"  
- **Dramas na Watchlist**: Contagem de dramas na lista "watchlist"
- **Duração Média**: Tempo médio por drama
- **Primeira/Última Conclusão**: Datas das conclusões
- **Estatísticas Mensais**: Tempo assistido por mês
- **Ator Favorito**: Baseado nos dramas assistidos

## Troubleshooting

Se as estatísticas não estiverem atualizando:

1. Verifique se os scripts SQL foram executados sem erros
2. Use o botão "Atualizar" no componente de estatísticas
3. Verifique os logs do console para erros
4. Confirme se o usuário tem dados na tabela `user_stats`

## Próximos Passos

Com este sistema implementado, você pode:

1. Criar uma tela dedicada de estatísticas mais detalhada
2. Adicionar gráficos e visualizações
3. Implementar conquistas baseadas nas estatísticas
4. Criar relatórios de progresso do usuário