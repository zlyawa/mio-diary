-- 创建分类表
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建评论表
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diaryId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "auditReason" TEXT,
    "moderationSource" TEXT,
    "moderatedAt" DATETIME,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "Diary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建点赞表
CREATE TABLE "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "diaryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "Diary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建收藏夹表
CREATE TABLE "FavoriteFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FavoriteFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建收藏表
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "diaryId" TEXT NOT NULL,
    "folderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "Diary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FavoriteFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 创建分享链接表
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "password" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "maxAccess" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShareLink_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "Diary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建缓存表
CREATE TABLE "Cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建配置变更日志表
CREATE TABLE "ConfigLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "changeType" TEXT NOT NULL DEFAULT 'update',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfigLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建公告表
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Announcement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建评论点赞表
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建评论编辑历史表
CREATE TABLE "CommentEditHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "oldContent" TEXT NOT NULL,
    "newContent" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentEditHistory_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommentEditHistory_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建评论举报表
CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "handledBy" TEXT,
    "handledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 添加 Diary 表的分类字段
ALTER TABLE "Diary" ADD COLUMN "categoryId" TEXT REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 创建分类索引
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- 创建评论索引
CREATE INDEX "Comment_diaryId_idx" ON "Comment"("diaryId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Comment_status_idx" ON "Comment"("status");
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- 创建点赞索引
CREATE UNIQUE INDEX "Like_userId_diaryId_key" ON "Like"("userId", "diaryId");
CREATE INDEX "Like_diaryId_idx" ON "Like"("diaryId");

-- 创建收藏夹索引
CREATE UNIQUE INDEX "FavoriteFolder_userId_name_key" ON "FavoriteFolder"("userId", "name");
CREATE INDEX "FavoriteFolder_userId_idx" ON "FavoriteFolder"("userId");

-- 创建收藏索引
CREATE UNIQUE INDEX "Favorite_userId_diaryId_key" ON "Favorite"("userId", "diaryId");
CREATE INDEX "Favorite_diaryId_idx" ON "Favorite"("diaryId");

-- 创建分享链接索引
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX "ShareLink_diaryId_idx" ON "ShareLink"("diaryId");

-- 创建缓存索引
CREATE UNIQUE INDEX "Cache_key_key" ON "Cache"("key");
CREATE INDEX "Cache_expiresAt_idx" ON "Cache"("expiresAt");

-- 创建配置日志索引
CREATE INDEX "ConfigLog_adminId_idx" ON "ConfigLog"("adminId");
CREATE INDEX "ConfigLog_configKey_idx" ON "ConfigLog"("configKey");
CREATE INDEX "ConfigLog_createdAt_idx" ON "ConfigLog"("createdAt");

-- 创建公告索引
CREATE INDEX "Announcement_isActive_idx" ON "Announcement"("isActive");
CREATE INDEX "Announcement_isPinned_idx" ON "Announcement"("isPinned");
CREATE INDEX "Announcement_startAt_idx" ON "Announcement"("startAt");
CREATE INDEX "Announcement_endAt_idx" ON "Announcement"("endAt");
CREATE INDEX "Announcement_priority_idx" ON "Announcement"("priority");
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- 创建评论点赞索引
CREATE UNIQUE INDEX "CommentLike_userId_commentId_key" ON "CommentLike"("userId", "commentId");
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");

-- 创建评论编辑历史索引
CREATE INDEX "CommentEditHistory_commentId_idx" ON "CommentEditHistory"("commentId");
CREATE INDEX "CommentEditHistory_createdAt_idx" ON "CommentEditHistory"("createdAt");

-- 创建评论举报索引
CREATE INDEX "CommentReport_commentId_idx" ON "CommentReport"("commentId");
CREATE INDEX "CommentReport_reporterId_idx" ON "CommentReport"("reporterId");
CREATE INDEX "CommentReport_status_idx" ON "CommentReport"("status");
CREATE INDEX "CommentReport_createdAt_idx" ON "CommentReport"("createdAt");

-- 创建日记分类索引
CREATE INDEX "Diary_categoryId_idx" ON "Diary"("categoryId");