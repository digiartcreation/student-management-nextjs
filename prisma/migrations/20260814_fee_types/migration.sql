-- Generalises MonthlyFee into Fee, so a charge can be monthly, quarterly,
-- yearly or a named one-off instead of only ever a month.
--
-- Every existing row is a monthly fee, so it keeps its month as the period and
-- as the month it is billed in, and takes the MONTHLY default. No row is
-- dropped or re-priced.

-- The foreign key goes first: MySQL will not let go of the index backing it.
ALTER TABLE `MonthlyFee` DROP FOREIGN KEY `MonthlyFee_studentId_fkey`;

RENAME TABLE `MonthlyFee` TO `Fee`;

DROP INDEX `MonthlyFee_studentId_month_key` ON `Fee`;
DROP INDEX `MonthlyFee_month_idx` ON `Fee`;
DROP INDEX `MonthlyFee_paid_idx` ON `Fee`;

ALTER TABLE `Fee`
    CHANGE `month` `period` VARCHAR(10) NOT NULL,
    ADD COLUMN `feeType` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY', 'OTHER') NOT NULL DEFAULT 'MONTHLY' AFTER `studentId`,
    ADD COLUMN `title` VARCHAR(60) NOT NULL DEFAULT '' AFTER `period`,
    ADD COLUMN `billedMonth` VARCHAR(7) NOT NULL DEFAULT '' AFTER `title`;

-- A monthly fee bills in its own month.
UPDATE `Fee` SET `billedMonth` = `period`;

-- Backfilled, so the placeholder default comes off and the column matches the
-- schema, which requires it on every write.
ALTER TABLE `Fee` ALTER COLUMN `billedMonth` DROP DEFAULT;

CREATE UNIQUE INDEX `Fee_studentId_feeType_period_title_key` ON `Fee`(`studentId`, `feeType`, `period`, `title`);
CREATE INDEX `Fee_billedMonth_idx` ON `Fee`(`billedMonth`);
CREATE INDEX `Fee_period_idx` ON `Fee`(`period`);
CREATE INDEX `Fee_feeType_idx` ON `Fee`(`feeType`);
CREATE INDEX `Fee_paid_idx` ON `Fee`(`paid`);

ALTER TABLE `Fee` ADD CONSTRAINT `Fee_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
