-- Correção completa do sistema de episódios e estatísticas
-- Este arquivo corrige todos os problemas identificados

-- 1. Garantir que a estrutura da tabela está correta
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS episodes_watched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- 2. Corrigir current_episode para nunca ser NULL
UPDATE user_drama_lists 
SET current_episode = 0 
WHERE current_episode IS NULL;

-- 3. Garantir que total_runtime_minutes seja calculado corretamente
-- Para dramas sem runtime, estimar 60 minutos por episódio
UPDATE user_drama_lists 
SET total_runtime_minutes = COALESCE(total_episodes, 16) * 60
WHERE total_runtime_minutes IS NULL OR total_runtime_minutes = 0;

-- 4. Corrigir episodes_watched baseado no current_episode
UPDATE user_drama_lists 
SET episodes_watched = COALESCE(current_episode, 0)
WHERE episodes_watched != COALESCE(current_episode, 0) OR episodes_watched IS NULL;

-- 5. Calcular watched_minutes corretamente
UPDATE user_drama_lists 
SET watched_minutes = CASE 
    WHEN list_type = 'completed' THEN COALESCE(total_runtime_minutes, 0)
    WHEN list_type = 'watching' THEN 
        CASE 
            WHEN COALESCE(total_episodes, 1) > 0 THEN
                ROUND((COALESCE(current_episode, 0)::FLOAT / COALESCE(total_episodes, 1)::FLOAT) * COALESCE(total_runtime_minutes, 0))
            ELSE 0
        END
    ELSE 0
END;

-- 6. Criar função melhorada para atualizar estatísticas
CREATE OR REPLACE FUNCTION update_user_stats_from_lists(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_watch_time INTEGER;
    v_dramas_completed INTEGER;
    v_dramas_watching INTEGER;
    v_dramas_in_watchlist INTEGER;
BEGIN
    -- Calcular tempo total assistido (soma de watched_minutes)
    SELECT COALESCE(SUM(watched_minutes), 0) INTO v_total_watch_time
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

-- 7. Criar trigger para atualizar estatísticas automaticamente
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
    
    EXCEPTION WHEN OTHERS THEN
        -- Log do erro mas não falha a operação principal
        RAISE WARNING 'Erro ao atualizar estatísticas do usuário: %', SQLERRM;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Recriar o trigger
DROP TRIGGER IF EXISTS update_user_stats_trigger ON user_drama_lists;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_stats();

-- 9. Função para obter estatísticas completas
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Primeiro, garantir que as estatísticas estão atualizadas
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
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Função pública para atualizar estatísticas
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM update_user_stats_from_lists(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- 11. Atualizar todas as estatísticas existentes
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
        PERFORM update_user_stats_from_lists(user_record.user_id);
    END LOOP;
END;
$$;

-- 12. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_user_list_type ON user_drama_lists(user_id, list_type);
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_updated_at ON user_drama_lists(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 13. Comentários
COMMENT ON COLUMN user_drama_lists.episodes_watched IS 'Número de episódios assistidos (igual ao current_episode)';
COMMENT ON COLUMN user_drama_lists.watched_minutes IS 'Total de minutos assistidos baseado nos episódios';
COMMENT ON COLUMN user_drama_lists.current_episode IS 'Episódio atual (nunca NULL, 0 para watchlist)';
COMMENT ON COLUMN user_drama_lists.total_runtime_minutes IS 'Tempo total do drama em minutos';

-- Fim das correções