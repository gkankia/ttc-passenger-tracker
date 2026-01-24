const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, ...params } = JSON.parse(event.body || '{}');
    let data;

    switch (action) {
      case 'stops':
        const stopsRes = await fetch('https://transfer.msplus.ge:2443/otp/routers/ttc/index/stops');
        const stopsData = await stopsRes.json();
        
        // Log to see what we're getting
        console.log('Stops response type:', typeof stopsData);
        console.log('Stops response keys:', Object.keys(stopsData).slice(0, 5));
        
        // Convert object to array if needed
        if (Array.isArray(stopsData)) {
          data = stopsData;
        } else if (typeof stopsData === 'object') {
          data = Object.values(stopsData);
        } else {
          data = [];
        }
        break;

      case 'arrivals':
        const { stopId } = params;
        const arrivalsRes = await fetch(`https://transfer.msplus.ge:2443/otp/routers/ttc/index/stops/${stopId}/stoptimes`);
        data = await arrivalsRes.json();
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};