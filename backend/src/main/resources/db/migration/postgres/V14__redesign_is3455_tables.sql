-- Drop old V13 table
DROP TABLE IF EXISTS is3455_tolerances;

-- Parent: size ranges
CREATE TABLE is3455_ranges (
    id SERIAL PRIMARY KEY,
    range_label VARCHAR(30) NOT NULL,
    nominal_size_max NUMERIC(10,4) NOT NULL,
    tolerance_type VARCHAR(30) NOT NULL
);

-- Child: tolerance values per grade
CREATE TABLE is3455_tolerance_values (
    id SERIAL PRIMARY KEY,
    range_id INTEGER REFERENCES is3455_ranges(id),
    sym_value VARCHAR(10) NOT NULL,
    grd_5  NUMERIC(10,4),
    grd_6  NUMERIC(10,4),
    grd_7  NUMERIC(10,4),
    grd_8  NUMERIC(10,4),
    grd_9  NUMERIC(10,4),
    grd_10 NUMERIC(10,4),
    grd_11 NUMERIC(10,4),
    grd_12 NUMERIC(10,4),
    grd_13 NUMERIC(10,4),
    grd_14 NUMERIC(10,4),
    grd_15 NUMERIC(10,4),
    grd_16 NUMERIC(10,4)
);

CREATE INDEX idx_is3455_range_lookup ON is3455_ranges(tolerance_type, nominal_size_max);
CREATE INDEX idx_is3455_val_range ON is3455_tolerance_values(range_id, sym_value);

-- Seed ranges
INSERT INTO is3455_ranges (id,range_label,nominal_size_max,tolerance_type) VALUES
(1,'UP TO 3',3,'Plug Tolerance'),(2,'UP TO 6',6,'Plug Tolerance'),(3,'UP TO 10',10,'Plug Tolerance'),
(4,'UP TO 18',18,'Plug Tolerance'),(5,'UP TO 30',30,'Plug Tolerance'),(6,'UP TO 50',50,'Plug Tolerance'),
(7,'UP TO 80',80,'Plug Tolerance'),(8,'UP TO 120',120,'Plug Tolerance'),(9,'UP TO 180',180,'Plug Tolerance'),
(10,'UP TO 250',250,'Plug Tolerance'),(11,'UP TO 315',315,'Plug Tolerance'),(12,'UP TO 400',400,'Plug Tolerance'),
(13,'UP TO 500',500,'Plug Tolerance'),
(14,'UP TO 3',3,'Snap Tolerance'),(15,'UP TO 6',6,'Snap Tolerance'),(16,'UP TO 10',10,'Snap Tolerance'),
(17,'UP TO 18',18,'Snap Tolerance'),(18,'UP TO 30',30,'Snap Tolerance'),(19,'UP TO 50',50,'Snap Tolerance'),
(20,'UP TO 80',80,'Snap Tolerance'),(21,'UP TO 120',120,'Snap Tolerance'),(22,'UP TO 180',180,'Snap Tolerance'),
(23,'UP TO 250',250,'Snap Tolerance'),(24,'UP TO 315',315,'Snap Tolerance'),(25,'UP TO 400',400,'Snap Tolerance'),
(26,'UP TO 500',500,'Snap Tolerance');

SELECT setval('is3455_ranges_id_seq', 26);
