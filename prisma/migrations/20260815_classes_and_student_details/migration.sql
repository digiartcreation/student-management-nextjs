-- Splits Section into Class + Section, and widens Student with guardian and
-- personal details.
--
-- Every step is guarded against its own effects, so the file is safe to re-run.
-- That is not decoration: the first attempt died partway through — it rewrote
-- `Section.name` from "10-A" to "A" while the old global unique index on `name`
-- was still in place, so three sections all becoming "A" collided. The index is
-- now dropped *before* the rename, and the statements that had already applied
-- must be skipped on the retry rather than failing on a duplicate column.
--
-- Sections were named "10-A", meaning class 10 section A: the class is
-- everything before the first "-", the section everything after the last. A name
-- carrying no "-" is treated as a whole class with a single section "A", so no
-- row is silently dropped.
--
-- MySQL has no `ADD COLUMN IF NOT EXISTS`, hence the information_schema probes
-- and prepared statements.

-- ── Student: new columns ────────────────────────────────────────────────────
-- Added as one statement, so probing a single column settles the whole group.
SET @have := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Student' AND COLUMN_NAME = 'fatherName');
SET @sql := IF(@have = 0,
  'ALTER TABLE `Student`
     ADD COLUMN `fatherName`   VARCHAR(191) NOT NULL DEFAULT '''',
     ADD COLUMN `motherName`   VARCHAR(191) NOT NULL DEFAULT '''',
     ADD COLUMN `fatherMobile` VARCHAR(191) NOT NULL DEFAULT '''',
     ADD COLUMN `motherMobile` VARCHAR(191) NOT NULL DEFAULT '''',
     ADD COLUMN `address`      TEXT         NULL,
     ADD COLUMN `bloodGroup`   VARCHAR(191) NOT NULL DEFAULT '''',
     ADD COLUMN `joiningDate`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A real date beats a placeholder: a student joined no later than the day their
-- record was created. Confined to rows still holding the column default, so a
-- retry cannot overwrite a date someone has since corrected by hand.
UPDATE `Student` SET `joiningDate` = `createdAt` WHERE `joiningDate` > `createdAt`;

-- TEXT cannot carry a literal DEFAULT in MySQL, so `address` arrives nullable,
-- is filled for the rows already on file, and only then becomes NOT NULL.
UPDATE `Student` SET `address` = '' WHERE `address` IS NULL;

SET @nullable := (SELECT COUNT(*) FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Student'
                    AND COLUMN_NAME = 'address' AND IS_NULLABLE = 'YES');
SET @sql := IF(@nullable = 1, 'ALTER TABLE `Student` MODIFY COLUMN `address` TEXT NOT NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @have := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Student'
                AND INDEX_NAME = 'Student_joiningDate_idx');
SET @sql := IF(@have = 0, 'CREATE INDEX `Student_joiningDate_idx` ON `Student`(`joiningDate`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Class: new table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Class` (
    `id`        INTEGER      NOT NULL AUTO_INCREMENT,
    `name`      VARCHAR(191) NOT NULL,
    `status`    ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL,

    UNIQUE INDEX `Class_name_key`(`name`),
    INDEX `Class_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One class per distinct prefix. DISTINCT stops "10-A" and "10-B" both trying to
-- create class 10; the NOT EXISTS makes a re-run a no-op. Only sections still
-- carrying an un-split name are considered, so a second pass cannot mistake an
-- already-reduced section ("A") for a class of its own.
INSERT INTO `Class` (`name`, `status`, `createdAt`, `updatedAt`)
SELECT DISTINCT
    CASE WHEN s.`name` LIKE '%-%' THEN SUBSTRING_INDEX(s.`name`, '-', 1) ELSE s.`name` END AS derived,
    'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Section` s
WHERE s.`classId` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `Class` c
    WHERE c.`name` = CASE WHEN s.`name` LIKE '%-%' THEN SUBSTRING_INDEX(s.`name`, '-', 1) ELSE s.`name` END
  );

-- ── Section: attach to a class, reduce name to the division ─────────────────
SET @have := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Section' AND COLUMN_NAME = 'classId');
SET @sql := IF(@have = 0, 'ALTER TABLE `Section` ADD COLUMN `classId` INTEGER NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `Section` s
JOIN `Class` c
  ON c.`name` = CASE WHEN s.`name` LIKE '%-%' THEN SUBSTRING_INDEX(s.`name`, '-', 1) ELSE s.`name` END
SET s.`classId` = c.`id`
WHERE s.`classId` IS NULL;

-- Dropped BEFORE the rename. This is the ordering that broke the first attempt:
-- the old index made `name` unique across the whole table, and the rename
-- deliberately collapses "10-A" and "9-A" onto the same "A".
SET @have := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Section' AND INDEX_NAME = 'Section_name_key');
SET @sql := IF(@have > 0, 'DROP INDEX `Section_name_key` ON `Section`', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Idempotent by construction: a reduced name holds no "-", and equals its class
-- name only in the no-dash case this is meant to convert.
UPDATE `Section` s
JOIN `Class` c ON c.`id` = s.`classId`
SET s.`name` = CASE
    WHEN s.`name` LIKE '%-%' THEN SUBSTRING_INDEX(s.`name`, '-', -1)
    WHEN s.`name` = c.`name`  THEN 'A'
    ELSE s.`name`
END;

-- Safe only because every row was given a class above.
SET @nullable := (SELECT COUNT(*) FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Section'
                    AND COLUMN_NAME = 'classId' AND IS_NULLABLE = 'YES');
SET @sql := IF(@nullable = 1, 'ALTER TABLE `Section` MODIFY COLUMN `classId` INTEGER NOT NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @have := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Section' AND INDEX_NAME = 'Section_classId_idx');
SET @sql := IF(@have = 0, 'CREATE INDEX `Section_classId_idx` ON `Section`(`classId`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Unique within a class now, not across the table: every year group has its A.
SET @have := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Section' AND INDEX_NAME = 'Section_classId_name_key');
SET @sql := IF(@have = 0, 'CREATE UNIQUE INDEX `Section_classId_name_key` ON `Section`(`classId`, `name`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @have := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Section'
                AND CONSTRAINT_NAME = 'Section_classId_fkey');
SET @sql := IF(@have = 0,
  'ALTER TABLE `Section` ADD CONSTRAINT `Section_classId_fkey`
     FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
