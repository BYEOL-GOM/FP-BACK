-- CreateTable
CREATE TABLE `Users` (
    `userId` INTEGER NOT NULL AUTO_INCREMENT,
    `userCheckId` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `fruit` INTEGER NOT NULL DEFAULT 0,
    `remainingWorries` INTEGER NOT NULL DEFAULT 5,
    `remainingAnswers` INTEGER NOT NULL DEFAULT 5,
    `remainingStars` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Worries` (
    `worryId` INTEGER NOT NULL AUTO_INCREMENT,
    `commentAuthorId` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `fontColor` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `icon` ENUM('A', 'B', 'C') NULL,
    `unRead` BOOLEAN NOT NULL DEFAULT true,
    `isSolved` BOOLEAN NOT NULL DEFAULT false,
    `reportReason` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `solvingCommentId` INTEGER NULL,

    UNIQUE INDEX `Worries_solvingCommentId_key`(`solvingCommentId`),
    PRIMARY KEY (`worryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comments` (
    `commentId` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    `fontColor` VARCHAR(191) NULL,
    `unRead` BOOLEAN NOT NULL DEFAULT true,
    `reportReason` VARCHAR(191) NULL,
    `parentId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `worryId` INTEGER NOT NULL,
    `solvingWorryId` INTEGER NULL,

    PRIMARY KEY (`commentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Likes` (
    `likeId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `commentId` INTEGER NULL,

    PRIMARY KEY (`likeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BannedWords` (
    `bannedWordId` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BannedWords_word_key`(`word`),
    PRIMARY KEY (`bannedWordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reports` (
    `reportId` INTEGER NOT NULL AUTO_INCREMENT,
    `reason` VARCHAR(191) NOT NULL,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `worryId` INTEGER NULL,
    `commentId` INTEGER NULL,

    PRIMARY KEY (`reportId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Worries` ADD CONSTRAINT `Worries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Worries` ADD CONSTRAINT `Worries_solvingCommentId_fkey` FOREIGN KEY (`solvingCommentId`) REFERENCES `Comments`(`commentId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comments` ADD CONSTRAINT `Comments_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comments`(`commentId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comments` ADD CONSTRAINT `Comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comments` ADD CONSTRAINT `Comments_worryId_fkey` FOREIGN KEY (`worryId`) REFERENCES `Worries`(`worryId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Likes` ADD CONSTRAINT `Likes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Likes` ADD CONSTRAINT `Likes_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comments`(`commentId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reports` ADD CONSTRAINT `Reports_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reports` ADD CONSTRAINT `Reports_worryId_fkey` FOREIGN KEY (`worryId`) REFERENCES `Worries`(`worryId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reports` ADD CONSTRAINT `Reports_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comments`(`commentId`) ON DELETE SET NULL ON UPDATE CASCADE;
