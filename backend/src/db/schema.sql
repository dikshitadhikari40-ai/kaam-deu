-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('worker', 'business')),
    google_uid TEXT,
    linkedin_uid TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Worker profiles table
CREATE TABLE IF NOT EXISTS worker_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    location TEXT,
    bio TEXT,
    job_title TEXT,
    experience_years INTEGER DEFAULT 0,
    expected_salary_npr INTEGER DEFAULT 0,
    skills TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Business profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    location TEXT,
    description TEXT,
    industry TEXT,
    company_size TEXT,
    logo_url TEXT,
    images TEXT DEFAULT '[]',
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Swipes table
CREATE TABLE IF NOT EXISTS swipes (
    id TEXT PRIMARY KEY,
    swiper_id TEXT NOT NULL REFERENCES users(id),
    swiped_id TEXT NOT NULL REFERENCES users(id),
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(swiper_id, swiped_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL REFERENCES users(id),
    business_id TEXT NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, business_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Social accounts table for OAuth providers
CREATE TABLE IF NOT EXISTS social_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL CHECK (provider IN ('google', 'linkedin', 'facebook', 'apple')),
    provider_id TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Job posts table (businesses post jobs, workers browse)
CREATE TABLE IF NOT EXISTS job_posts (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    location TEXT,
    latitude REAL,
    longitude REAL,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('daily', 'monthly', 'hourly')),
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'daily_wage')),
    requirements TEXT DEFAULT '[]',
    skills_required TEXT DEFAULT '[]',
    is_remote INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'filled', 'expired', 'archived')),
    applications_count INTEGER DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table (workers and businesses review each other)
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    target_id TEXT NOT NULL REFERENCES users(id),
    match_id TEXT REFERENCES matches(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    type TEXT CHECK (type IN ('worker_to_business', 'business_to_worker')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, target_id, match_id)
);

-- Reports table (report users or job posts)
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id),
    target_user_id TEXT REFERENCES users(id),
    target_job_id TEXT REFERENCES job_posts(id),
    reason TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by TEXT REFERENCES users(id)
);

-- Blocks table (users block other users)
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    blocker_id TEXT NOT NULL REFERENCES users(id),
    blocked_id TEXT NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
);

-- Streaks table (login/activity streaks)
CREATE TABLE IF NOT EXISTS user_streaks (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job applications table (workers apply to jobs)
CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES job_posts(id),
    worker_id TEXT NOT NULL REFERENCES users(id),
    cover_letter TEXT,
    resume_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'rejected', 'hired', 'withdrawn')),
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(job_id, worker_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_worker ON job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_matches_worker ON matches(worker_id);
CREATE INDEX IF NOT EXISTS idx_matches_business ON matches(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON social_accounts(provider, provider_id);

-- New indexes for new tables
CREATE INDEX IF NOT EXISTS idx_job_posts_business ON job_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_category ON job_posts(category);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
