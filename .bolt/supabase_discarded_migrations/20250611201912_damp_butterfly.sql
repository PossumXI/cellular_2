/*
  # Create AI Training and Kaggle Export Tables

  1. New Tables
    - `ai_training_jobs`: Stores AI model training jobs
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `dataset_name` (text, not null)
      - `model_type` (text, not null, enum)
      - `target_column` (text, not null)
      - `feature_columns` (text[], not null)
      - `config` (jsonb, not null)
      - `status` (text, not null, enum)
      - `progress` (numeric, default 0)
      - `metrics` (jsonb)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `user_id` (uuid, foreign key)
    
    - `kaggle_exports`: Stores Kaggle dataset export records
      - `id` (uuid, primary key)
      - `dataset_name` (text, not null)
      - `config` (jsonb, not null)
      - `record_count` (integer, not null)
      - `created_at` (timestamptz)
      - `user_id` (uuid, foreign key)

  2. Indexes
    - Indexes on user_id, status, and dataset_name for efficient querying
    
  3. Security
    - Row Level Security (RLS) enabled for both tables
    - Policies for authenticated users to manage their own records
*/

-- Create AI Training Jobs Table
CREATE TABLE IF NOT EXISTS ai_training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dataset_name text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN ('classification', 'regression', 'nlp')),
  target_column text NOT NULL,
  feature_columns text[] NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'completed', 'failed')),
  progress numeric(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  metrics jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE
);

-- Create Kaggle Exports Table
CREATE TABLE IF NOT EXISTS kaggle_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_user_id ON ai_training_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_status ON ai_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_dataset ON ai_training_jobs(dataset_name);
CREATE INDEX IF NOT EXISTS idx_kaggle_exports_user_id ON kaggle_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_kaggle_exports_dataset ON kaggle_exports(dataset_name);

-- Enable Row Level Security
ALTER TABLE ai_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaggle_exports ENABLE ROW LEVEL SECURITY;

-- Create policies for AI Training Jobs
CREATE POLICY "Users can view their own training jobs"
  ON ai_training_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training jobs"
  ON ai_training_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training jobs"
  ON ai_training_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for Kaggle Exports
CREATE POLICY "Users can view their own kaggle exports"
  ON kaggle_exports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own kaggle exports"
  ON kaggle_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);