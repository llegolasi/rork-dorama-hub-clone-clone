-- =====================================================
-- DISCOVER SCREEN IMPROVEMENTS
-- =====================================================
-- Tabelas para melhorar a funcionalidade da tela de descobrir

-- =====================================================
-- TABELA PARA DRAMAS PULADOS (SKIPPED)
-- =====================================================

-- Tabela para armazenar dramas que o usuário pulou
CREATE TABLE public.user_skipped_dramas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    skipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- Drama reaparece após 7 dias
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drama_id)
);

-- Índices para performance
CREATE INDEX idx_user_skipped_dramas_user_id ON public.user_skipped_dramas(user_id);
CREATE INDEX idx_user_skipped_dramas_drama_id ON public.user_skipped_dramas(drama_id);
CREATE INDEX idx_user_skipped_dramas_expires_at ON public.user_skipped_dramas(expires_at);

-- =====================================================
-- TABELA PARA CONTROLE DE SWIPES DIÁRIOS
-- =====================================================

-- Tabela para controlar swipes diários no banco de dados
CREATE TABLE public.user_daily_swipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    swipe_date DATE DEFAULT CURRENT_DATE NOT NULL,
    swipes_used INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 20,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, swipe_date)
);

-- Índices para performance
CREATE INDEX idx_user_daily_swipes_user_id ON public.user_daily_swipes(user_id);
CREATE INDEX idx_user_daily_swipes_date ON public.user_daily_swipes(swipe_date);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.user_skipped_dramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_swipes ENABLE ROW LEVEL SECURITY;

-- Políticas para user_skipped_dramas
CREATE POLICY "Users can manage own skipped dramas"
ON public.user_skipped_dramas
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para user_daily_swipes
CREATE POLICY "Users can manage own daily swipes"
ON public.user_daily_swipes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at na tabela user_daily_swipes
CREATE TRIGGER update_user_daily_swipes_updated_at 
BEFORE UPDATE ON public.user_daily_swipes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para limpar dramas pulados expirados
CREATE OR REPLACE FUNCTION clean_expired_skipped_dramas()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_skipped_dramas 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter dramas disponíveis para descobrir (excluindo os que estão nas listas e os pulados)
CREATE OR REPLACE FUNCTION get_available_dramas_for_discover(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    drama_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT dc.id as drama_id
    FROM public.drama_cache dc
    WHERE dc.id NOT IN (
        -- Excluir dramas que já estão nas listas do usuário
        SELECT udl.drama_id 
        FROM public.user_drama_lists udl 
        WHERE udl.user_id = user_uuid
    )
    AND dc.id NOT IN (
        -- Excluir dramas pulados que ainda não expiraram
        SELECT usd.drama_id 
        FROM public.user_skipped_dramas usd 
        WHERE usd.user_id = user_uuid 
        AND usd.expires_at > NOW()
    )
    ORDER BY RANDOM()
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de swipes diários
CREATE OR REPLACE FUNCTION increment_daily_swipes(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    current_swipes INTEGER;
    daily_limit INTEGER;
    is_premium BOOLEAN;
    result JSONB;
BEGIN
    -- Verificar se o usuário é premium
    SELECT CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
        ELSE false 
    END INTO is_premium
    FROM public.premium_subscriptions ps
    WHERE ps.user_id = user_uuid;
    
    -- Se não encontrou registro de premium, assumir que não é premium
    is_premium := COALESCE(is_premium, false);
    
    -- Inserir ou atualizar registro de swipes diários
    INSERT INTO public.user_daily_swipes (user_id, swipe_date, swipes_used, is_premium)
    VALUES (user_uuid, CURRENT_DATE, 1, is_premium)
    ON CONFLICT (user_id, swipe_date)
    DO UPDATE SET 
        swipes_used = user_daily_swipes.swipes_used + 1,
        is_premium = EXCLUDED.is_premium,
        updated_at = NOW()
    RETURNING swipes_used, daily_limit INTO current_swipes, daily_limit;
    
    -- Verificar se pode continuar fazendo swipes
    IF is_premium OR current_swipes <= daily_limit THEN
        result := jsonb_build_object(
            'success', true,
            'swipes_used', current_swipes,
            'daily_limit', daily_limit,
            'remaining_swipes', CASE WHEN is_premium THEN -1 ELSE daily_limit - current_swipes END,
            'is_premium', is_premium
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'swipes_used', current_swipes,
            'daily_limit', daily_limit,
            'remaining_swipes', 0,
            'is_premium', is_premium,
            'message', 'Limite diário de swipes atingido'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter status atual de swipes diários
CREATE OR REPLACE FUNCTION get_daily_swipes_status(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    current_swipes INTEGER := 0;
    daily_limit INTEGER := 20;
    is_premium BOOLEAN;
    result JSONB;
BEGIN
    -- Verificar se o usuário é premium
    SELECT CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
        ELSE false 
    END INTO is_premium
    FROM public.premium_subscriptions ps
    WHERE ps.user_id = user_uuid;
    
    -- Se não encontrou registro de premium, assumir que não é premium
    is_premium := COALESCE(is_premium, false);
    
    -- Obter swipes usados hoje
    SELECT COALESCE(uds.swipes_used, 0), COALESCE(uds.daily_limit, 20)
    INTO current_swipes, daily_limit
    FROM public.user_daily_swipes uds
    WHERE uds.user_id = user_uuid AND uds.swipe_date = CURRENT_DATE;
    
    result := jsonb_build_object(
        'swipes_used', current_swipes,
        'daily_limit', daily_limit,
        'remaining_swipes', CASE WHEN is_premium THEN -1 ELSE daily_limit - current_swipes END,
        'can_swipe', is_premium OR current_swipes < daily_limit,
        'is_premium', is_premium
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

-- Esta extensão do schema adiciona:
-- 1. Tabela user_skipped_dramas para armazenar dramas pulados temporariamente
-- 2. Tabela user_daily_swipes para controlar limite diário de swipes no banco
-- 3. Funções para gerenciar dramas disponíveis para descobrir
-- 4. Funções para controlar swipes diários
-- 5. Limpeza automática de dramas pulados expirados
-- 6. Políticas de segurança apropriadas

-- Para usar:
-- 1. Execute este SQL no Supabase
-- 2. Atualize o hook useSwipeLimit para usar as funções do banco
-- 3. Atualize a tela de descobrir para usar get_available_dramas_for_discover
-- 4. Configure um cron job para executar clean_expired_skipped_dramas diariamente