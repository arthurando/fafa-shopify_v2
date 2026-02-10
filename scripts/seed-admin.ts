import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedAdmin() {
  const mobile = 'sttmall'
  const password = 'STTMall520!@#$'
  const passwordHash = await bcrypt.hash(password, 10)

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('fafa_users')
    .select('id')
    .eq('mobile', mobile)
    .single()

  if (existing) {
    console.log('Admin user already exists')
    return
  }

  // Insert admin user
  const { error } = await supabase.from('fafa_users').insert({
    mobile,
    password_hash: passwordHash,
    display_name: 'STT Mall Admin',
    role: 'admin',
    is_active: true,
  })

  if (error) {
    console.error('Failed to create admin user:', error)
    process.exit(1)
  }

  console.log('Admin user created successfully')
  console.log('Mobile:', mobile)
  console.log('Password:', password)
}

seedAdmin()
