-- Migration: Créer la table des stratégies formateur
-- Date: 2024

-- Table des stratégies de trading des formateurs
CREATE TABLE IF NOT EXISTS trainer_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    market_type VARCHAR(100), -- Forex, Crypto, Actions, etc.
    timeframe VARCHAR(50), -- M1, M5, H1, H4, D1, etc.
    risk_reward_ratio VARCHAR(50),
    win_rate VARCHAR(50),
    entry_criteria TEXT,
    exit_criteria TEXT,
    risk_management TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter plus de champs au profil formateur si nécessaire
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS certifications TEXT,
ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255),
ADD COLUMN IF NOT EXISTS twitter VARCHAR(255),
ADD COLUMN IF NOT EXISTS youtube VARCHAR(255),
ADD COLUMN IF NOT EXISTS myfxbook VARCHAR(255);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_trainer_strategies_trainer ON trainer_strategies(trainer_id);
