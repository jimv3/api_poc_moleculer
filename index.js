// index.js
const { ServiceBroker } = require("moleculer");
const HTTPServer = require("moleculer-web");

// Create the broker for node-1
// Define nodeID and set the communication bus
const brokerNode1 = new ServiceBroker({
    nodeID: "node-1",
    transporter: "NATS"
});

// Create the "gateway" service
brokerNode1.createService({
    // Define service name
    name: "gateway",
    // Load the HTTP server
    mixins: [HTTPServer],

    settings: {
        routes: [
            {
                aliases: {
                    // When the "GET /products" request is made the "listProducts" action of "products" service is executed
                    "GET /products": "products.listProducts",
                    "GET /orders": "products.listOrders"
                }
            }
        ]
    }
});

// Create the broker for node-2
// Define nodeID and set the communication bus
const brokerNode2 = new ServiceBroker({
    nodeID: "node-2",
    transporter: "NATS"
});

const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

// Create the "products" service
brokerNode2.createService({
    // Define service name
    name: "products",

    actions: {
        // Define service action that returns the available products
        listProducts(ctx) {
            return [
                { name: "Apples", price: 5 },
                { name: "Oranges", price: 3 },
                { name: "Bananas", price: 2 }
            ];
        },
        async listOrders(ctx) {

            var authorizationInformation = await authenticate();
            const url = 'https://sandbox.walmartapis.com/v3/orders?status=Created';
            const options = {
                headers: {
                    'Authorization': authorizationInformation.authorization_key,
                    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
                    'WM_SVC.NAME': 'Test WM Service',
                    'Accept': 'application/json',
                    'WM_SEC.ACCESS_TOKEN': authorizationInformation.access_token,
                },
            }

            const res = await axios.get(url, options);

            return res.data;
        }
    }
});

async function authenticate() {
    const data = {
        grant_type: 'client_credentials',
    };

    const clientID = "6460f5b2-41d9-4300-a0c3-eae867c20c72";
    const clientSecret = "ANQOzVlmp5_ad5O4uPgrtScp88NpWR-y77Ts6MNgpTJFXo4ooi1eAKgnrsJZcHHn5PbsdPVrsTvRQGrHb5ROAQY";

    const authorizationKey = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
    const url = 'https://sandbox.walmartapis.com/v3/token';
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authorizationKey}`,
            'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
            'WM_SVC.NAME': 'Test WM Service',
            'Accept': 'application/json',
        },
    }

    const res = await axios.post(url, qs.stringify(data), options);
    console.log(res.data);
    return {
        access_token: res.data.access_token,
        token_type: res.data.token_type,
        expires_in: res.data.expires_in,
        authorization_key: `Basic ${authorizationKey}`,
    };
}

// Start both brokers
Promise.all([brokerNode1.start(), brokerNode2.start()]);