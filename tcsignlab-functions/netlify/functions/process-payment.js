// netlify/functions/process-payment.js
const { Client, Environment } = require('square');

// Initialize Square client with your credentials
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || 'EAAAlyFYQ1PjVqF0bh0RSwE5tAgiII2jAFNRyBfufgPwuRZc6QZmpdoGWZbMK0hP',
  environment: Environment.Sandbox // Change to Environment.Production for live payments
});

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    const body = JSON.parse(event.body);
    
    console.log('Processing payment for:', body.customer.email);
    console.log('Amount:', body.amountMoney.amount);
    
    // Convert amount to BigInt for Square API
    const amountInCents = BigInt(body.amountMoney.amount);
    
    // Create payment with Square
    const response = await client.paymentsApi.createPayment({
      sourceId: body.sourceId,
      amountMoney: {
        amount: amountInCents,
        currency: body.amountMoney.currency
      },
      locationId: body.locationId,
      idempotencyKey: body.idempotencyKey,
      note: `TC SignLab Order - ${body.orderDetails.size} ${body.orderDetails.material}`,
      buyerEmailAddress: body.customer.email
    });
    
    console.log('✅ Payment successful:', response.result.payment.id);
    
    // Convert BigInt back to number for JSON response
    const amountPaid = Number(response.result.payment.amountMoney.amount) / 100;
    
    // Payment successful
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: response.result.payment.id,
        amount: `$${amountPaid.toFixed(2)}`,
        receiptUrl: response.result.payment.receiptUrl
      })
    };
    
  } catch (error) {
    console.error('❌ Payment error:', error);
    
    // Return error details
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed',
        details: error.errors || []
      })
    };
  }
};
