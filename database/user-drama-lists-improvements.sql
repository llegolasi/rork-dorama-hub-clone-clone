-- Melhorias na tabela user_drama_lists para usar apenas ela para estatísticas
-- Este arquivo contém todas as modificações necessárias para o funcionamento correto

-- 1. Adicionar campos necessários se não existirem
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS episodes_watched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- 2. Atualizar current_episode para 0 quando for NULL em watchlist
UPDATE user_drama_lists 
SET current_episode = 0 
WHERE list_type = 'watchlist' AND current_episode IS NULL;

-- 3. Atualizar current_episode para 0 quando for NULL em watching
UPDATE user_drama_lists 
SET current_episode = 0 
WHERE list_type = 'watching' AND current_episode IS NULL;

-- 4. Garantir que total_runtime_minutes não seja NULL
UPDATE user_drama_lists 
SET total_runtime_minutes = COALESCE(total_runtime_minutes, total_episodes * 60)
WHERE total_runtime_minutes IS NULL OR total_runtime_minutes = 0;

-- 5. Atualizar episodes_watched baseado no current_episode
UPDATE user_drama_lists 
SET episodes_watched = COALESCE(current_episode, 0)
WHERE episodes_watched IS NULL OR episodes_watched = 0;

-- 6. Calcular watched_minutes baseado nos episódios assistidos
UPDATE user_drama_lists 
SET watched_minutes = CASE 
    WHEN list_type = 'completed' THEN total_runtime_minutes
    WHEN list_type = 'watching' THEN 
        ROUND((COALESCE(current_episode, 0)::FLOAT / COALESCE(total_episodes, 1)::FLOAT) * COALESCE(total_runtime_minutes, 0))
    ELSE 0
END
WHERE watched_minutes IS NULL OR watched_minutes = 0;

-- 7. Criar função para atualizar estatísticas do usuário baseado apenas em user_drama_lists
CREATE OR REPLACE FUNCTION update_user_stats_from_lists(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_watch_time INTEGER;
    v_dramas_completed INTEGER;
    v_dramas_watching INTEGER;
    v_dramas_in_watchlist INTEGER;
BEGIN
    -- Calcular tempo total assistido
    SELECT COALESCE(SUM(
        CASE 
            WHEN list_type = 'completed' THEN total_runtime_minutes
            WHEN list_type = 'watching' THEN watched_minutes
            ELSE 0
        END
    ), 0) INTO v_total_watch_time
    FROM user_drama_lists
    WHERE user_id = p_user_id;
    
    -- Contar dramas por categoria
    SELECT 
        COUNT(*) FILTER (WHERE list_type = 'completed'),
        COUNT(*) FILTER (WHERE list_type = 'watching'),
        COUNT(*) FILTER (WHERE list_type = 'watchlist')
    INTO v_dramas_completed, v_dramas_watching, v_dramas_in_watchlist
    FROM user_drama_lists
    WHERE user_id = p_user_id;
    
    -- Atualizar ou inserir estatísticas do usuário
    INSERT INTO user_stats (
        user_id,
        total_watch_time_minutes,
        dramas_completed,
        dramas_watching,
        dramas_in_watchlist,
        updated_at
    ) VALUES (
        p_user_id,
        v_total_watch_time,
        v_dramas_completed,
        v_dramas_watching,
        v_dramas_in_watchlist,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
        dramas_completed = EXCLUDED.dramas_completed,
        dramas_watching = EXCLUDED.dramas_watching,
        dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar estatísticas automaticamente
CREATE OR REPLACE FUNCTION trigger_update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar estatísticas para o usuário afetado
    IF TG_OP = 'DELETE' THEN
        PERFORM update_user_stats_from_lists(OLD.user_id);
        RETURN OLD;
    ELSE
        PERFORM update_user_stats_from_lists(NEW.user_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar o trigger na tabela user_drama_lists
DROP TRIGGER IF EXISTS update_user_stats_trigger ON user_drama_lists;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_stats();

-- 10. Atualizar estatísticas para todos os usuários existentes
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
        PERFORM update_user_stats_from_lists(user_record.user_id);
    END LOOP;
END;
$$;

-- 11. Criar função para obter estatísticas completas do usuário
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user_id', p_user_id,
        'total_watch_time_minutes', COALESCE(us.total_watch_time_minutes, 0),
        'dramas_completed', COALESCE(us.dramas_completed, 0),
        'dramas_watching', COALESCE(us.dramas_watching, 0),
        'dramas_in_watchlist', COALESCE(us.dramas_in_watchlist, 0),
        'average_drama_runtime', 
            CASE 
                WHEN COALESCE(us.dramas_completed, 0) > 0 
                THEN COALESCE(us.total_watch_time_minutes, 0)::FLOAT / us.dramas_completed
                ELSE 0
            END,
        'first_completion_date', (
            SELECT MIN(updated_at) 
            FROM user_drama_lists 
            WHERE user_id = p_user_id AND list_type = 'completed'
        ),
        'latest_completion_date', (
            SELECT MAX(updated_at) 
            FROM user_drama_lists 
            WHERE user_id = p_user_id AND list_type = 'completed'
        ),
        'monthly_watch_time', COALESCE(us.monthly_watch_time, '{}'::jsonb),
        'favorite_genres', COALESCE(us.favorite_genres, '{}'::jsonb),
        'yearly_watch_time', COALESCE(us.yearly_watch_time, '{}'::jsonb),
        'favorite_actor_id', us.favorite_actor_id,
        'favorite_actor_name', us.favorite_actor_name,
        'favorite_actor_works_watched', COALESCE(us.favorite_actor_works_watched, 0),
        'created_at', COALESCE(us.created_at, NOW()),
        'updated_at', COALESCE(us.updated_at, NOW())
    ) INTO result
    FROM user_stats us
    WHERE us.user_id = p_user_id;
    
    -- Se não existir registro, criar um padrão
    IF result IS NULL THEN
        PERFORM update_user_stats_from_lists(p_user_id);
        
        SELECT json_build_object(
            'user_id', p_user_id,
            'total_watch_time_minutes', COALESCE(us.total_watch_time_minutes, 0),
            'dramas_completed', COALESCE(us.dramas_completed, 0),
            'dramas_watching', COALESCE(us.dramas_watching, 0),
            'dramas_in_watchlist', COALESCE(us.dramas_in_watchlist, 0),
            'average_drama_runtime', 
                CASE 
                    WHEN COALESCE(us.dramas_completed, 0) > 0 
                    THEN COALESCE(us.total_watch_time_minutes, 0)::FLOAT / us.dramas_completed
                    ELSE 0
                END,
            'first_completion_date', (
                SELECT MIN(updated_at) 
                FROM user_drama_lists 
                WHERE user_id = p_user_id AND list_type = 'completed'
            ),
            'latest_completion_date', (
                SELECT MAX(updated_at) 
                FROM user_drama_lists 
                WHERE user_id = p_user_id AND list_type = 'completed'
            ),
            'monthly_watch_time', '{}'::json,
            'favorite_genres', '{}'::json,
            'yearly_watch_time', '{}'::json,
            'favorite_actor_id', NULL,
            'favorite_actor_name', NULL,
            'favorite_actor_works_watched', 0,
            'created_at', NOW(),
            'updated_at', NOW()
        ) INTO result
        FROM user_stats us
        WHERE us.user_id = p_user_id;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 12. Criar função para atualizar estatísticas manualmente
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM update_user_stats_from_lists(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- 13. Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_user_list_type ON user_drama_lists(user_id, list_type);
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_updated_at ON user_drama_lists(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 14. Comentários para documentação
COMMENT ON COLUMN user_drama_lists.episodes_watched IS 'Número de episódios assistidos pelo usuário';
COMMENT ON COLUMN user_drama_lists.watched_minutes IS 'Total de minutos assistidos baseado nos episódios';
COMMENT ON FUNCTION update_user_stats_from_lists(UUID) IS 'Atualiza as estatísticas do usuário baseado apenas na tabela user_drama_lists';
COMMENT ON FUNCTION get_user_comprehensive_stats(UUID) IS 'Retorna estatísticas completas do usuário em formato JSON';
COMMENT ON FUNCTION update_user_statistics(UUID) IS 'Função pública para atualizar estatísticas manualmente';

-- Fim do arquivo de melhorias