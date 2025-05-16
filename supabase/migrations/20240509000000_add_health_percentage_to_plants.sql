ALTER TABLE plants
ADD COLUMN health_percentage INTEGER DEFAULT NULL,
ADD CONSTRAINT health_percentage_check CHECK (health_percentage >= 0 AND health_percentage <= 100);
