-- V7: Add completed_by column to gauge_operations to track which worker completed the operation

ALTER TABLE gauge_operations ADD COLUMN completed_by UUID REFERENCES users(id);
