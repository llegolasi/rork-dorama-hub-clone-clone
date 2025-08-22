-- =====================================================
-- SISTEMA DE TIPOS DE USUÁRIOS - DORAMA HUB
-- =====================================================
-- Este arquivo implementa o sistema completo de tipos de usuários:
-- 1. Usuários normais (gratuitos)
-- 2. Usuários premium (VIP)
-- 3. Perfil oficial (verificado)

-- =====================================================
-- ENUM PARA TIPOS DE USUÁRIO
-- =====================================================

-- Criar enum para tipos de usuário
CREATE TYPE user_type_enum AS ENUM ('normal', 'premium', 'official');

-- =====================================================
-- TABELA DE AVATAR BORDERS
-- =====================================================

-- Tabela para definir as bordas de avatar disponíveis
CREATE TABLE public.avatar_borders (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'exclusive')),
    is_premium_only BOOLEAN DEFAULT FALSE,
    is_official_only BOOLEAN DEFAULT FALSE,
    unlock_requirement JSONB, -- Requisitos para desbloquear (conquistas, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE SELOS/BADGES
-- =====================================================

-- Tabela para definir os selos disponíveis
CREATE TABLE public.user_badges (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10) NOT NULL,
    color VARCHAR(7) NOT NULL, -- Cor hex
    type VARCHAR(20) NOT NULL CHECK (type IN ('vip', 'verified', 'special')),
    is_premium_only BOOLEAN DEFAULT FALSE,
    is_official_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ATUALIZAR TABELA DE USUÁRIOS
-- =====================================================

-- Adicionar campos para tipos de usuário na tabela users
ALTER TABLE public.users 
ADD COLUMN user_type user_type_enum DEFAULT 'normal',
ADD COLUMN current_avatar_border VARCHAR(50) REFERENCES public.avatar_borders(id),
ADD COLUMN current_badge VARCHAR(50) REFERENCES public.user_badges(id),
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_type VARCHAR(20) CHECK (verification_type IN ('official', 'premium', 'special')),
ADD COLUMN premium_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN daily_swipe_limit INTEGER DEFAULT 20;

-- =====================================================
-- TABELA DE BORDAS DESBLOQUEADAS PELO USUÁRIO
-- =====================================================

-- Tabela para rastrear quais bordas cada usuário desbloqueou
CREATE TABLE public.user_unlocked_borders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    border_id VARCHAR(50) REFERENCES public.avatar_borders(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unlock_method VARCHAR(50), -- 'achievement', 'premium', 'purchase', etc
    UNIQUE(user_id, border_id)
);

-- =====================================================
-- TABELA DE BADGES DESBLOQUEADOS PELO USUÁRIO
-- =====================================================

-- Tabela para rastrear quais badges cada usuário possui
CREATE TABLE public.user_unlocked_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    badge_id VARCHAR(50) REFERENCES public.user_badges(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unlock_method VARCHAR(50), -- 'premium', 'official', 'special', etc
    UNIQUE(user_id, badge_id)
);

-- =====================================================
-- ATUALIZAR TABELA DE CONQUISTAS
-- =====================================================

-- Adicionar campo para bordas que são desbloqueadas por conquistas
ALTER TABLE public.achievements 
ADD COLUMN unlocks_border VARCHAR(50) REFERENCES public.avatar_borders(id);

-- =====================================================
-- FUNÇÕES PARA GERENCIAR TIPOS DE USUÁRIO
-- =====================================================

-- Função para promover usuário para premium
CREATE OR REPLACE FUNCTION promote_user_to_premium(user_uuid UUID, subscription_months INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calcular data de expiração
    expires_date := NOW() + (subscription_months || ' months')::INTERVAL;
    
    -- Atualizar usuário para premium
    UPDATE public.users 
    SET 
        user_type = 'premium',
        premium_expires_at = expires_date,
        daily_swipe_limit = 50,
        verification_type = 'premium'
    WHERE id = user_uuid;
    
    -- Desbloquear badge VIP
    INSERT INTO public.user_unlocked_badges (user_id, badge_id, unlock_method)
    VALUES (user_uuid, 'vip', 'premium')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    
    -- Atualizar badge atual se não tiver um
    UPDATE public.users 
    SET current_badge = 'vip'
    WHERE id = user_uuid AND current_badge IS NULL;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para promover usuário para oficial
CREATE OR REPLACE FUNCTION promote_user_to_official(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Atualizar usuário para oficial
    UPDATE public.users 
    SET 
        user_type = 'official',
        is_verified = TRUE,
        verification_type = 'official',
        daily_swipe_limit = 999999 -- Sem limite para oficial
    WHERE id = user_uuid;
    
    -- Desbloquear badge verificado
    INSERT INTO public.user_unlocked_badges (user_id, badge_id, unlock_method)
    VALUES (user_uuid, 'verified', 'official')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    
    -- Desbloquear todas as bordas exclusivas oficiais
    INSERT INTO public.user_unlocked_borders (user_id, border_id, unlock_method)
    SELECT user_uuid, id, 'official'
    FROM public.avatar_borders 
    WHERE is_official_only = TRUE
    ON CONFLICT (user_id, border_id) DO NOTHING;
    
    -- Atualizar badge atual
    UPDATE public.users 
    SET current_badge = 'verified'
    WHERE id = user_uuid;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se premium expirou
CREATE OR REPLACE FUNCTION check_premium_expiration()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Rebaixar usuários premium expirados
    UPDATE public.users 
    SET 
        user_type = 'normal',
        premium_expires_at = NULL,
        daily_swipe_limit = 20,
        verification_type = NULL,
        current_badge = NULL
    WHERE 
        user_type = 'premium' 
        AND premium_expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Remover badges VIP de usuários expirados
    DELETE FROM public.user_unlocked_badges 
    WHERE badge_id = 'vip' 
    AND user_id IN (
        SELECT id FROM public.users 
        WHERE user_type = 'normal' AND premium_expires_at IS NULL
    );
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para desbloquear borda por conquista
CREATE OR REPLACE FUNCTION unlock_border_by_achievement(user_uuid UUID, achievement_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    border_to_unlock VARCHAR(50);
BEGIN
    -- Buscar se a conquista desbloqueia uma borda
    SELECT unlocks_border INTO border_to_unlock
    FROM public.achievements 
    WHERE id = achievement_id;
    
    -- Se não desbloqueia borda, retornar
    IF border_to_unlock IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Desbloquear a borda
    INSERT INTO public.user_unlocked_borders (user_id, border_id, unlock_method)
    VALUES (user_uuid, border_to_unlock, 'achievement')
    ON CONFLICT (user_id, border_id) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar limite de rankings baseado no tipo de usuário
CREATE OR REPLACE FUNCTION get_user_ranking_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_type_val user_type_enum;
    ranking_count INTEGER;
BEGIN
    -- Buscar tipo do usuário
    SELECT user_type INTO user_type_val
    FROM public.users 
    WHERE id = user_uuid;
    
    -- Contar rankings atuais
    SELECT COUNT(*) INTO ranking_count
    FROM public.user_rankings 
    WHERE user_id = user_uuid;
    
    -- Retornar limite baseado no tipo
    CASE user_type_val
        WHEN 'normal' THEN 
            RETURN 3;
        WHEN 'premium' THEN 
            RETURN 999999; -- Sem limite para premium
        WHEN 'official' THEN 
            RETURN 999999; -- Sem limite para oficial
        ELSE 
            RETURN 3;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para desbloquear bordas quando conquistas são obtidas
CREATE OR REPLACE FUNCTION trigger_unlock_border_on_achievement()
RETURNS TRIGGER AS $$
BEGIN
    -- Tentar desbloquear borda pela conquista
    PERFORM unlock_border_by_achievement(NEW.user_id, NEW.achievement_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unlock_border_on_achievement_trigger
    AFTER INSERT ON public.user_achievements
    FOR EACH ROW EXECUTE FUNCTION trigger_unlock_border_on_achievement();

-- =====================================================
-- VIEWS ATUALIZADAS
-- =====================================================

-- Atualizar view de perfis com informações de tipo de usuário
DROP VIEW IF EXISTS public.user_profiles_with_stats;
CREATE VIEW public.user_profiles_with_stats AS
SELECT 
    u.*,
    us.total_watch_time_minutes,
    us.dramas_completed,
    us.dramas_watching,
    us.dramas_in_watchlist,
    us.favorite_genres,
    -- Informações de tipo de usuário
    u.user_type,
    u.is_verified,
    u.verification_type,
    u.premium_expires_at,
    u.daily_swipe_limit,
    -- Badge atual
    ub.name as current_badge_name,
    ub.icon as current_badge_icon,
    ub.color as current_badge_color,
    -- Borda atual
    ab.name as current_border_name,
    ab.image_url as current_border_image,
    ab.rarity as current_border_rarity,
    -- Status premium
    CASE 
        WHEN u.user_type = 'premium' AND u.premium_expires_at > NOW() THEN true
        WHEN u.user_type = 'official' THEN true
        ELSE false 
    END as is_premium_active
FROM public.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
LEFT JOIN public.user_badges ub ON u.current_badge = ub.id
LEFT JOIN public.avatar_borders ab ON u.current_avatar_border = ab.id;

-- View para bordas desbloqueadas do usuário
CREATE VIEW public.user_available_borders AS
SELECT 
    u.id as user_id,
    ab.*,
    uub.unlocked_at,
    uub.unlock_method,
    CASE WHEN u.current_avatar_border = ab.id THEN true ELSE false END as is_current
FROM public.users u
JOIN public.user_unlocked_borders uub ON u.id = uub.user_id
JOIN public.avatar_borders ab ON uub.border_id = ab.id
ORDER BY ab.rarity, ab.name;

-- View para badges desbloqueados do usuário
CREATE VIEW public.user_available_badges AS
SELECT 
    u.id as user_id,
    ub.*,
    uub.unlocked_at,
    uub.unlock_method,
    CASE WHEN u.current_badge = ub.id THEN true ELSE false END as is_current
FROM public.users u
JOIN public.user_unlocked_badges uub ON u.id = uub.user_id
JOIN public.user_badges ub ON uub.badge_id = ub.id
ORDER BY ub.type, ub.name;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir badges padrão
INSERT INTO public.user_badges (id, name, description, icon, color, type, is_premium_only, is_official_only) VALUES
('vip', 'VIP', 'Usuário Premium', '👑', '#FFD700', 'vip', true, false),
('verified', 'Verificado', 'Conta Oficial Verificada', '✅', '#1DA1F2', 'verified', false, true),
('founder', 'Fundador', 'Membro Fundador', '🏆', '#FF6B35', 'special', false, false),
('beta', 'Beta Tester', 'Testador Beta', '🧪', '#9B59B6', 'special', false, false);

-- Inserir bordas padrão
INSERT INTO public.avatar_borders (id, name, description, image_url, rarity, is_premium_only, is_official_only) VALUES
('default', 'Padrão', 'Borda padrão', '/borders/default.png', 'common', false, false),
('gold_vip', 'Ouro VIP', 'Borda dourada para membros VIP', '/borders/gold_vip.png', 'epic', true, false),
('platinum_vip', 'Platina VIP', 'Borda de platina para membros VIP', '/borders/platinum_vip.png', 'legendary', true, false),
('official_verified', 'Oficial Verificado', 'Borda exclusiva para contas oficiais', '/borders/official.png', 'exclusive', false, true),
('diamond_official', 'Diamante Oficial', 'Borda de diamante para contas oficiais', '/borders/diamond_official.png', 'exclusive', false, true),
('first_drama_bronze', 'Bronze Iniciante', 'Borda bronze por completar primeiro drama', '/borders/bronze.png', 'common', false, false),
('marathoner_silver', 'Prata Maratonista', 'Borda prata para maratonistas', '/borders/silver.png', 'rare', false, false),
('legend_ruby', 'Rubi Lendário', 'Borda rubi para lendas da comunidade', '/borders/ruby.png', 'legendary', false, false);

-- Conectar conquistas com bordas
UPDATE public.achievements SET unlocks_border = 'first_drama_bronze' WHERE id = 'first-drama';
UPDATE public.achievements SET unlocks_border = 'marathoner_silver' WHERE id = 'marathoner-beginner';
UPDATE public.achievements SET unlocks_border = 'legend_ruby' WHERE id = 'community-legend';

-- =====================================================
-- POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.avatar_borders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_borders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para avatar_borders
CREATE POLICY "Anyone can view avatar borders" ON public.avatar_borders
    FOR SELECT USING (true);

-- Políticas para user_badges
CREATE POLICY "Anyone can view user badges" ON public.user_badges
    FOR SELECT USING (true);

-- Políticas para user_unlocked_borders
CREATE POLICY "Users can view own unlocked borders" ON public.user_unlocked_borders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user unlocked borders" ON public.user_unlocked_borders
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_unlocked_badges
CREATE POLICY "Users can view own unlocked badges" ON public.user_unlocked_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user unlocked badges" ON public.user_unlocked_badges
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para as novas tabelas
CREATE INDEX idx_users_user_type ON public.users(user_type);
CREATE INDEX idx_users_premium_expires ON public.users(premium_expires_at);
CREATE INDEX idx_users_verification ON public.users(is_verified, verification_type);
CREATE INDEX idx_user_unlocked_borders_user_id ON public.user_unlocked_borders(user_id);
CREATE INDEX idx_user_unlocked_badges_user_id ON public.user_unlocked_badges(user_id);
CREATE INDEX idx_avatar_borders_rarity ON public.avatar_borders(rarity);
CREATE INDEX idx_user_badges_type ON public.user_badges(type);

-- =====================================================
-- FUNÇÃO PARA MIGRAR USUÁRIOS EXISTENTES
-- =====================================================

-- Função para migrar usuários existentes baseado em user_subscriptions
CREATE OR REPLACE FUNCTION migrate_existing_users_to_new_system()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Migrar usuários premium baseado em user_subscriptions
    FOR user_record IN 
        SELECT DISTINCT ps.user_id, ps.expires_at
        FROM public.premium_subscriptions ps
        WHERE ps.status = 'active' AND ps.expires_at > NOW()
    LOOP
        -- Promover para premium
        PERFORM promote_user_to_premium(user_record.user_id, 
            EXTRACT(EPOCH FROM (user_record.expires_at - NOW()))/2592000); -- converter para meses
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    -- Definir usuário oficial (UUID fornecido)
    PERFORM promote_user_to_official('d3a81a4e-3919-457e-a4e4-e3b9dbdf97d6'::UUID);
    
    -- Dar borda padrão para todos os usuários que não têm
    UPDATE public.users 
    SET current_avatar_border = 'default'
    WHERE current_avatar_border IS NULL;
    
    -- Desbloquear borda padrão para todos
    INSERT INTO public.user_unlocked_borders (user_id, border_id, unlock_method)
    SELECT id, 'default', 'default'
    FROM public.users
    ON CONFLICT (user_id, border_id) DO NOTHING;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar migração
SELECT migrate_existing_users_to_new_system();

-- =====================================================
-- FUNÇÃO PARA LIMPEZA AUTOMÁTICA
-- =====================================================

-- Função para executar limpezas automáticas (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_user_system()
RETURNS JSONB AS $$
DECLARE
    expired_premium INTEGER;
    cleaned_skipped INTEGER;
    result JSONB;
BEGIN
    -- Verificar premium expirado
    SELECT check_premium_expiration() INTO expired_premium;
    
    -- Limpar dramas pulados expirados
    SELECT clean_expired_skipped_dramas() INTO cleaned_skipped;
    
    -- Retornar resultado
    result := jsonb_build_object(
        'expired_premium_users', expired_premium,
        'cleaned_skipped_dramas', cleaned_skipped,
        'cleanup_date', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.avatar_borders IS 'Bordas de avatar disponíveis no sistema';
COMMENT ON TABLE public.user_badges IS 'Badges/selos disponíveis para usuários';
COMMENT ON TABLE public.user_unlocked_borders IS 'Bordas desbloqueadas por cada usuário';
COMMENT ON TABLE public.user_unlocked_badges IS 'Badges desbloqueados por cada usuário';

COMMENT ON COLUMN public.users.user_type IS 'Tipo do usuário: normal, premium ou official';
COMMENT ON COLUMN public.users.current_avatar_border IS 'Borda de avatar atualmente em uso';
COMMENT ON COLUMN public.users.current_badge IS 'Badge atualmente em uso';
COMMENT ON COLUMN public.users.is_verified IS 'Se o usuário é verificado';
COMMENT ON COLUMN public.users.verification_type IS 'Tipo de verificação: official, premium, special';
COMMENT ON COLUMN public.users.premium_expires_at IS 'Data de expiração do premium';
COMMENT ON COLUMN public.users.daily_swipe_limit IS 'Limite diário de swipes (20 normal, 50 premium, ilimitado oficial)';

-- =====================================================
-- RESUMO DO SISTEMA
-- =====================================================

/*
SISTEMA DE TIPOS DE USUÁRIOS IMPLEMENTADO:

1. USUÁRIOS NORMAIS (normal):
   - Limite de 3 rankings
   - 20 swipes por dia
   - Acesso básico às estatísticas
   - Bordas desbloqueadas por conquistas

2. USUÁRIOS PREMIUM (premium):
   - Selo VIP dourado ao lado do nome
   - Limite ilimitado de rankings
   - 50 swipes por dia
   - Acesso a todas as estatísticas
   - Bordas exclusivas premium
   - Avatar border decorativa

3. PERFIL OFICIAL (official):
   - Selo verificado dourado
   - Swipes ilimitados
   - Rankings ilimitados
   - Bordas exclusivas oficiais
   - Acesso a todos os dados
   - Avatar border exclusiva

FUNCIONALIDADES:
- Sistema de bordas de avatar com raridades
- Sistema de badges/selos
- Desbloqueio automático por conquistas
- Migração automática de usuários existentes
- Verificação automática de premium expirado
- Views otimizadas para consultas
- Políticas de segurança RLS
- Funções para promoção de usuários

COMO USAR:
1. Execute este SQL no Supabase
2. Use as views user_profiles_with_stats para buscar perfis completos
3. Use as funções promote_user_to_premium() e promote_user_to_official()
4. Execute cleanup_user_system() periodicamente para manutenção
*/