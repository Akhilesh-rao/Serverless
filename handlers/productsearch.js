const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const query_params = event.queryStringParameters || {};

        const keywords = query_params.keyword;
        if (!keywords) {
            return {
                statusCode: 400,
                body: JSON.stringify('Keyword is required to search for a product'),
            };
        }

        // Build the filter expression based on the provided query parameters
        var filter_expression = 'Keywords = :keywords';
        var expression_attribute_values = { ':keywords': keywords };

        // Optional query parameters
        const category = query_params.category;
        const subcategory = query_params.subcategory;
        const min_price = query_params.min_price;
        const max_price = query_params.max_price;

        if (category) {
            filter_expression += ' AND Category = :category';
            expression_attribute_values[':category'] = category;
        }
        if (subcategory) {
            filter_expression += ' AND Subcategory = :subcategory';
            expression_attribute_values[':subcategory'] = subcategory;
        }
        if (min_price) {
            console.log('Min Price:', min_price);
            filter_expression += ' AND Price >= :min_price';
            expression_attribute_values[':min_price'] = parseFloat(min_price); // Convert and round to 2 decimal places
        }
        if (max_price) {
            console.log('Max Price:', max_price);
            filter_expression += ' AND Price <= :max_price';
            expression_attribute_values[':max_price'] = parseFloat(max_price); // Convert and round to 2 decimal places
        }

        console.log('Filter Expression:', filter_expression);
        console.log('Expression Attribute Values:', expression_attribute_values);

        const params = {
            TableName: 'Products', // Replace with your actual table name
            FilterExpression: filter_expression,
            ExpressionAttributeValues: expression_attribute_values,
        };

        const response = await dynamodb.scan(params).promise();
        const products = response.Items || [];

        // Convert Decimal values to floats for JSON serialization
        products.forEach((product) => {
            if (product.Price) {
                product.Price = parseFloat(product.Price);
            }
        });

        console.log('Filtered Products:', products);

        if (products.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify(products),
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify('Product Not found'),
            };
        }
    } catch (error) {
        const error_message = `Failed to search for products: ${error.message}`;
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error_message }),
        };
    }
};
