import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

// Extract project ref from URL (format: https://<ref>.supabase.co)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

// Build PostgreSQL connection string
// Format: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
const DATABASE_URL = `postgresql://postgres.${projectRef}:${supabaseKey}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

async function runMigration() {
  const client = new Client({ connectionString: DATABASE_URL })

  try {
    await client.connect()
    console.log('Connected to database')

    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '008_authentication.sql'
    )

    const sql = fs.readFileSync(migrationPath, 'utf-8')

    await client.query(sql)

    console.log('Migration executed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
