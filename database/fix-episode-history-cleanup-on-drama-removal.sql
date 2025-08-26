-- =====================================================
-- FIX: REMOVER EPISODE_WATCH_HISTORY AO REMOVER DORAMA DA LISTA
-- =====================================================
-- Este script adiciona um trigger para remover automaticamente
-- os registros de episode_watch_history quando um dorama é removido
-- da lista do usuário (user_drama_lists)

-- Função para limpar histórico de episódios quando dorama é removido da lista
CREATE OR REPLACE FUNCTION cleanup_episode_history_on_drama_removal()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um dorama é removido da lista do usuário,
    -- remover todos os registros de episode_watch_history relacionados
    DELETE FROM episode_watch_history 
    WHERE user_id = OLD.user_id 
    AND drama_id = OLD.drama_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a limpeza quando um dorama é removido da lista
DROP TRIGGER IF EXISTS cleanup_episode_history_trigger ON user_drama_lists;

CREATE TRIGGER cleanup_episode_history_trigger
    AFTER DELETE ON user_drama_lists
    FOR EACH ROW 
    EXECUTE FUNCTION cleanup_episode_history_on_drama_removal();

-- Comentário explicativo
COMMENT ON FUNCTION cleanup_episode_history_on_drama_removal() IS 
'Remove automaticamente os registros de episode_watch_history quando um dorama é removido da lista do usuário';

COMMENT ON TRIGGER cleanup_episode_history_trigger ON user_drama_lists IS 
'Trigger que executa limpeza do histórico de episódios ao remover dorama da lista';

-- =====================================================
-- VERIFICAÇÃO E LIMPEZA DE DADOS ÓRFÃOS EXISTENTES
-- =====================================================

-- Remover registros órfãos existentes (episódios assistidos de doramas que não estão mais nas listas)
DELETE FROM episode_watch_history ewh
WHERE NOT EXISTS (
    SELECT 1 FROM user_drama_lists udl 
    WHERE udl.user_id = ewh.user_id 
    AND udl.drama_id = ewh.drama_id
);

-- Verificar quantos registros foram removidos
-- (Esta query pode ser executada após o DELETE acima para verificar)
-- SELECT COUNT(*) as registros_orfaos_removidos FROM episode_watch_history ewh
-- WHERE NOT EXISTS (
--     SELECT 1 FROM user_drama_lists udl 
--     WHERE udl.user_id = ewh.user_id 
--     AND udl.drama_id = ewh.drama_id
-- );

-- =====================================================
-- FUNÇÃO AUXILIAR PARA LIMPEZA MANUAL (OPCIONAL)
-- =====================================================

-- Função para limpeza manual de registros órfãos
CREATE OR REPLACE FUNCTION cleanup_orphaned_episode_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM episode_watch_history ewh
    WHERE NOT EXISTS (
        SELECT 1 FROM user_drama_lists udl 
        WHERE udl.user_id = ewh.user_id 
        AND udl.drama_id = ewh.drama_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_orphaned_episode_history() IS 
'Função para limpeza manual de registros órfãos de episode_watch_history';

-- =====================================================
-- TESTE DO TRIGGER (OPCIONAL - APENAS PARA VERIFICAÇÃO)
-- =====================================================

-- Para testar se o trigger está funcionando:
-- 1. Adicione um dorama à lista de um usuário
-- 2. Adicione alguns registros de episode_watch_history para esse dorama
-- 3. Remova o dorama da lista
-- 4. Verifique se os registros de episode_watch_history foram removidos automaticamente

/*
EXEMPLO DE TESTE:

-- 1. Inserir dorama na lista (substitua pelos IDs reais)
INSERT INTO user_drama_lists (user_id, drama_id, list_type, total_episodes)
VALUES ('seu-user-id', 123456, 'watching', 16);

-- 2. Inserir histórico de episódios
INSERT INTO episode_watch_history (user_id, drama_id, episode_number, watched_at)
VALUES 
    ('seu-user-id', 123456, 1, NOW()),
    ('seu-user-id', 123456, 2, NOW());

-- 3. Verificar se os registros existem
SELECT COUNT(*) FROM episode_watch_history 
WHERE user_id = 'seu-user-id' AND drama_id = 123456;

-- 4. Remover dorama da lista
DELETE FROM user_drama_lists 
WHERE user_id = 'seu-user-id' AND drama_id = 123456;

-- 5. Verificar se os registros de episódios foram removidos automaticamente
SELECT COUNT(*) FROM episode_watch_history 
WHERE user_id = 'seu-user-id' AND drama_id = 123456;
-- Deve retornar 0
*/

-- =====================================================
-- ÍNDICES PARA PERFORMANCE (SE NÃO EXISTIREM)
-- =====================================================

-- Índice para melhorar performance das consultas de limpeza
CREATE INDEX IF NOT EXISTS idx_episode_watch_history_user_drama 
ON episode_watch_history(user_id, drama_id);

-- Índice para user_drama_lists se não existir
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_user_drama 
ON user_drama_lists(user_id, drama_id);

-- =====================================================
-- RESUMO
-- =====================================================

/*
Este script implementa:

1. ✅ Trigger automático que remove episode_watch_history quando dorama é removido da lista
2. ✅ Limpeza de dados órfãos existentes
3. ✅ Função auxiliar para limpeza manual
4. ✅ Índices para melhor performance
5. ✅ Comentários e documentação

COMO FUNCIONA:
- Quando um registro é deletado de user_drama_lists
- O trigger cleanup_episode_history_trigger é executado
- A função cleanup_episode_history_on_drama_removal() remove todos os registros relacionados de episode_watch_history
- Isso mantém a integridade dos dados automaticamente

BENEFÍCIOS:
- Não há necessidade de lembrar de limpar manualmente
- Evita acúmulo de dados órfãos
- Mantém o banco de dados limpo e eficiente
- Funciona automaticamente para todas as remoções futuras
*/