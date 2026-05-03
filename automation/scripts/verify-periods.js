require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false }});
(async () => {
  const { data } = await supabase.from('product_performance').select('period, units_sold, revenue');
  const p = {};
  data.forEach(r => { if (!p[r.period]) p[r.period] = {c:0,u:0,r:0}; p[r.period].c++; p[r.period].u += r.units_sold; p[r.period].r += r.revenue; });
  Object.entries(p).sort().forEach(([k,v]) => console.log(k + ': ' + v.c + ' prods, ' + v.u + ' units, $' + v.r));
  console.log('Total: ' + data.length + ' records');
})();
