# 📅 Calendário de Lançamentos - Guia de Implementação

## Visão Geral

A funcionalidade de Calendário de Lançamentos permite aos usuários descobrir e acompanhar futuros lançamentos de K-dramas, com sistema de lembretes diferenciado para usuários gratuitos e premium.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`upcoming_releases`** - Armazena informações dos K-dramas com lançamento futuro
2. **`release_reminders`** - Gerencia os lembretes dos usuários
3. **`user_reminder_stats`** - Controla limites e estatísticas de lembretes

### Executar o Schema

```sql
-- Execute o arquivo releases-calendar-schema.sql no Supabase SQL Editor
-- Localização: database/releases-calendar-schema.sql
```

## 🚀 Funcionalidades Implementadas

### 1. Card na Tela Inicial
- **Localização**: `components/UpcomingReleasesCard.tsx`
- **Função**: Exibe preview dos próximos lançamentos
- **Navegação**: Leva para a tela completa do calendário

### 2. Tela do Calendário
- **Localização**: `app/releases-calendar.tsx`
- **Recursos**:
  - Lista organizada por seções (Próxima Semana, Este Mês, Próximos Meses)
  - Informações detalhadas de cada lançamento
  - Botão de lembrete (🔔) para cada drama
  - Pull-to-refresh

### 3. API Integration
- **Localização**: `services/api.ts`
- **Funções adicionadas**:
  - `getUpcomingDramas()` - Busca lançamentos futuros
  - `getUpcomingDramasPreview()` - Preview para tela inicial

## 💎 Sistema de Monetização

### Usuários Gratuitos
- **Limite**: 5 lembretes ativos simultaneamente
- **Funcionalidade**: Notificações push básicas

### Usuários Premium (Dorama Hub+)
- **Limite**: Lembretes ilimitados
- **Funcionalidades exclusivas**:
  - Integração com calendário nativo do celular
  - Lembretes avançados
  - Estatísticas detalhadas

## 🔧 Configuração Necessária

### 1. Banco de Dados
```sql
-- Execute o schema SQL
\i database/releases-calendar-schema.sql
```

### 2. Sincronização com TMDB
```javascript
// Implementar job para popular upcoming_releases
// Sugestão: Executar diariamente via cron job ou Supabase Edge Functions

const syncUpcomingReleases = async () => {
  const upcomingData = await getUpcomingDramas();
  // Salvar no banco de dados
};
```

### 3. Notificações Push
```javascript
// Implementar sistema de notificações
// Verificar lembretes próximos ao vencimento
// Enviar notificações no dia do lançamento
```

## 📱 Componentes Criados

### UpcomingReleasesCard
```typescript
// Componente para tela inicial
// Exibe preview horizontal dos próximos lançamentos
// Navegação para tela completa
```

### ReleasesCalendarScreen
```typescript
// Tela completa do calendário
// Lista organizada por seções temporais
// Sistema de lembretes integrado
```

## 🎯 Próximos Passos

### Implementações Pendentes

1. **Sistema de Lembretes Completo**
   - Integração com banco de dados
   - Verificação de limites premium/gratuito
   - Notificações push

2. **Integração com Calendário Nativo** (Premium)
   - iOS: EventKit
   - Android: Calendar Provider

3. **Sincronização Automática**
   - Job para atualizar lançamentos
   - Limpeza de lançamentos passados

4. **Estatísticas e Analytics**
   - Tracking de lembretes criados
   - Métricas de engajamento

## 🔍 Funções SQL Úteis

### Verificar se usuário pode criar lembrete
```sql
SELECT can_create_reminder('user-uuid-here');
```

### Obter lembretes do usuário
```sql
SELECT * FROM get_user_reminders('user-uuid-here');
```

### Obter lançamentos próximos
```sql
SELECT * FROM get_upcoming_releases(90); -- próximos 90 dias
```

## 📊 Views Disponíveis

- `releases_with_reminder_count` - Lançamentos com contagem de lembretes
- `user_reminder_overview` - Visão geral dos lembretes por usuário

## 🛡️ Segurança

- **RLS habilitado** em todas as tabelas
- **Políticas de acesso** configuradas
- **Validação de limites** para usuários gratuitos

## 🎨 Design System

- **Cores**: Seguindo COLORS do projeto
- **Ícones**: Lucide React Native
- **Layout**: Responsivo e acessível
- **Animações**: Suaves e performáticas

---

## 📝 Notas de Desenvolvimento

- A funcionalidade está pronta para uso básico
- Sistema de lembretes precisa ser conectado ao banco
- Notificações push requerem configuração adicional
- Integração com calendário nativo é feature premium

Para dúvidas ou suporte, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.