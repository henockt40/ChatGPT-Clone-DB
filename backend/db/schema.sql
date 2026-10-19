-- ChatGPT Clone - unified MySQL schema (authentication + chat + sidebar features).
-- This one file defines all five tables: users, chats, conversations, images,
-- and research_reports. There is no second sidebar SQL script to run.
--
-- For a NEW database: run this file in MySQL Workbench.
-- For an EXISTING compatible database: back up data first. CREATE TABLE IF NOT
-- EXISTS can add missing images/research_reports tables but will NOT migrate
-- older/incompatible table structures or change existing column definitions.
-- Check your schema before running this against an older project.
-- Older unassigned chats will not be shown to newly registered users.
CREATE DATABASE IF NOT EXISTS chatgpt_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chatgpt_clone;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(180) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  title VARCHAR(160) NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_chats_user_updated (user_id, updated_at),
  CONSTRAINT fk_chats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chat_id BIGINT UNSIGNED NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content LONGTEXT NOT NULL,
  token_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversations_created_at (created_at),
  INDEX idx_conversations_chat_id (chat_id,id),
  CONSTRAINT fk_conversations_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Sidebar: Images. All rows belong to one authenticated account.
-- Generated image files themselves are stored by the backend, not in MySQL.
CREATE TABLE IF NOT EXISTS images (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 prompt TEXT NOT NULL,
 file_name VARCHAR(255) NOT NULL,
 mime_type VARCHAR(100) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_images_user (user_id,id),
 CONSTRAINT fk_images_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sidebar: Deep Research reports. All rows belong to one account.
CREATE TABLE IF NOT EXISTS research_reports (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 topic VARCHAR(500) NOT NULL,
 status ENUM('running','done','error') NOT NULL DEFAULT 'running',
 progress TEXT NULL,
 report LONGTEXT NULL,
 sources TEXT NULL,
 error_message VARCHAR(500) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TIMESTAMP NULL DEFAULT NULL,
 KEY idx_reports_user (user_id,id),
 CONSTRAINT fk_reports_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
