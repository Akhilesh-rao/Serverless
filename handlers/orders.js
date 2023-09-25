const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'Orders';

exports.handler = async (event) => {
    try {
        // Extract query parameters
        const user_id = event.queryStringParameters.userID;

        if (!user_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'User ID is required in the query parameter' })
            };
        }

        // Query for all orders of the specific user
        const response = await dynamodb.query({
            TableName: tableName,
            KeyConditionExpression: 'User_ID = :user_id',
            ExpressionAttributeValues: {
                ':user_id': user_id
            }
        }).promise();

        // Get the list of orders for the user
        const orders = response.Items || [];

        if (orders.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify('No Orders')
            };
        }

        const cleaned_orders = orders.map((order) => ({
            Payment_Method: order.Payment_Method,
            shippingAddress: order.shippingAddress,
            car_item: order.car_item,
            Total_Price: parseFloat(order.Total_Price)
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ Orders: cleaned_orders })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.toString() })
        };
    }
};
