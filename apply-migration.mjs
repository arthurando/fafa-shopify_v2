import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sql = readFileSync('supabase/migrations/013_product_variants.sql', 'utf-8')

// Split by semicolons but keep them
const statements = sql.split(';').filter(s => s.trim().length > 0)

for (const statement of statements) {
  console.log('Executing:', statement.substring(0, 50) + '...')
  const { error } = await supabase.rpc('exec_sql', { sql_query: statement.trim() + ';' })
  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('Success!')
  }
}

console.log('Migration complete!')
