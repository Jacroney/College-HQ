"""
Add this code to your existing profile Lambda function to handle Cognito JWT tokens
"""

import json
import jwt
from jwt import PyJWTError
import requests
import os
from typing import Dict, Any, Optional

# Cognito configuration - add these environment variables to your Lambda
COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')  # Set this in your Lambda env vars
COGNITO_CLIENT_ID = os.environ.get('COGNITO_CLIENT_ID')        # Set this in your Lambda env vars

def extract_user_from_token(event) -> Optional[Dict[str, Any]]:
    """
    Extract user information from Cognito JWT token
    Add this function to your existing Lambda
    """
    try:
        # Get Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            print("No valid Authorization header found")
            return None
            
        token = auth_header.split(' ')[1]
        
        # Get Cognito public keys (consider caching this in production)
        jwks_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        jwks_response = requests.get(jwks_url)
        jwks = jwks_response.json()
        
        # Decode token header to get key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header['kid']
        
        # Find the correct key
        key = None
        for jwk in jwks['keys']:
            if jwk['kid'] == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                break
                
        if not key:
            print(f"No matching key found for kid: {kid}")
            return None
            
        # Verify and decode token
        payload = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=COGNITO_CLIENT_ID,
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
        )
        
        print(f"Successfully validated token for user: {payload.get('sub')}")
        return payload
        
    except PyJWTError as e:
        print(f"JWT validation error: {str(e)}")
        return None
    except Exception as e:
        print(f"Error extracting user from token: {str(e)}")
        return None

def get_user_id_from_token(event) -> Optional[str]:
    """
    Simplified function to just get the user_id (Cognito sub) from the token
    Use this in your existing Lambda handlers
    """
    user_info = extract_user_from_token(event)
    if user_info:
        return user_info.get('sub')  # This is the Cognito sub UUID
    return None

def create_user_from_cognito_info(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new user record using Cognito user information
    This matches your existing DynamoDB schema
    """
    import uuid
    from datetime import datetime
    
    now = datetime.utcnow().isoformat() + 'Z'
    
    return {
        'user_id': user_info['sub'],  # Use Cognito sub as user_id
        'email': user_info.get('email', ''),
        'firstName': user_info.get('given_name', ''),
        'lastName': user_info.get('family_name', ''),
        'studentId': '',
        'academicInterests': [],
        'academicYear': '',
        'advisorEmail': '',
        'advisorName': '',
        'advisorNotes': '',
        'careerGoals': [],
        'college': '',
        'completed_courses': [],
        'completedCourses': [],
        'concentration': '',
        'current_courses': [],
        'currentCourses': [],
        'currentGPA': 0.0,
        'currentSemesterCredits': 0,
        'expectedGraduation': '',
        'gpa': 0.0,
        'learningStyle': '',
        'major': '',
        'minor': '',
        'planned_courses': [],
        'plannedCourses': [],
        'total_credits': 0,
        'totalCredits': 0,
        'university': '',
        'university_country': '',
        'university_domain': '',
        'created_at': now,
        'updated_at': now
    }

# Example of how to modify your existing Lambda handler:
def lambda_handler(event, context):
    """
    Update your existing lambda_handler to use Cognito authentication
    """
    try:
        # Extract user ID from Cognito JWT token
        user_id = get_user_id_from_token(event)
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Unauthorized - Invalid or missing token'})
            }
        
        # Now use user_id (which is Cognito sub) for your DynamoDB operations
        http_method = event.get('httpMethod')
        
        if http_method == 'GET':
            return get_user_profile(user_id, event)
        elif http_method == 'PUT':
            return update_user_profile(user_id, event)
        elif http_method == 'POST':
            return create_user_profile(user_id, event)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error'})
        }

def get_user_profile(user_id: str, event):
    """
    Example of updating your existing get profile function
    Replace your existing function with this pattern
    """
    import boto3
    from botocore.exceptions import ClientError
    
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('your-users-table-name')  # Update with your table name
    
    try:
        # Use user_id (Cognito sub) as the key
        response = table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in response:
            # User doesn't exist, create them automatically
            user_info = extract_user_from_token(event)
            if user_info:
                new_user = create_user_from_cognito_info(user_info)
                table.put_item(Item=new_user)
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(new_user)
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'})
                }
        
        user_data = response['Item']
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(user_data)
        }
        
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database error'})
        }

def update_user_profile(user_id: str, event):
    """
    Example of updating your existing update profile function  
    Replace your existing function with this pattern
    """
    import boto3
    from botocore.exceptions import ClientError
    from datetime import datetime
    
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('your-users-table-name')  # Update with your table name
    
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Add updated timestamp
        body['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        
        # Build update expression
        update_expression = "SET "
        expression_attribute_values = {}
        
        for key, value in body.items():
            if key != 'user_id':  # Don't update the primary key
                update_expression += f"{key} = :{key}, "
                expression_attribute_values[f":{key}"] = value
        
        update_expression = update_expression.rstrip(', ')
        
        # Update the item
        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        # Return the updated item
        return get_user_profile(user_id, event)
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid JSON'})
        }
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database error'})
        }