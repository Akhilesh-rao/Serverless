const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'Registration';

exports.handler = async (event) => {
    try {
        const requestBody = JSON.parse(event.body);
        const { UserID, Name, Email, ShippingAddress } = requestBody;

        if (!UserID) {
            return {
                statusCode: 400,
                body: JSON.stringify({ Message: 'UserID is required' })
            };
        }

        const userExists = await checkUserExists(UserID);

        if (!userExists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ Message: 'User Not Found' })
            };
        }

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        if (Name) {
            updateExpression.push('#N = :n');
            expressionAttributeValues[':n'] = Name;
            expressionAttributeNames['#N'] = 'Name';
        }
        if (Email) {
            updateExpression.push('#E = :e');
            expressionAttributeValues[':e'] = Email;
            expressionAttributeNames['#E'] = 'Email';
        }
        if (ShippingAddress) {
            updateExpression.push('#SA = :sa');
            expressionAttributeValues[':sa'] = ShippingAddress;
            expressionAttributeNames['#SA'] = 'ShippingAddress';
        }

        const updateParams = {
            TableName: tableName,
            Key: { 'ID': UserID },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ConditionExpression: 'attribute_exists(ID)' // Ensure the item exists before updating
        };

        await dynamodb.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ Message: 'Profile Updated Successfully' })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.toString() })
        };
    }
};

async function checkUserExists(userId) {
    const response = await dynamodb.get({
        TableName: tableName,
        Key: { 'ID': userId }
    }).promise();

    return !!response.Item;
}
