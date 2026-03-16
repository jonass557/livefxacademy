-- Migration: Créer la table des fiches de consultation élève
-- Date: 2024

-- Table des fiches de consultation élève
CREATE TABLE IF NOT EXISTS student_consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Informations personnelles
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    age INTEGER,
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Niveau et expérience
    trading_experience VARCHAR(50), -- 'debutant', 'intermediaire', 'avance'
    experience_duration VARCHAR(100), -- durée d'expérience en trading
    current_broker VARCHAR(100),
    has_demo_account BOOLEAN DEFAULT false,
    has_real_account BOOLEAN DEFAULT false,
    
    -- Objectifs et attentes
    trading_goals TEXT, -- objectifs de trading
    monthly_goal VARCHAR(100), -- objectif mensuel (montant ou %)
    investment_budget VARCHAR(100), -- budget d'investissement prévu
    time_available VARCHAR(100), -- temps disponible pour le trading
    preferred_style VARCHAR(50), -- 'scalping', 'day_trading', 'swing', 'position'
    
    -- Progression dans l'académie
    academy_level VARCHAR(50), -- 'debutant', 'intermediaire', 'avance'
    modules_completed TEXT, -- modules complétés (JSON ou texte)
    current_module VARCHAR(255), -- module en cours
    difficulties TEXT, -- difficultés rencontrées
    needs_help_with TEXT, -- domaines nécessitant de l'aide
    
    -- Feedback et commentaires
    satisfaction_rating INTEGER, -- note de satisfaction 1-5
    feedback TEXT, -- feedback général
    questions TEXT, -- questions pour le formateur
    
    -- Métadonnées
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'contacted'
    admin_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_student_consultations_user ON student_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_student_consultations_status ON student_consultations(status);
CREATE INDEX IF NOT EXISTS idx_student_consultations_created ON student_consultations(created_at DESC);
