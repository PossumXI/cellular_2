/*
  # Kaggle Integration and DeepMind Training Tables

  1. New Tables
    - `kaggle_datasets`: Tracks imported Kaggle datasets
    - `deepmind_models`: Stores trained DeepMind models
    - `model_predictions`: Logs predictions made by models

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create Kaggle Datasets Table
CREATE TABLE IF NOT EXISTS kaggle_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id text NOT NULL,
  dataset_name text NOT NULL,
  category text NOT NULL,
  description text,
  size_bytes bigint,
  columns jsonb,
  row_count integer,
  imported_at timestamptz DEFAULT now(),
  last_used timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true
);

-- Create DeepMind Models Table
CREATE TABLE IF NOT EXISTS deepmind_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  dataset_id uuid REFERENCES kaggle_datasets(id),
  model_type text NOT NULL CHECK (model_type IN ('classification', 'regression', 'nlp')),
  target_column text NOT NULL,
  feature_columns text[] NOT NULL,
  training_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  model_storage_path text,
  version integer DEFAULT 1
);

-- Create Model Predictions Table
CREATE TABLE IF NOT EXISTS model_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES deepmind_models(id) ON DELETE CASCADE,
  input_data jsonb NOT NULL,
  prediction jsonb NOT NULL,
  confidence numeric(5,4),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  location_id text,
  coordinates point
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_user_id ON kaggle_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_category ON kaggle_datasets(category);
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_imported_at ON kaggle_datasets(imported_at);

CREATE INDEX IF NOT EXISTS idx_deepmind_models_user_id ON deepmind_models(user_id);
CREATE INDEX IF NOT EXISTS idx_deepmind_models_dataset_id ON deepmind_models(dataset_id);
CREATE INDEX IF NOT EXISTS idx_deepmind_models_status ON deepmind_models(status);

CREATE INDEX IF NOT EXISTS idx_model_predictions_model_id ON model_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_model_predictions_user_id ON model_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_model_predictions_created_at ON model_predictions(created_at);

-- Enable Row Level Security
ALTER TABLE kaggle_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepmind_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view kaggle datasets" ON kaggle_datasets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert kaggle datasets" ON kaggle_datasets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deepmind models" ON deepmind_models
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deepmind models" ON deepmind_models
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deepmind models" ON deepmind_models
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own model predictions" ON model_predictions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model predictions" ON model_predictions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create functions for Kaggle dataset management
CREATE OR REPLACE FUNCTION import_kaggle_dataset(
  p_dataset_id text,
  p_dataset_name text,
  p_category text,
  p_description text,
  p_columns jsonb,
  p_row_count integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dataset_uuid uuid;
BEGIN
  -- Check if dataset already exists
  SELECT id INTO v_dataset_uuid
  FROM kaggle_datasets
  WHERE dataset_id = p_dataset_id;
  
  IF v_dataset_uuid IS NULL THEN
    -- Insert new dataset
    INSERT INTO kaggle_datasets (
      dataset_id,
      dataset_name,
      category,
      description,
      columns,
      row_count,
      user_id
    ) VALUES (
      p_dataset_id,
      p_dataset_name,
      p_category,
      p_description,
      p_columns,
      p_row_count,
      auth.uid()
    )
    RETURNING id INTO v_dataset_uuid;
  ELSE
    -- Update existing dataset
    UPDATE kaggle_datasets
    SET 
      dataset_name = p_dataset_name,
      category = p_category,
      description = p_description,
      columns = p_columns,
      row_count = p_row_count,
      imported_at = now(),
      last_used = now()
    WHERE id = v_dataset_uuid;
  END IF;
  
  RETURN v_dataset_uuid;
END;
$$;

-- Create function to log model predictions
CREATE OR REPLACE FUNCTION log_model_prediction(
  p_model_id uuid,
  p_input_data jsonb,
  p_prediction jsonb,
  p_confidence numeric,
  p_location_id text,
  p_coordinates point
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prediction_id uuid;
BEGIN
  INSERT INTO model_predictions (
    model_id,
    input_data,
    prediction,
    confidence,
    user_id,
    location_id,
    coordinates
  ) VALUES (
    p_model_id,
    p_input_data,
    p_prediction,
    p_confidence,
    auth.uid(),
    p_location_id,
    p_coordinates
  )
  RETURNING id INTO v_prediction_id;
  
  RETURN v_prediction_id;
END;
$$;

-- Create view for model performance metrics
CREATE OR REPLACE VIEW model_performance_metrics AS
SELECT
  m.id AS model_id,
  m.model_name,
  m.model_type,
  m.target_column,
  m.status,
  m.metrics->>'finalLoss' AS final_loss,
  m.metrics->>'finalValLoss' AS final_val_loss,
  m.metrics->>'epochs' AS epochs,
  m.metrics->>'trainingTime' AS training_time_ms,
  COUNT(p.id) AS prediction_count,
  m.user_id,
  m.created_at,
  m.completed_at
FROM
  deepmind_models m
LEFT JOIN
  model_predictions p ON m.id = p.model_id
GROUP BY
  m.id, m.model_name, m.model_type, m.target_column, m.status, 
  m.metrics->>'finalLoss', m.metrics->>'finalValLoss', 
  m.metrics->>'epochs', m.metrics->>'trainingTime',
  m.user_id, m.created_at, m.completed_at;

-- Grant permissions
GRANT SELECT ON model_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION import_kaggle_dataset TO authenticated;
GRANT EXECUTE ON FUNCTION log_model_prediction TO authenticated;