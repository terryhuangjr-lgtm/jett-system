require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false }});

async function main() {
  const { data, error } = await supabase.from('product_performance').select('*').limit(5);
  if (error) { console.error('Error:', error.message); return; }
  console.log(JSON.stringify(data, null, 2));
  
  const { count } = await supabase.from('product_performance').select('*', { count: 'exact', head: true });
  console.log('\nTotal records:', count);
}
main().catch(e => console.error(e.message));
