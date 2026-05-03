require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false }});

async function main() {
  const { data, error } = await supabase.from('product_performance').select('period, units_sold');
  if (error) { console.error('Error:', error.message); return; }
  
  const periods = [...new Set(data.map(r => r.period))];
  console.log('Unique periods:', periods);
  
  periods.forEach(p => {
    const items = data.filter(r => r.period === p);
    console.log(`  ${p}: ${items.length} records, total units_sold: ${items.reduce((s, r) => s + r.units_sold, 0)}`);
  });
}
main().catch(e => console.error(e.message));
