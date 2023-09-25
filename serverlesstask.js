const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const orderTableName = 'Order_ID';
const orderStatusTableName = 'Order_Status';
const checkoutTableName = 'Orders';
const userTableName = 'Registration';

exports.handler = async (event) => {
    try {
        const details = JSON.parse(event.body);

        if (!details) {
            return {
                statusCode: 400,
                body: JSON.stringify('No data provided')
            };
        }

        const userid = details.userID;
        const shippingaddress = details.shippingAddress;
        const paymentmethod = details.paymentMethod;
        const cart_items = details.cartItems;

        // Check if the user exists
        const userExists = await checkUserExists(userid);

        if (!userExists) {
            return {
                statusCode: 400,
                body: JSON.stringify('User does not exist')
            };
        }

        // Check if the order for this user with the same details already exists
        const existingOrder = await checkExistingOrder(userid, details);

        if (existingOrder) {
            return {
                statusCode: 400,
                body: JSON.stringify('Order with the same details already exists')
            };
        }

        // Rest of your code

        const cart_items_dynamodb = cart_items.map((item) => ({
            product_id: item.productId,
            quantity: String(item.Quantity)
        }));

        const orderTableParams = {
            TableName: orderTableName,
            ProjectionExpression: 'CounterID, LastOrderID'
        };

        const data = await dynamodb.scan(orderTableParams).promise();

        const last_order_id = data.Items.length > 0 ? parseInt(data.Items[0].LastOrderID) : 0;
        const new_order_id = last_order_id + 1;

        const product_ids = cart_items.map((item) => item.productId);

        const batchGetParams = {
            RequestItems: {
                'Products': {
                    Keys: product_ids.map((product_id) => ({
                        // Correct the structure here
                        ProductID: {
                            S: product_id // Assuming ProductID is of type String (adjust as needed)
                        }
                    }))
                }
            }
        };

        const productDetailsResponse = await client.batchGetItem(batchGetParams).promise();
        const Product_details = productDetailsResponse.Responses.Products;

        const product_id_price_list = Product_details.map((product) => {
            const product_id = product.ProductID.S; // Access the String value
            const price = 'Price' in product ? parseFloat(product.Price.N) : 0.0; // Access the Number value
            return {
                ProductID: product_id,
                Price: price
            };
        });

        let total_price = 0;

        for (const item of cart_items) {
            for (const product of product_id_price_list) {
                if (item.productId === product.ProductID) {
                    total_price += item.Quantity * product.Price;
                }
            }
        }

        const checkout_data = {
            Order_ID: String(new_order_id),
            User_ID: userid,
            shippingAddress: shippingaddress,
            Total_Price: total_price,
            Payment_Method: paymentmethod,
            car_item: cart_items_dynamodb
        };

        const params2 = {
            TableName: checkoutTableName,
            Item: checkout_data
        };

        await dynamodb.put(params2).promise();

        const updateOrderParams = {
            TableName: orderTableName,
            Key: { 'CounterID': data.Items[0].CounterID },
            UpdateExpression: 'SET LastOrderID = :newOrderID',
            ExpressionAttributeValues: { ':newOrderID': new_order_id }
        };

        await dynamodb.update(updateOrderParams).promise();

        const orderStatusParams = {
            TableName: orderStatusTableName,
            Item: {
                Order_ID: String(new_order_id),
                Status: 'Order Placed'
            }
        };

        await dynamodb.put(orderStatusParams).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order Placed Successfully..' })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.toString() })
        };
    }
};

async function checkUserExists(userId) {
    const params = {
        TableName: userTableName,
        Key: { 'ID': userId }
    };

    try {
        const user = await dynamodb.get(params).promise();
        return !!user.Item;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}

async function checkExistingOrder(userId, orderDetails) {
    const params = {
        TableName: checkoutTableName,
        FilterExpression: 'User_ID = :userId AND shippingAddress = :shippingAddress AND Payment_Method = :paymentMethod',
        ExpressionAttributeValues: {
            ':userId': userId,
            ':shippingAddress': orderDetails.shippingAddress,
            ':paymentMethod': orderDetails.paymentMethod
        }
    };

    try {
        const existingOrders = await dynamodb.scan(params).promise();
        return existingOrders.Items.length > 0;
    } catch (error) {
        console.error('Error checking existing order:', error);
        return false;
    }
}
