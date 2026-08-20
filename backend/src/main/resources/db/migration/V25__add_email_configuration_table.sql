CREATE TABLE email_configurations (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    encryption_type VARCHAR(50) DEFAULT 'TLS',
    sender_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_config_factory FOREIGN KEY (factory_id) REFERENCES factories(id)
);
