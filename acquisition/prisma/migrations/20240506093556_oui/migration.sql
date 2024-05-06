-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Measure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" TEXT NOT NULL,
    "idSession" INTEGER NOT NULL,
    CONSTRAINT "Measure_idSession_fkey" FOREIGN KEY ("idSession") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Measure" ("id", "idSession", "time", "value") SELECT "id", "idSession", "time", "value" FROM "Measure";
DROP TABLE "Measure";
ALTER TABLE "new_Measure" RENAME TO "Measure";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
