import dotenv from "dotenv"
import pg from "pg"

dotenv.config({ path: ".env.local" })

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL,
})

async function main() {
  const client = await pool.connect()
  try {
    // Enable RLS on hosts table
    await client.query(`ALTER TABLE "hosts" ENABLE ROW LEVEL SECURITY;`)
    console.log("✅ RLS enabled on hosts table")

    // Create policy if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'hosts' AND policyname = 'Hosts access own data'
        ) THEN
          CREATE POLICY "Hosts access own data" ON "hosts"
            FOR ALL USING (id = auth.uid());
        END IF;
      END
      $$;
    `)
    console.log("✅ RLS policy created on hosts table")

    // Create a function that auto-enables RLS on new tables in public schema
    await client.query(`
      CREATE OR REPLACE FUNCTION public.auto_enable_rls()
      RETURNS event_trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        obj record;
      BEGIN
        FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
          WHERE command_tag = 'CREATE TABLE'
            AND schema_name = 'public'
        LOOP
          EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
          RAISE NOTICE 'RLS auto-enabled on %', obj.object_identity;
        END LOOP;
      END;
      $$;
    `)
    console.log("✅ auto_enable_rls function created")

    // Create event trigger (drop first if exists)
    await client.query(`
      DROP EVENT TRIGGER IF EXISTS trigger_auto_enable_rls;
      CREATE EVENT TRIGGER trigger_auto_enable_rls
        ON ddl_command_end
        WHEN TAG IN ('CREATE TABLE')
        EXECUTE FUNCTION public.auto_enable_rls();
    `)
    console.log("✅ Event trigger created — RLS will auto-enable on all new tables")

  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
