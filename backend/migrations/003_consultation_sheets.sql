-- Migration: Créer la table des fiches de consultation formateur
-- Date: 2024

-- Table des fiches de consultation
CREATE TABLE IF NOT EXISTS consultation_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Informations personnelles obligatoires
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Informations de trading
    trading_style VARCHAR(100), -- Scalping, Day Trading, Swing Trading, Position Trading
    preferred_session VARCHAR(100), -- Session préférée
    years_experience INTEGER, -- Années d'expérience
    win_rate VARCHAR(50), -- Taux de réussite
    
    -- Marchés et outils
    markets_traded TEXT, -- Marchés tradés
    favorite_pairs TEXT, -- Paires favorites
    timeframes TEXT, -- Timeframes utilisés
    indicators TEXT, -- Indicateurs utilisés
    
    -- Capital et risque
    capital_managed VARCHAR(100), -- Capital géré
    risk_per_trade VARCHAR(50), -- Risque par trade
    risk_reward_ratio VARCHAR(50), -- Ratio risque/récompense
    monthly_target VARCHAR(100), -- Objectif mensuel
    
    -- Enseignement
    coaching_experience TEXT, -- Expérience de coaching
    teaching_platform VARCHAR(255), -- Plateforme d'enseignement
    availability TEXT, -- Disponibilité
    hourly_rate VARCHAR(100), -- Tarif horaire
    
    -- Liens externes
    myfxbook_link VARCHAR(500),
    tradingview_link VARCHAR(500),
    linkedin_link VARCHAR(500),
    youtube_link VARCHAR(500),
    
    -- Stratégies (JSON)
    strategies_data JSONB,
    
    -- Statut
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT, -- Notes de l'admin
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_consultation_sheets_trainer ON consultation_sheets(trainer_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sheets_status ON consultation_sheets(status);

-- Contrainte unique: un formateur ne peut avoir qu'une fiche de consultation active
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_sheets_unique_trainer 
ON consultation_sheets(trainer_id) 
WHERE status != 'rejected';
