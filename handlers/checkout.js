const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const client = new AWS.DynamoDB();
const orderTableName = 'Order_ID';
const orderStatusTableName = 'Order_Status';
const checkoutTableName = 'Orders';

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
                        ProductID: product_id
                    }))
                }
            }
        };

        const productDetailsResponse = await client.batchGetItem(batchGetParams).promise();
        const Product_details = productDetailsResponse.Responses.Products;

        const product_id_price_list = Product_details.map((product) => {
            const product_id = product.ProductID;
            const price = 'Price' in product ? parseFloat(product.Price) : 0.0;
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
