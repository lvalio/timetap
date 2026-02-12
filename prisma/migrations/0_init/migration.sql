-- CreateTable
CREATE TABLE "hosts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "avatar_url" TEXT,
    "timezone" TEXT,
    "google_refresh_token" TEXT,
    "stripe_account_id" TEXT,
    "subscription_id" TEXT,
    "subscription_status" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "bookable_hours" JSONB,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosts_email_key" ON "hosts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hosts_slug_key" ON "hosts"("slug");

-- Enable Row Level Security
ALTER TABLE "hosts" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Hosts can only access their own data
CREATE POLICY "Hosts access own data" ON "hosts"
    FOR ALL USING (id = auth.uid());
