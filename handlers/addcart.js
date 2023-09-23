const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        // Parse the request body
        const { user_id, product_id } = JSON.parse(event.body);

        // Check if user_id and product_id are provided
        if (!user_id || !product_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Both user_id and product_id are required" })
            };
        }

        // Validate user existence
        const usersTable = await dynamodb.get({
            TableName: 'Registration',
            Key: { 'ID': user_id }
        }).promise();

        if (!usersTable.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "User Not Found" })
            };
        }

        // Validate product existence
        const productsTable = await dynamodb.scan({
            TableName: 'Products',
            FilterExpression: 'ProductID = :product_id',
            ExpressionAttributeValues: { ':product_id': product_id }
        }).promise();

        const products = productsTable.Items || [];

        // Convert Decimal values to floats
        products.forEach((product) => {
            for (const key in product) {
                if (typeof product[key] === 'number') {
                    product[key] = parseFloat(product[key]);
                }
            }
        });

        if (products.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Product Not Found" })
            };
        }

        // Check if the product is already in the user's cart
        const cartItem = await dynamodb.get({
            TableName: 'Cart',
            Key: {
                'User_ID': user_id,
                'Product_ID': product_id
            }
        }).promise();

        if (cartItem.Item) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Product is already in the cart" })
            };
        }

        // Update cart table
        await dynamodb.put({
            TableName: 'Cart',
            Item: {
                'User_ID': user_id,
                'Product_ID': product_id
            }
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ Message: 'Product Successfully Added to the Cart' })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.toString() })
        };
    }
};
