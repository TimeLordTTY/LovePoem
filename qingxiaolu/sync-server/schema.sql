CREATE TABLE IF NOT EXISTS qx_items (
  id VARCHAR(64) NOT NULL,
  item_type VARCHAR(32) NOT NULL,
  project_id VARCHAR(64) NULL,
  title VARCHAR(500) NOT NULL DEFAULT '',
  content_json LONGTEXT NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  device_id VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_qx_items_project (project_id),
  KEY idx_qx_items_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qx_changes (
  seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id VARCHAR(64) NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  operation ENUM('upsert','delete') NOT NULL,
  payload_json LONGTEXT NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (seq),
  KEY idx_qx_changes_item (item_id),
  CONSTRAINT fk_qx_changes_item FOREIGN KEY (item_id) REFERENCES qx_items(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qx_sync_state (
  client_id VARCHAR(100) NOT NULL,
  last_cursor BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qx_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id VARCHAR(64) NOT NULL,
  base_revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  operation ENUM('upsert','delete') NOT NULL,
  payload_json LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  sent_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_qx_outbox_pending (sent_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
