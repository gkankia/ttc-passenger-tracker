const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { action, ...params } = JSON.parse(event.body || '{}');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let data;

    switch (action) {
      case 'stops':
        // Get all stops
        const stopsRes = await fetch('https://transfer.msplus.ge:2443/otp/routers/ttc/index/stops');
        data = await stopsRes.json();
        break;

      case 'arrivals':
        // Get arrival times for a specific stop
        const { stopId } = params;
        const arrivalsRes = await fetch(`https://transfer.msplus.ge:2443/otp/routers/ttc/index/stops/${stopId}/stoptimes`);
        data = await arrivalsRes.json();
        break;

      case 'routes':
        // Get all routes
        const routesRes = await fetch('https://transfer.msplus.ge:2443/otp/routers/ttc/index/routes');
        data = await routesRes.json();
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};