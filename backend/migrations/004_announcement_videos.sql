-- Migration: Créer la table des vidéos d'annonces admin
-- Date: 2024

-- Table des vidéos d'annonces (différent des vidéos formateurs)
CREATE TABLE IF NOT EXISTS announcement_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    cloudinary_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0, -- Pour l'ordre d'affichage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_announcement_videos_active ON announcement_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_videos_priority ON announcement_videos(priority DESC, created_at DESC);

-- Ajouter un champ pour tracker la dernière assignation round-robin
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS last_rotation_at TIMESTAMP WITH TIME ZONE;

-- Table pour stocker les vues des vidéos par utilisateur
CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES announcement_videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, user_id)
);
