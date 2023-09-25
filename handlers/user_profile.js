const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const userTableName = 'Registration';

exports.handler = async (event) => {
    try {
        const queryParameters = event.queryStringParameters;
        // Check if the 'user_id' parameter exists
        if (!queryParameters.user_id) {
            return {
                statusCode: 400,
                body: JSON.stringify('UserID query parameter is missing')
            };
        }

        const userId = queryParameters.user_id;

        // Check if 'user_id' is not provided
        if (!userId) {
            return {
                statusCode: 500,
                body: JSON.stringify('Enter a User ID')
            };
        }

        const params = {
            TableName: userTableName,
            Key: { 'ID': userId }
        };

        const user = await dynamodb.get(params).promise();
        const itemData = user.Item || {};

        if (!itemData) {
            return {
                statusCode: 404, // Not Found
                body: JSON.stringify({ 'error': 'User Not Found' })
            };
        }

        // Remove the "Password" key from the "Item" dictionary
        if (itemData.Password) {
            delete itemData.Password;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                'User Name': itemData.Name,
                'Email': itemData.Email,
                'Shipping Address': itemData.ShippingAddress
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 'error': err.toString() })
        };
    }
};
