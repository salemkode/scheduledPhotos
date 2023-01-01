-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "caption" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_id_key" ON "Message"("id");
