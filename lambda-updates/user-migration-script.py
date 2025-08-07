"""
Migration script to update existing user records to use Cognito sub as user_id

IMPORTANT: 
1. Test this on a backup of your table first
2. This assumes you can match existing users to Cognito users by email
3. Run this after your users have logged in at least once with Cognito
"""

import boto3
import json
from botocore.exceptions import ClientError
from typing import Dict, List, Optional

def migrate_users_to_cognito_sub():
    """
    Migrate existing users to use Cognito sub as user_id
    """
    dynamodb = boto3.resource('dynamodb')
    cognito = boto3.client('cognito-idp')
    
    # Update these with your actual values
    TABLE_NAME = 'your-users-table-name'  # Your existing table name
    USER_POOL_ID = 'us-east-1_yourPoolId'  # Your Cognito User Pool ID
    
    table = dynamodb.Table(TABLE_NAME)
    
    try:
        # 1. Scan all existing users
        print("Scanning existing users...")
        response = table.scan()
        existing_users = response['Items']
        
        # Handle pagination if you have many users
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            existing_users.extend(response['Items'])
        
        print(f"Found {len(existing_users)} existing users")
        
        # 2. For each user, find their Cognito sub by email
        migration_plan = []
        
        for user in existing_users:
            email = user.get('email')
            if not email:
                print(f"Skipping user {user.get('user_id')} - no email")
                continue
            
            # Find Cognito user by email
            cognito_sub = get_cognito_sub_by_email(cognito, USER_POOL_ID, email)
            
            if cognito_sub:
                migration_plan.append({
                    'old_user_id': user['user_id'],
                    'new_user_id': cognito_sub,  # This is the Cognito sub
                    'email': email,
                    'user_data': user
                })
                print(f"✓ Mapped {email}: {user['user_id']} -> {cognito_sub}")
            else:
                print(f"✗ Could not find Cognito user for email: {email}")
        
        print(f"\nMigration plan ready for {len(migration_plan)} users")
        
        # 3. Ask for confirmation
        confirm = input("Do you want to proceed with the migration? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Migration cancelled")
            return
        
        # 4. Execute migration
        execute_migration(table, migration_plan)
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")

def get_cognito_sub_by_email(cognito_client, user_pool_id: str, email: str) -> Optional[str]:
    """
    Find Cognito user sub by email address
    """
    try:
        response = cognito_client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"'
        )
        
        if response['Users']:
            # Get the sub from user attributes
            user = response['Users'][0]
            for attr in user['Attributes']:
                if attr['Name'] == 'sub':
                    return attr['Value']
        
        return None
        
    except ClientError as e:
        print(f"Error looking up Cognito user for {email}: {str(e)}")
        return None

def execute_migration(table, migration_plan: List[Dict]):
    """
    Execute the actual migration
    """
    print("\nStarting migration...")
    
    successful_migrations = 0
    failed_migrations = 0
    
    for item in migration_plan:
        try:
            old_user_id = item['old_user_id']
            new_user_id = item['new_user_id']
            user_data = item['user_data'].copy()
            
            # Update the user_id to Cognito sub
            user_data['user_id'] = new_user_id
            
            # Add migration metadata
            user_data['migrated_from'] = old_user_id
            user_data['migration_date'] = boto3.Session().region_name
            
            # Use a transaction to ensure atomicity
            with table.batch_writer() as batch:
                # Create new record with Cognito sub as user_id
                batch.put_item(Item=user_data)
                
                # Delete old record (optional - you might want to keep for backup)
                # batch.delete_item(Key={'user_id': old_user_id})
            
            print(f"✓ Migrated {item['email']}: {old_user_id} -> {new_user_id}")
            successful_migrations += 1
            
        except Exception as e:
            print(f"✗ Failed to migrate {item['email']}: {str(e)}")
            failed_migrations += 1
    
    print(f"\nMigration completed:")
    print(f"✓ Successful: {successful_migrations}")
    print(f"✗ Failed: {failed_migrations}")
    
    if failed_migrations == 0:
        print("\n🎉 All users migrated successfully!")
        print("\nNext steps:")
        print("1. Update your Lambda function to use the new JWT authentication")
        print("2. Test the new authentication flow")
        print("3. Consider cleaning up old user records")

def cleanup_old_records():
    """
    Optional: Clean up old user records after successful migration
    Only run this after confirming the migration worked properly!
    """
    dynamodb = boto3.resource('dynamodb')
    TABLE_NAME = 'your-users-table-name'
    table = dynamodb.Table(TABLE_NAME)
    
    print("⚠️  WARNING: This will delete old user records!")
    print("Make sure your migration was successful first!")
    
    confirm = input("Are you sure you want to delete old records? (DELETE/no): ")
    if confirm != 'DELETE':
        print("Cleanup cancelled")
        return
    
    try:
        # Find records that have 'migrated_from' field (these are new records)
        # and delete the corresponding old records
        response = table.scan(
            FilterExpression='attribute_exists(migrated_from)'
        )
        
        with table.batch_writer() as batch:
            for item in response['Items']:
                old_user_id = item.get('migrated_from')
                if old_user_id:
                    batch.delete_item(Key={'user_id': old_user_id})
                    print(f"Deleted old record: {old_user_id}")
        
        print("✓ Cleanup completed")
        
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")

if __name__ == "__main__":
    print("College HQ User Migration Script")
    print("================================")
    print("This script will migrate your existing users to use Cognito sub as user_id")
    print()
    
    migrate_users_to_cognito_sub()