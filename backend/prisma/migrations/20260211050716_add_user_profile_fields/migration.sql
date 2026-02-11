-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarData" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "backgroundUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT DEFAULT '记录生活的每一刻';
