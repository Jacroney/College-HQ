#!/usr/bin/env python3
"""
Perfect Cal Poly San Luis Obispo Course Catalog Scraper
Production-quality scraper with robust error handling and parsing
"""

import requests
from bs4 import BeautifulSoup
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import re
import json
import time
from typing import List, Dict, Optional, Tuple
import logging
from dataclasses import dataclass
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scraper.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CourseInfo:
    """Data class for course information"""
    code: str
    name: str
    units: int
    description: str
    prerequisites: List[str]
    department: str
    difficulty: str

class CalPolyCourseScraper:
    """Perfect Cal Poly course catalog scraper"""
    
    def __init__(self, aws_region: str = 'us-east-1', table_name: str = 'college-hq-course-catalog'):
        """Initialize the scraper"""
        self.aws_region = aws_region
        self.table_name = table_name
        self.university = "Cal Poly San Luis Obispo"
        
        # Setup HTTP session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
        # Course departments and their full names
        self.departments = {
            'CSC': 'Computer Science',
            'MATH': 'Mathematics',
            'STAT': 'Statistics',
            'PHYS': 'Physics',
            'ENGL': 'English',
            'CHEM': 'Chemistry',
            'BIO': 'Biology'
        }
        
        # Initialize AWS resources
        self.dynamodb = None
        self.table = None
        self._init_aws()
    
    def _init_aws(self) -> None:
        """Initialize AWS DynamoDB connection"""
        try:
            self.dynamodb = boto3.resource('dynamodb', region_name=self.aws_region)
            self.table = self.dynamodb.Table(self.table_name)
            logger.info("AWS DynamoDB client initialized successfully")
        except NoCredentialsError:
            logger.error("AWS credentials not found. Please configure your AWS credentials.")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize AWS resources: {e}")
            raise
    
    def test_connections(self) -> bool:
        """Test both internet and DynamoDB connections"""
        logger.info("Testing connections...")
        
        # Test internet connection
        try:
            response = self.session.get('https://catalog.calpoly.edu', timeout=10)
            response.raise_for_status()
            logger.info("✅ Internet connection successful")
        except Exception as e:
            logger.error(f"❌ Internet connection failed: {e}")
            return False
        
        # Test DynamoDB connection
        try:
            self.table.table_status
            logger.info("✅ DynamoDB connection successful")
            return True
        except Exception as e:
            logger.error(f"❌ DynamoDB connection failed: {e}")
            return False
    
    def get_course_page(self, department: str) -> Optional[BeautifulSoup]:
        """Get and parse course catalog page for a department"""
        url = f"https://catalog.calpoly.edu/coursesaz/{department.lower()}/"
        logger.info(f"Fetching course page for {department}: {url}")
        
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            logger.info(f"Successfully parsed page for {department}")
            return soup
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch page for {department}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to parse page for {department}: {e}")
            return None
    
    def extract_courses_from_page(self, soup: BeautifulSoup, department: str) -> List[CourseInfo]:
        """Extract course information from parsed HTML"""
        logger.info(f"Extracting courses for {department}")
        courses = []
        
        # Find course blocks using Cal Poly's specific structure
        course_blocks = soup.find_all('div', class_='courseblock')
        logger.info(f"Found {len(course_blocks)} course blocks")
        
        for i, block in enumerate(course_blocks):
            try:
                course = self._parse_course_block(block, department)
                if course:
                    courses.append(course)
                    logger.debug(f"Parsed course {i+1}: {course.code}")
                else:
                    logger.debug(f"Skipped invalid course block {i+1}")
                    
            except Exception as e:
                logger.warning(f"Error parsing course block {i+1}: {e}")
                continue
        
        logger.info(f"Successfully extracted {len(courses)} courses for {department}")
        return courses
    
    def _parse_course_block(self, block: BeautifulSoup, department: str) -> Optional[CourseInfo]:
        """Parse individual course block"""
        try:
            # Extract course title line
            title_elem = block.find('p', class_='courseblocktitle')
            if not title_elem:
                return None
            
            title_text = title_elem.get_text()
            
            # Parse course code and name
            # Pattern: "CSC 101. Fundamentals of Computer Science. 4 units"
            title_pattern = f'({department}\\s*\\xa0*\\s*\\d+[A-Z]*)\\.\\s*([^.]+?)\\.'
            title_match = re.search(title_pattern, title_text)
            
            if not title_match:
                logger.debug(f"Could not parse title: {title_text[:100]}")
                return None
            
            course_code = re.sub(r'\s+', ' ', title_match.group(1).replace('\xa0', ' ').strip())
            course_name = title_match.group(2).strip()
            
            # Extract units
            units_match = re.search(r'(\d+)\s*units?', title_text, re.IGNORECASE)
            units = int(units_match.group(1)) if units_match else 4
            
            # Extract description
            description = self._extract_description(block)
            
            # Extract prerequisites
            prerequisites = self._extract_prerequisites(block)
            
            # Determine difficulty level
            difficulty = self._determine_difficulty(course_code)
            
            return CourseInfo(
                code=course_code,
                name=course_name,
                units=units,
                description=description,
                prerequisites=prerequisites,
                department=self.departments.get(department, department),
                difficulty=difficulty
            )
            
        except Exception as e:
            logger.debug(f"Error parsing course block: {e}")
            return None
    
    def _extract_description(self, block: BeautifulSoup) -> str:
        """Extract course description from block"""
        try:
            # Look for description in various possible locations
            desc_selectors = [
                'div.courseblockdesc',
                'div.noindent',
                'div.coursepadding',
                'p:not(.courseblocktitle)'
            ]
            
            for selector in desc_selectors:
                desc_elem = block.select_one(selector)
                if desc_elem:
                    desc_text = desc_elem.get_text().strip()
                    # Clean up description
                    desc_text = re.sub(r'\s+', ' ', desc_text)
                    desc_text = re.sub(r'Prerequisite.*$', '', desc_text, flags=re.IGNORECASE)
                    
                    if len(desc_text) > 20:  # Valid description
                        return desc_text[:500] + ('...' if len(desc_text) > 500 else '')
            
            # Fallback: extract text from entire block excluding title
            all_text = block.get_text()
            lines = [line.strip() for line in all_text.split('\n') if line.strip()]
            
            # Skip first line (title) and find description
            for line in lines[1:]:
                if len(line) > 20 and not line.lower().startswith('prerequisite'):
                    return line[:500] + ('...' if len(line) > 500 else '')
            
            return "Course description not available"
            
        except Exception:
            return "Course description not available"
    
    def _extract_prerequisites(self, block: BeautifulSoup) -> List[str]:
        """Extract prerequisite courses from block"""
        try:
            text = block.get_text()
            
            # Look for prerequisite section
            prereq_pattern = r'Prerequisite[s]?[:\s]+(.*?)(?:\.|$|\n|\d+\s*units?)'
            prereq_match = re.search(prereq_pattern, text, re.IGNORECASE | re.DOTALL)
            
            if not prereq_match:
                return []
            
            prereq_text = prereq_match.group(1)
            
            # Extract course codes from prerequisite text
            course_pattern = r'[A-Z]{2,4}\s*\xa0*\s*\d+[A-Z]*'
            courses = re.findall(course_pattern, prereq_text)
            
            # Clean up course codes
            cleaned_courses = []
            for course in courses:
                cleaned = re.sub(r'\s+', ' ', course.replace('\xa0', ' ').strip())
                if cleaned not in cleaned_courses:
                    cleaned_courses.append(cleaned)
            
            return cleaned_courses
            
        except Exception:
            return []
    
    def _determine_difficulty(self, course_code: str) -> str:
        """Determine difficulty level based on course number"""
        try:
            number_match = re.search(r'(\d+)', course_code)
            if not number_match:
                return "Intermediate"
            
            number = int(number_match.group(1))
            
            if number < 200:
                return "Introductory"
            elif number < 300:
                return "Intermediate"
            elif number < 400:
                return "Advanced"
            else:
                return "Advanced"
                
        except Exception:
            return "Intermediate"
    
    def course_to_dynamodb_item(self, course: CourseInfo) -> Dict:
        """Convert CourseInfo to DynamoDB item format"""
        return {
            'university_course_id': f"calpoly_{course.code.lower().replace(' ', '')}",
            'university': self.university,
            'department': course.department,
            'course_code': course.code,
            'course_name': course.name,
            'units': course.units,
            'description': course.description,
            'prerequisites': course.prerequisites,
            'difficulty_level': course.difficulty,
            'typical_quarters': ["Fall", "Winter", "Spring"],
            'required_for_majors': self._get_required_majors(course.code),
            'last_updated': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def _get_required_majors(self, course_code: str) -> List[str]:
        """Determine which majors require this course"""
        majors = []
        
        if course_code.startswith('CSC'):
            number_match = re.search(r'(\d+)', course_code)
            if number_match:
                number = int(number_match.group(1))
                if number < 400:
                    majors = ["Computer Science", "Software Engineering"]
                else:
                    majors = ["Computer Science"]
        elif course_code.startswith('MATH'):
            number_match = re.search(r'(\d+)', course_code)
            if number_match and int(number_match.group(1)) in [141, 142, 143, 206, 244]:
                majors = ["Computer Science", "Engineering", "Mathematics"]
        elif course_code.startswith('STAT'):
            number_match = re.search(r'(\d+)', course_code)
            if number_match and int(number_match.group(1)) in [312, 313, 321]:
                majors = ["Computer Science", "Engineering"]
        
        return majors
    
    def save_courses_to_dynamodb(self, courses: List[CourseInfo]) -> Tuple[int, int]:
        """Save courses to DynamoDB and return (success_count, error_count)"""
        logger.info(f"Saving {len(courses)} courses to DynamoDB...")
        
        success_count = 0
        error_count = 0
        
        for course in courses:
            try:
                item = self.course_to_dynamodb_item(course)
                
                # Check if course already exists
                try:
                    existing = self.table.get_item(Key={'university_course_id': item['university_course_id']})
                    if 'Item' in existing:
                        logger.debug(f"Updating existing course: {course.code}")
                    else:
                        logger.debug(f"Creating new course: {course.code}")
                except Exception:
                    logger.debug(f"Creating new course: {course.code}")
                
                # Save/update course
                self.table.put_item(Item=item)
                success_count += 1
                
                # Rate limiting to avoid throttling
                time.sleep(0.1)
                
            except ClientError as e:
                error_count += 1
                logger.error(f"Failed to save course {course.code}: {e}")
            except Exception as e:
                error_count += 1
                logger.error(f"Unexpected error saving course {course.code}: {e}")
        
        logger.info(f"✅ Saved {success_count} courses successfully")
        if error_count > 0:
            logger.warning(f"❌ {error_count} courses failed to save")
        
        return success_count, error_count
    
    def scrape_department(self, department: str) -> Tuple[List[CourseInfo], bool]:
        """Scrape courses for a single department"""
        logger.info(f"🎯 Scraping {self.departments.get(department, department)} ({department})")
        
        # Get page content
        soup = self.get_course_page(department)
        if not soup:
            logger.error(f"Failed to get page for {department}")
            return [], False
        
        # Extract courses
        courses = self.extract_courses_from_page(soup, department)
        
        if not courses:
            logger.warning(f"No courses extracted for {department}")
            return [], False
        
        # Show sample courses
        logger.info(f"Sample courses from {department}:")
        for course in courses[:3]:
            logger.info(f"  📚 {course.code} - {course.name} ({course.units} units)")
        
        if len(courses) > 3:
            logger.info(f"  ... and {len(courses) - 3} more courses")
        
        return courses, True
    
    def scrape_all_departments(self, departments: Optional[List[str]] = None) -> Dict[str, any]:
        """Scrape courses for all or specified departments"""
        if departments is None:
            departments = list(self.departments.keys())
        
        logger.info(f"🚀 Starting scraping for departments: {', '.join(departments)}")
        
        results = {
            'total_courses': 0,
            'successful_departments': [],
            'failed_departments': [],
            'save_success': 0,
            'save_errors': 0
        }
        
        all_courses = []
        
        for dept in departments:
            logger.info(f"\n{'='*60}")
            
            courses, success = self.scrape_department(dept)
            
            if success and courses:
                all_courses.extend(courses)
                results['successful_departments'].append(dept)
                logger.info(f"✅ {dept}: {len(courses)} courses extracted")
            else:
                results['failed_departments'].append(dept)
                logger.warning(f"❌ {dept}: Failed to extract courses")
            
            # Be respectful to the server
            time.sleep(2)
        
        results['total_courses'] = len(all_courses)
        
        # Save all courses to DynamoDB
        if all_courses:
            logger.info(f"\n{'='*60}")
            success_count, error_count = self.save_courses_to_dynamodb(all_courses)
            results['save_success'] = success_count
            results['save_errors'] = error_count
        else:
            logger.warning("No courses to save!")
        
        return results
    
    def print_summary(self, results: Dict) -> None:
        """Print a nice summary of scraping results"""
        print(f"\n{'='*60}")
        print("🎓 SCRAPING COMPLETE - SUMMARY")
        print(f"{'='*60}")
        print(f"📊 Total Courses Scraped: {results['total_courses']}")
        print(f"✅ Successful Departments: {', '.join(results['successful_departments']) if results['successful_departments'] else 'None'}")
        print(f"❌ Failed Departments: {', '.join(results['failed_departments']) if results['failed_departments'] else 'None'}")
        print(f"💾 Courses Saved to DB: {results['save_success']}")
        print(f"⚠️  Save Errors: {results['save_errors']}")
        
        if results['total_courses'] > 0:
            print(f"\n🎉 SUCCESS! Your College HQ database now has {results['save_success']} Cal Poly courses!")
            print("🔥 Your AI advisor will be much smarter now!")
        else:
            print(f"\n😞 No courses were scraped. Check the logs for details.")
        
        print(f"{'='*60}")

def main():
    """Main function"""
    print("🎓 Perfect Cal Poly Course Catalog Scraper")
    print("=" * 60)
    
    try:
        # Initialize scraper
        scraper = CalPolyCourseScraper()
        
        # Test connections
        if not scraper.test_connections():
            print("❌ Connection tests failed. Please check your setup.")
            return 1
        
        print("\n🎯 Select scraping mode:")
        print("1. Scrape Computer Science only (recommended for testing)")
        print("2. Scrape CS + Math + Stats (recommended for CS majors)")
        print("3. Scrape all departments (full catalog)")
        print("4. Custom department list")
        
        while True:
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == "1":
                departments = ["CSC"]
                break
            elif choice == "2":
                departments = ["CSC", "MATH", "STAT"]
                break
            elif choice == "3":
                departments = None  # All departments
                break
            elif choice == "4":
                custom = input("Enter department codes (e.g., CSC,MATH,PHYS): ").strip()
                departments = [d.strip().upper() for d in custom.split(",")]
                break
            else:
                print("Invalid choice. Please enter 1, 2, 3, or 4.")
        
        # Confirm before starting
        dept_list = departments if departments else list(scraper.departments.keys())
        print(f"\n🚀 About to scrape: {', '.join(dept_list)}")
        confirm = input("Continue? (y/n): ").lower().strip()
        
        if confirm != 'y':
            print("Scraping cancelled.")
            return 0
        
        # Run the scraper
        results = scraper.scrape_all_departments(departments)
        
        # Print summary
        scraper.print_summary(results)
        
        return 0 if results['total_courses'] > 0 else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Scraping interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        print(f"❌ Scraping failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())