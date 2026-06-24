const cron = require('node-cron');

// Get the app URL from environment or use default
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Run every day at 12:00 AM GMT
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Running daily devotion generation at:', new Date().toISOString());
  
  try {
    const response = await fetch(`${appUrl}/api/generate-devotion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Devotion generated successfully!');
      console.log('📖 Title:', data.devotion?.title || 'N/A');
      console.log('📅 Date:', data.devotion?.date || 'N/A');
      if (data.alreadyExists) {
        console.log('ℹ️ (Devotion already existed for today)');
      }
    } else {
      console.error('❌ Failed to generate devotion:', data.error);
    }
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }
}, {
  timezone: "GMT"
});

console.log('⏰ Cron scheduler started. Waiting for midnight GMT...');
console.log('Current time:', new Date().toISOString());
console.log('📡 Will call:', `${appUrl}/api/generate-devotion`);
console.log('💡 Keep this process running for automatic generation.');

// Keep the process running
setInterval(() => {}, 1000);