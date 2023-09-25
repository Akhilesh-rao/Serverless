const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'Cart';

exports.handler = async (event) => {
    try {
        // Check if the query parameters are provided
        if (!event.queryStringParameters || !event.queryStringParameters.UserID || !event.queryStringParameters.ProductID) {
            return {
                statusCode: 400,
                body: JSON.stringify({ Message: 'Both UserID and ProductID query parameters are required.' })
            };
        }

        // Extract query parameters
        const user_id = event.queryStringParameters.UserID;
        const product_id = event.queryStringParameters.ProductID;

        const response = await dynamodb.get({
            TableName: tableName,
            Key: {
                'User_ID': user_id,
                'Product_ID': product_id
            }
        }).promise();

        const item_data = response.Item || {};

        if (!Object.keys(item_data).length) {
            return {
                statusCode: 404,
                body: JSON.stringify({ Message: 'Product is not available in the cart' })
            };
        }

        // Delete the cart entry
        await dynamodb.delete({
            TableName: tableName,
            Key: {
                'User_ID': user_id,
                'Product_ID': product_id
            }
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ Message: 'Product in the cart deleted successfully.' })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.toString() })
        };
    }
};
