async function testAPI() {
    try {
        console.log('Testing TTC API directly...\n');
        
        // Test the new API endpoint
        console.log('1. Testing new API (transit.ttc.com.ge)...');
        const newApiResponse = await fetch('https://transit.ttc.com.ge/pis-gateway/api/v2/stops?locale=en', {
            headers: {
                'X-Api-Key': 'c0a2f304-551a-4d08-b8df-2c53ecd57f9f'
            }
        });
        
        if (newApiResponse.ok) {
            const newData = await newApiResponse.json();
            console.log('✅ New API works!');
            console.log('Stops count:', newData.length);
            console.log('First stop:', newData[0]);
            return;
        } else {
            console.log('❌ New API failed with status:', newApiResponse.status);
        }
        
    } catch (error) {
        console.log('❌ New API error:', error.message);
    }
    
    try {
        // Test the old API endpoint
        console.log('\n2. Testing old API (transfer.msplus.ge)...');
        const oldApiResponse = await fetch('https://transfer.msplus.ge:2443/otp/routers/ttc/index/stops');
        
        if (oldApiResponse.ok) {
            const oldData = await oldApiResponse.json();
            console.log('✅ Old API works!');
            console.log('Data type:', typeof oldData);
            console.log('First few keys:', Object.keys(oldData).slice(0, 5));
        } else {
            console.log('❌ Old API failed with status:', oldApiResponse.status);
        }
        
    } catch (error) {
        console.log('❌ Old API error:', error.message);
    }
}

testAPI();