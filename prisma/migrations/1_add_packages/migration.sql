-- CreateTable
CREATE TABLE IF NOT EXISTS "packages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "host_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "session_count" INTEGER NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "is_free_intro" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Hosts can manage their own packages
CREATE POLICY "Hosts manage own packages" ON packages
  FOR ALL USING (host_id = auth.uid());
