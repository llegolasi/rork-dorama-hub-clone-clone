-- Limpar todos os triggers da tabela user_drama_lists
-- Este script remove todos os triggers duplicados e conflitantes

-- 1. Remover todos os triggers existentes da tabela user_drama_lists
DROP TRIGGER IF EXISTS auto_calculate_watched_minutes_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS ensure_drama_list_consistency_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS set_timestamp_user_drama_lists ON user_drama_lists;
DROP TRIGGER IF EXISTS trigger_calculate_watched_minutes ON user_drama_lists;
DROP TRIGGER IF EXISTS trigger_user_drama_lists_stats ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_drama_lists_updated_at ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS update_watched_minutes_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_comprehensive_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_episode_progress_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS user_drama_lists_watched_time_trigger ON user_drama_lists;

-- 2. Remover funções desnecessárias (se existirem)
DROP FUNCTION IF EXISTS auto_calculate_watched_minutes();
DROP FUNCTION IF EXISTS calculate_watched_minutes();
DROP FUNCTION IF EXISTS update_watched_minutes();
DROP FUNCTION IF EXISTS update_episode_progress_and_stats();
DROP FUNCTION IF EXISTS update_user_stats_comprehensive();
DROP FUNCTION IF EXISTS update_user_stats_with_watched_time();

-- 3. Criar uma função simples e eficiente para calcular watched_minutes
CREATE OR REPLACE FUNCTION calculate_user_drama_watched_minutes()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT ou UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Se current_episode é NULL, definir como 0
        IF NEW.current_episode IS NULL THEN
            NEW.current_episode := 0;
        END IF;
        
        -- Se total_runtime_minutes é NULL ou 0, buscar do drama
        IF NEW.total_runtime_minutes IS NULL OR NEW.total_runtime_minutes = 0 THEN
            SELECT COALESCE(runtime, 0) * COALESCE(total_episodes, 1)
            INTO NEW.total_runtime_minutes
            FROM dramas 
            WHERE id = NEW.drama_id;
            
            -- Se ainda for NULL, definir como 0
            IF NEW.total_runtime_minutes IS NULL THEN
                NEW.total_runtime_minutes := 0;
            END IF;
        END IF;
        
        -- Calcular watched_minutes baseado no current_episode
        IF NEW.total_episodes > 0 AND NEW.total_runtime_minutes > 0 THEN
            NEW.watched_minutes := ROUND((NEW.current_episode::DECIMAL / NEW.total_episodes::DECIMAL) * NEW.total_runtime_minutes);
        ELSE
            NEW.watched_minutes := 0;
        END IF;
        
        -- Se list_type é 'completed', marcar todos os episódios como assistidos
        IF NEW.list_type = 'completed' THEN
            NEW.current_episode := NEW.total_episodes;
            NEW.watched_minutes := NEW.total_runtime_minutes;
        END IF;
        
        -- Atualizar updated_at
        NEW.updated_at := NOW();
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger simples para BEFORE INSERT/UPDATE
CREATE TRIGGER user_drama_lists_calculate_trigger
    BEFORE INSERT OR UPDATE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION calculate_user_drama_watched_minutes();

-- 5. Manter apenas o trigger de estatísticas (AFTER)
CREATE TRIGGER user_drama_lists_update_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_stats();

-- 6. Atualizar registros existentes para corrigir dados
UPDATE user_drama_lists 
SET 
    current_episode = CASE 
        WHEN current_episode IS NULL AND list_type = 'watchlist' THEN 0
        WHEN current_episode IS NULL AND list_type = 'completed' THEN total_episodes
        ELSE current_episode 
    END,
    total_runtime_minutes = CASE 
        WHEN total_runtime_minutes IS NULL OR total_runtime_minutes = 0 THEN 
            (SELECT COALESCE(runtime, 0) * COALESCE(total_episodes, 1) FROM dramas WHERE id = user_drama_lists.drama_id)
        ELSE total_runtime_minutes 
    END
WHERE current_episode IS NULL OR total_runtime_minutes IS NULL OR total_runtime_minutes = 0;

-- 7. Recalcular watched_minutes para todos os registros
UPDATE user_drama_lists 
SET watched_minutes = CASE 
    WHEN list_type = 'completed' THEN total_runtime_minutes
    WHEN total_episodes > 0 AND total_runtime_minutes > 0 THEN 
        ROUND((current_episode::DECIMAL / total_episodes::DECIMAL) * total_runtime_minutes)
    ELSE 0 
END;

-- 8. Verificar se há registros com problemas
SELECT 
    id,
    drama_name,
    list_type,
    current_episode,
    total_episodes,
    total_runtime_minutes,
    watched_minutes
FROM user_drama_lists 
WHERE 
    (current_episode IS NULL AND list_type != 'watchlist') OR
    (total_runtime_minutes IS NULL OR total_runtime_minutes = 0) OR
    (list_type = 'completed' AND watched_minutes != total_runtime_minutes)
ORDER BY updated_at DESC
LIMIT 10;