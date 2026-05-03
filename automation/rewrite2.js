const fs = require('fs');
let lines = fs.readFileSync('hermes-to-supabase.js', 'utf8').split('\n');

// Find the start and end of the metrics section
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// 3. Sync metrics')) {
    startIdx = i;
  }
  if (startIdx !== -1 && endIdx === -1 && i > startIdx && lines[i].includes('// 4. Sync activity logs')) {
    endIdx = i;
    break;
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find metrics section boundaries');
  process.exit(1);
}

const newMetricsSection = `    // 3. Sync metrics
    if (options.syncMetrics) {
      console.log('\\n📊 Syncing metrics...');
      
      const metrics = await fetchShopifyMetrics(supabaseKey);
      if (metrics.length === 0) {
        console.log('⚠️  No metrics fetched from Shopify');
      } else {
        console.log(\`  ✅ Synced \${metrics.length} metrics from Shopify\`);
      }

      for (const metric of metrics) {
        if (options.dryRun || connectionError) {
          console.log(\`  📊 [DRY RUN] Would upsert metric: \${metric.metric_date}\`);
          totalSkipped++;
          continue;
        }
        
        const { data: existingMetric, error: checkError } = await supabase
          .from('metrics')
          .select('id')
          .eq('store_id', STORE_CONFIG.id)
          .eq('metric_date', metric.metric_date)
          .single();
        
        let result;
        if (existingMetric) {
          const { error: updateError } = await supabase
            .from('metrics')
            .update(metric)
            .eq('id', existingMetric.id);
          result = updateError;
          if (!updateError) totalUpdated++;
        } else {
          const { error: insertError } = await supabase
            .from('metrics')
            .insert([metric]);
          result = insertError;
          if (!insertError) totalInserted++;
        }
        
        if (result && metrics.indexOf(metric) === 0) {
          console.error('  ❌ Error syncing metrics:', result.message);
        }
      }
    }`;

lines = [
  ...lines.slice(0, startIdx),
  newMetricsSection,
  ...lines.slice(endIdx)
];

fs.writeFileSync('hermes-to-supabase.js', lines.join('\n'));
console.log('Replaced metrics section successfully');
