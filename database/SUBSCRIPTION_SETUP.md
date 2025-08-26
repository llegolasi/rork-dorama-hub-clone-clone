# Subscription Plans Setup Guide

Este guia explica como configurar o sistema de assinaturas do Dorama+.

## 1. Executar o Schema SQL

Execute o arquivo `subscription-plans-schema.sql` no seu banco de dados Supabase:

```sql
-- Execute o conteúdo do arquivo subscription-plans-schema.sql
```

## 2. Estrutura das Tabelas

### subscription_plans
- `id`: UUID único do plano
- `name`: Nome do plano (ex: "Dorama+ Mensal")
- `description`: Descrição do plano
- `price`: Preço em decimal
- `currency`: Moeda (padrão: BRL)
- `duration_months`: Duração em meses
- `features`: Array JSON com as funcionalidades
- `is_popular`: Se é o plano mais popular
- `is_active`: Se o plano está ativo

### user_subscriptions
- `id`: UUID único da assinatura
- `user_id`: Referência ao usuário
- `plan_id`: Referência ao plano
- `status`: Status da assinatura (active, cancelled, expired, pending)
- `started_at`: Data de início
- `expires_at`: Data de expiração
- `payment_method`: Método de pagamento
- `transaction_id`: ID da transação

## 3. Funções Disponíveis

### has_active_subscription(user_uuid)
Verifica se o usuário tem uma assinatura ativa.

### get_user_subscription(user_uuid)
Retorna a assinatura atual do usuário.

## 4. Planos Padrão

O sistema vem com 3 planos pré-configurados:
- **Dorama+ Mensal**: R$ 9,90/mês
- **Dorama+ Anual**: R$ 89,90/ano (mais popular)
- **Dorama+ Premium**: R$ 19,90/mês

## 5. Segurança

- RLS (Row Level Security) habilitado
- Usuários só podem ver suas próprias assinaturas
- Planos são públicos para visualização

## 6. Próximos Passos

1. Execute o schema SQL
2. Configure os métodos de pagamento (Stripe, PayPal, etc.)
3. Implemente a lógica de renovação automática
4. Configure webhooks para atualizações de status