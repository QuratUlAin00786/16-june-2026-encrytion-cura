-- Create user_conversation_favorites table
CREATE TABLE IF NOT EXISTS user_conversation_favorites (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    conversation_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id, conversation_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_conversation_favorites_user_org ON user_conversation_favorites(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_conversation_favorites_conversation ON user_conversation_favorites(conversation_id);
