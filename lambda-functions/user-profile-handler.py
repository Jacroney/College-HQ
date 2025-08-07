import json
import boto3
from botocore.exceptions import ClientError
import jwt
from jwt import PyJWTError
import requests
import os
from typing import Dict, Any, Optional

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ.get('USERS_TABLE_NAME', 'college-hq-users'))

# Cognito configuration
COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')
COGNITO_CLIENT_ID = os.environ.get('COGNITO_CLIENT_ID')

def lambda_handler(event, context):
    """
    Main Lambda handler for user profile operations
    Handles GET, POST, PUT operations for user profiles
    """
    try:
        # Extract HTTP method and path
        http_method = event.get('httpMethod')
        path = event.get('path', '')
        
        # Extract and validate JWT token
        user_info = extract_user_from_token(event)
        if not user_info:
            return create_response(401, {'error': 'Unauthorized'})
        
        user_id = user_info['sub']  # Cognito sub as primary key
        
        # Route to appropriate handler
        if http_method == 'GET' and '/api/users/me' in path:
            return get_user_profile(user_id, user_info)
        elif http_method == 'PUT' and '/api/users/me' in path:
            return update_user_profile(event, user_id, user_info)
        elif http_method == 'POST' and '/api/users/profile' in path:
            return create_user_profile(event, user_id, user_info)
        else:
            return create_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def extract_user_from_token(event) -> Optional[Dict[str, Any]]:
    """
    Extract user information from Cognito JWT token
    """
    try:
        # Get Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        
        # Get Cognito public keys (you might want to cache this)
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
            return None
            
        # Verify and decode token
        payload = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=COGNITO_CLIENT_ID,
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
        )
        
        return payload
        
    except PyJWTError as e:
        print(f"JWT validation error: {str(e)}")
        return None
    except Exception as e:
        print(f"Error extracting user from token: {str(e)}")
        return None

def get_user_profile(user_id: str, user_info: Dict[str, Any]):
    """
    GET /api/users/me - Get user profile from DynamoDB
    """
    try:
        response = users_table.get_item(Key={'userId': user_id})
        
        if 'Item' not in response:
            # Profile doesn't exist - return 404
            return create_response(404, {'error': 'Profile not found'})
            
        # Convert DynamoDB item to profile format
        profile = response['Item']
        
        # Ensure all required fields exist with defaults
        profile_data = {
            'firstName': profile.get('firstName', ''),
            'lastName': profile.get('lastName', ''),
            'email': profile.get('email', user_info.get('email', '')),
            'studentId': profile.get('studentId', ''),
            'university': profile.get('university'),
            'college': profile.get('college', ''),
            'major': profile.get('major', ''),
            'concentration': profile.get('concentration', ''),
            'minor': profile.get('minor', ''),
            'academicYear': profile.get('academicYear', ''),
            'expectedGraduation': profile.get('expectedGraduation', ''),
            'gpa': float(profile.get('gpa', 0)),
            'totalCredits': int(profile.get('totalCredits', 0)),
            'currentSemesterCredits': int(profile.get('currentSemesterCredits', 0)),
            'careerGoals': profile.get('careerGoals', []),
            'learningStyle': profile.get('learningStyle', ''),
            'academicInterests': profile.get('academicInterests', []),
            'advisorName': profile.get('advisorName', ''),
            'advisorEmail': profile.get('advisorEmail', ''),
            'advisorNotes': profile.get('advisorNotes', ''),
            'completedCourses': profile.get('completedCourses', []),
            'currentCourses': profile.get('currentCourses', []),
            'plannedCourses': profile.get('plannedCourses', [])
        }
        
        return create_response(200, profile_data)
        
    except ClientError as e:
        print(f"DynamoDB error in get_user_profile: {str(e)}")
        return create_response(500, {'error': 'Database error'})

def create_user_profile(event, user_id: str, user_info: Dict[str, Any]):
    """
    POST /api/users/profile - Create initial user profile
    """
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Create initial profile with Cognito data
        profile_data = {
            'userId': user_id,  # Cognito sub as primary key
            'firstName': user_info.get('given_name', ''),
            'lastName': user_info.get('family_name', ''),
            'email': user_info.get('email', body.get('email', '')),
            'studentId': '',
            'university': None,
            'college': '',
            'major': '',
            'concentration': '',
            'minor': '',
            'academicYear': '',
            'expectedGraduation': '',
            'gpa': 0,
            'totalCredits': 0,
            'currentSemesterCredits': 0,
            'careerGoals': [],
            'learningStyle': '',
            'academicInterests': [],
            'advisorName': '',
            'advisorEmail': '',
            'advisorNotes': '',
            'completedCourses': [],
            'currentCourses': [],
            'plannedCourses': [],
            'createdAt': context.aws_request_id,  # Use request ID as timestamp
            'updatedAt': context.aws_request_id
        }
        
        # Check if profile already exists
        existing = users_table.get_item(Key={'userId': user_id})
        if 'Item' in existing:
            return create_response(409, {'error': 'Profile already exists'})
        
        # Create the profile
        users_table.put_item(Item=profile_data)
        
        return create_response(201, profile_data)
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except ClientError as e:
        print(f"DynamoDB error in create_user_profile: {str(e)}")
        return create_response(500, {'error': 'Database error'})

def update_user_profile(event, user_id: str, user_info: Dict[str, Any]):
    """
    PUT /api/users/me - Update user profile
    """
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Check if profile exists
        response = users_table.get_item(Key={'userId': user_id})
        if 'Item' not in response:
            # Auto-create profile if it doesn't exist
            create_event = {'body': json.dumps({'email': user_info.get('email', '')})}
            create_result = create_user_profile(create_event, user_id, user_info)
            if create_result['statusCode'] != 201:
                return create_result
        
        # Update the profile
        update_expression = "SET updatedAt = :updated"
        expression_values = {':updated': context.aws_request_id}
        
        # Build update expression for each field
        updatable_fields = [
            'firstName', 'lastName', 'studentId', 'university', 'college',
            'major', 'concentration', 'minor', 'academicYear', 'expectedGraduation',
            'gpa', 'totalCredits', 'currentSemesterCredits', 'careerGoals',
            'learningStyle', 'academicInterests', 'advisorName', 'advisorEmail',
            'advisorNotes', 'completedCourses', 'currentCourses', 'plannedCourses'
        ]
        
        for field in updatable_fields:
            if field in body:
                update_expression += f", {field} = :{field}"
                expression_values[f":{field}"] = body[field]
        
        # Perform the update
        users_table.update_item(
            Key={'userId': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Return updated profile
        return get_user_profile(user_id, user_info)
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except ClientError as e:
        print(f"DynamoDB error in update_user_profile: {str(e)}")
        return create_response(500, {'error': 'Database error'})

def sync_profile_from_cognito(user_id: str, user_info: Dict[str, Any]):
    """
    Sync basic user information from Cognito to DynamoDB
    This can be called periodically or on login
    """
    try:
        # Update basic info from Cognito
        users_table.update_item(
            Key={'userId': user_id},
            UpdateExpression="""
                SET email = :email, 
                    firstName = if_not_exists(firstName, :firstName),
                    lastName = if_not_exists(lastName, :lastName),
                    updatedAt = :updated
            """,
            ExpressionAttributeValues={
                ':email': user_info.get('email', ''),
                ':firstName': user_info.get('given_name', ''),
                ':lastName': user_info.get('family_name', ''),
                ':updated': context.aws_request_id
            }
        )
        
        return True
        
    except ClientError as e:
        print(f"Error syncing profile from Cognito: {str(e)}")
        return False

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a properly formatted Lambda response
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps(body)
    }