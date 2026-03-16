-- Migration: Créer la table des programmes de vacances
-- Date: 2024

CREATE TABLE IF NOT EXISTS vacation_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10, 2),
    location VARCHAR(255),
    max_participants INTEGER DEFAULT 20,
    current_participants INTEGER DEFAULT 0,
    age_range VARCHAR(50), -- ex: "8-12 ans", "13-17 ans"
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vacation_programs_dates ON vacation_programs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacation_programs_active ON vacation_programs(is_active);

-- Table pour les inscriptions aux programmes
CREATE TABLE IF NOT EXISTS vacation_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES vacation_programs(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_age INTEGER,
    parent_name VARCHAR(255) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vacation_registrations_program ON vacation_registrations(program_id);
CREATE INDEX IF NOT EXISTS idx_vacation_registrations_status ON vacation_registrations(status);
