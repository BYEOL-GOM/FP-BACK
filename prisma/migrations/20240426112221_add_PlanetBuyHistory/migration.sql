-- AlterTable
ALTER TABLE `Users` ADD COLUMN `planet` ENUM('A', 'B', 'C', 'D') NOT NULL DEFAULT 'A',
    MODIFY `email` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PlanetBuyHistory` (
    `HistoryId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `planetType` ENUM('A', 'B', 'C', 'D') NOT NULL DEFAULT 'A',

    PRIMARY KEY (`HistoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlanetBuyHistory` ADD CONSTRAINT `PlanetBuyHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
