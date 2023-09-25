const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const orderStatusTableName = 'Order_Status';

exports.handler = async (event) => {
    try {
        // Check if orderID is provided in the pathParameters
        if (!event.pathParameters || !event.pathParameters.order_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Order ID is required' })
            };
        }

        const order_id = event.pathParameters.order_id;

        const params = {
            TableName: orderStatusTableName,
            Key: {
                'Order_ID': order_id
            }
        };

        const response = await dynamodb.get(params).promise();

        // Check if the order ID exists in the DynamoDB table
        if (!response.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Order Not Found' })
            };
        }

        const status = response.Item.Status;

        return {
            statusCode: 200,
            body: JSON.stringify({ [`Status of your order ${order_id}`]: status })
        };
    } catch (error) {
        // Catch any exceptions and return a 500 error response
        const error_message = error.toString();
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', message: error_message })
        };
    }
};
