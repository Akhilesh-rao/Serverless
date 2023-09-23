const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const table_name = 'Registration';

exports.handler = async (event) => {
    try {
        const request_body = JSON.parse(event.body);
        const name = request_body.name;
        var user_id = request_body.id;
        const email = request_body.email;
        const password = request_body.password;
        const shipping_address = request_body.shipping_address;

        if (name || email || password || shipping_address || user_id) {
            const params = {
                TableName: table_name,
                Item: {
                    'ID': user_id,
                    'Email': email,
                    'Name': name,
                    'Password': password,
                    'ShippingAddress': shipping_address
                },
                ConditionExpression: 'attribute_not_exists(ID)', // Check if ID already exists
            };

            await dynamodb.put(params).promise();

            const response = {
                statusCode: 201,
                body: JSON.stringify({ message: 'User registered successfully' }),
            };

            return response;
        } else {
            const response = {
                statusCode: 400,
                body: JSON.stringify({ message: 'User registration failed' }),
            };

            return response;
        }
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            const error_message = `User with ID ${user_id} already exists`;
            return {
                statusCode: 409,
                body: JSON.stringify({ error: error_message }),
            };
        } else {
            const error_message = `Failed to register user: ${error.message}`;
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error_message }),
            };
        }
    }
};
