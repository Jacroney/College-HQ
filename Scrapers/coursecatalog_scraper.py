#!/usr/bin/env python3
"""
Universal Course Catalog Scraper
Configurable scraper that works with any university's course catalog
"""

import requests
from bs4 import BeautifulSoup
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import re
import json
import time
from typing import List, Dict, Optional, Tuple, Any
import logging
from dataclasses import dataclass
import sys
import os
from urllib.parse import urljoin, urlparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('universal_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CourseInfo:
    """Universal data class for course information"""
    code: str
    name: str
    units: int
    description: str
    prerequisites: List[str]
    department: str
    difficulty: str
    university: str

@dataclass
class UniversityConfig:
    """Configuration for each university's scraping patterns"""
    name: str
    base_url: str
    catalog_url_pattern: str  # Pattern for department URLs
    course_block_selector: str
    title_selector: str
    title_pattern: str
    description_selectors: List[str]
    units_pattern: str
    prerequisite_patterns: List[str]
    departments: Dict[str, str]
    default_units: int = 3

class UniversalCourseCatalogScraper:
    """Universal course catalog scraper for any university"""
    
    def __init__(self, aws_region: str = 'us-east-1', table_name: str = 'college-hq-course-catalog'):
        """Initialize the universal scraper"""
        self.aws_region = aws_region
        self.table_name = table_name
        
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
        
        # Initialize AWS resources
        self.dynamodb = None
        self.table = None
        self._init_aws()
        
        # University configurations
        self.university_configs = self._load_university_configs()
        self.current_config = None
    
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
    
    def _load_university_configs(self) -> Dict[str, UniversityConfig]:
        """Load configurations for different universities"""
        return {
            'cal_poly': UniversityConfig(
                name="Cal Poly San Luis Obispo",
                base_url="https://catalog.calpoly.edu",
                catalog_url_pattern="https://catalog.calpoly.edu/coursesaz/{department}/",
                course_block_selector="div.courseblock",
                title_selector="p.courseblocktitle",
                title_pattern=r'({department}\s*\xa0*\s*\d+[A-Z]*)\.\s*([^.]+?)\.',
                description_selectors=["div.courseblockdesc", "div.noindent", "div.coursepadding", "p:not(.courseblocktitle)"],
                units_pattern=r'(\d+)\s*units?',
                prerequisite_patterns=[r'Prerequisite[s]?[:\s]+(.*?)(?:\.|$|\n|\d+\s*units?)'],
                departments={
                    'CSC': 'Computer Science',
                    'MATH': 'Mathematics',
                    'STAT': 'Statistics',
                    'PHYS': 'Physics',
                    'ENGL': 'English',
                    'CHEM': 'Chemistry',
                    'BIO': 'Biology',
                    'CPE': 'Computer Engineering',
                    'EE': 'Electrical Engineering'
                },
                default_units=4
            ),
            
            'uc_berkeley': UniversityConfig(
                name="UC Berkeley",
                base_url="https://classes.berkeley.edu",
                catalog_url_pattern="https://classes.berkeley.edu/search/class/{department}",
                course_block_selector="div.class-info",
                title_selector="h3.class-title",
                title_pattern=r'({department}\s+\d+[A-Z]*)\s*-\s*([^(]+)',
                description_selectors=["div.class-description", "div.description", "p.description"],
                units_pattern=r'(\d+)\s*units?',
                prerequisite_patterns=[r'Prerequisites?[:\s]+(.*?)(?:\.|$|\n)'],
                departments={
                    'CS': 'Computer Science',
                    'MATH': 'Mathematics',
                    'STAT': 'Statistics',
                    'PHYSICS': 'Physics',
                    'ENGLISH': 'English'
                },
                default_units=3
            ),
            
            'stanford': UniversityConfig(
                name="Stanford University",
                base_url="https://explorecourses.stanford.edu",
                catalog_url_pattern="https://explorecourses.stanford.edu/search?q={department}",
                course_block_selector="div.searchResult",
                title_selector="h3.courseTitle",
                title_pattern=r'({department}\s*\d+[A-Z]*)\.\s*([^.]+)',
                description_selectors=["div.courseDescription", "div.description"],
                units_pattern=r'(\d+)\s*units?',
                prerequisite_patterns=[r'Prerequisites?[:\s]+(.*?)(?:\.|$|\n)'],
                departments={
                    'CS': 'Computer Science',
                    'MATH': 'Mathematics',
                    'STATS': 'Statistics',
                    'PHYSICS': 'Physics',
                    'ENGLISH': 'English'
                },
                default_units=3
            ),
            
            'mit': UniversityConfig(
                name="MIT",
                base_url="http://catalog.mit.edu",
                catalog_url_pattern="http://catalog.mit.edu/subjects/{department}/",
                course_block_selector="div.course",
                title_selector="h3.course-title",
                title_pattern=r'({department}\.\d+[A-Z]*)\s*([^(]+)',
                description_selectors=["div.course-description", "p.description"],
                units_pattern=r'(\d+)-\d+-\d+',
                prerequisite_patterns=[r'Prerequisites?[:\s]+(.*?)(?:\.|$|\n)'],
                departments={
                    '6': 'Electrical Engineering and Computer Science',
                    '18': 'Mathematics',
                    '8': 'Physics',
                    '21L': 'Literature'
                },
                default_units=12
            )
        }
    
    def set_university(self, university_key: str) -> bool:
        """Set the current university configuration"""
        if university_key not in self.university_configs:
            logger.error(f"University '{university_key}' not supported. Available: {list(self.university_configs.keys())}")
            return False
        
        self.current_config = self.university_configs[university_key]
        logger.info(f"Set university to: {self.current_config.name}")
        return True
    
    def add_university_config(self, key: str, config: UniversityConfig) -> None:
        """Add a new university configuration"""
        self.university_configs[key] = config
        logger.info(f"Added configuration for: {config.name}")
    
    def test_connections(self) -> bool:
        """Test both internet and DynamoDB connections"""
        if not self.current_config:
            logger.error("No university configuration set. Call set_university() first.")
            return False
        
        logger.info("Testing connections...")
        
        # Test internet connection
        try:
            response = self.session.get(self.current_config.base_url, timeout=10)
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
        if not self.current_config:
            logger.error("No university configuration set")
            return None
        
        # Format the URL with department
        url = self.current_config.catalog_url_pattern.format(
            department=department.lower()
        )
        
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
        """Extract course information from parsed HTML using current config"""
        if not self.current_config:
            logger.error("No university configuration set")
            return []
        
        logger.info(f"Extracting courses for {department}")
        courses = []
        
        # Find course blocks using university-specific selector
        course_blocks = soup.select(self.current_config.course_block_selector)
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
        """Parse individual course block using current university config"""
        if not self.current_config:
            return None
        
        try:
            # Extract course title using university-specific selector
            title_elem = block.select_one(self.current_config.title_selector)
            if not title_elem:
                return None
            
            title_text = title_elem.get_text()
            
            # Parse course code and name using university-specific pattern
            title_pattern = self.current_config.title_pattern.format(department=department)
            title_match = re.search(title_pattern, title_text)
            
            if not title_match:
                logger.debug(f"Could not parse title: {title_text[:100]}")
                return None
            
            course_code = re.sub(r'\s+', ' ', title_match.group(1).replace('\xa0', ' ').strip())
            course_name = title_match.group(2).strip()
            
            # Extract units using university-specific pattern
            units_match = re.search(self.current_config.units_pattern, title_text, re.IGNORECASE)
            units = int(units_match.group(1)) if units_match else self.current_config.default_units
            
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
                department=self.current_config.departments.get(department, department),
                difficulty=difficulty,
                university=self.current_config.name
            )
            
        except Exception as e:
            logger.debug(f"Error parsing course block: {e}")
            return None
    
    def _extract_description(self, block: BeautifulSoup) -> str:
        """Extract course description using university-specific selectors"""
        if not self.current_config:
            return "Description not available"
        
        try:
            # Try each description selector in order
            for selector in self.current_config.description_selectors:
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
        """Extract prerequisite courses using university-specific patterns"""
        if not self.current_config:
            return []
        
        try:
            text = block.get_text()
            
            # Try each prerequisite pattern
            for pattern in self.current_config.prerequisite_patterns:
                prereq_match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                if prereq_match:
                    prereq_text = prereq_match.group(1)
                    
                    # Extract course codes from prerequisite text
                    course_pattern = r'[A-Z]{2,4}[.\s]*\d+[A-Z]*'
                    courses = re.findall(course_pattern, prereq_text)
                    
                    # Clean up course codes
                    cleaned_courses = []
                    for course in courses:
                        cleaned = re.sub(r'\s+', ' ', course.replace('.', ' ').strip())
                        if cleaned not in cleaned_courses:
                            cleaned_courses.append(cleaned)
                    
                    if cleaned_courses:
                        return cleaned_courses
            
            return []
            
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
                return "Graduate"
                
        except Exception:
            return "Intermediate"
    
    def course_to_dynamodb_item(self, course: CourseInfo) -> Dict:
        """Convert CourseInfo to DynamoDB item format"""
        university_key = course.university.lower().replace(' ', '_').replace('.', '')
        course_key = course.code.lower().replace(' ', '').replace('.', '_')
        
        return {
            'university_course_id': f"{university_key}_{course_key}",
            'university': course.university,
            'department': course.department,
            'course_code': course.code,
            'course_name': course.name,
            'units': course.units,
            'description': course.description,
            'prerequisites': course.prerequisites,
            'difficulty_level': course.difficulty,
            'typical_quarters': ["Fall", "Winter", "Spring"],  # Default, can be enhanced
            'required_for_majors': self._get_required_majors(course.code, course.department),
            'last_updated': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def _get_required_majors(self, course_code: str, department: str) -> List[str]:
        """Determine which majors require this course (university-specific logic)"""
        majors = []
        
        # Generic logic - can be enhanced per university
        if 'Computer Science' in department or 'CS' in course_code:
            number_match = re.search(r'(\d+)', course_code)
            if number_match:
                number = int(number_match.group(1))
                if number < 400:
                    majors = ["Computer Science", "Software Engineering"]
                else:
                    majors = ["Computer Science"]
        elif 'Math' in department:
            majors = ["Computer Science", "Engineering", "Mathematics"]
        elif 'Stat' in department:
            majors = ["Computer Science", "Engineering", "Statistics"]
        
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
        if not self.current_config:
            logger.error("No university configuration set")
            return [], False
        
        dept_name = self.current_config.departments.get(department, department)
        logger.info(f"🎯 Scraping {dept_name} ({department}) from {self.current_config.name}")
        
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
    
    def scrape_all_departments(self, departments: Optional[List[str]] = None) -> Dict[str, Any]:
        """Scrape courses for all or specified departments"""
        if not self.current_config:
            logger.error("No university configuration set")
            return {'error': 'No university configuration set'}
        
        if departments is None:
            departments = list(self.current_config.departments.keys())
        
        logger.info(f"🚀 Starting scraping for {self.current_config.name}")
        logger.info(f"Departments: {', '.join(departments)}")
        
        results = {
            'university': self.current_config.name,
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
    
    def list_supported_universities(self) -> Dict[str, str]:
        """List all supported universities"""
        return {key: config.name for key, config in self.university_configs.items()}
    
    def print_summary(self, results: Dict) -> None:
        """Print a nice summary of scraping results"""
        print(f"\n{'='*60}")
        print("🎓 UNIVERSAL SCRAPING COMPLETE - SUMMARY")
        print(f"{'='*60}")
        print(f"🏫 University: {results.get('university', 'Unknown')}")
        print(f"📊 Total Courses Scraped: {results['total_courses']}")
        print(f"✅ Successful Departments: {', '.join(results['successful_departments']) if results['successful_departments'] else 'None'}")
        print(f"❌ Failed Departments: {', '.join(results['failed_departments']) if results['failed_departments'] else 'None'}")
        print(f"💾 Courses Saved to DB: {results['save_success']}")
        print(f"⚠️  Save Errors: {results['save_errors']}")
        
        if results['total_courses'] > 0:
            print(f"\n🎉 SUCCESS! Your College HQ database now has {results['save_success']} courses from {results.get('university')}!")
            print("🔥 Your AI advisor will be much smarter now!")
        else:
            print(f"\n😞 No courses were scraped. Check the logs for details.")
        
        print(f"{'='*60}")

def main():
    """Main function"""
    print("🎓 Universal Course Catalog Scraper")
    print("=" * 60)
    
    try:
        # Initialize scraper
        scraper = UniversalCourseCatalogScraper()
        
        # Show supported universities
        universities = scraper.list_supported_universities()
        print("\n🏫 Supported Universities:")
        for key, name in universities.items():
            print(f"  {key}: {name}")
        
        # Select university
        while True:
            uni_key = input(f"\nSelect university ({'/'.join(universities.keys())}): ").strip().lower()
            if scraper.set_university(uni_key):
                break
            print("Invalid university. Please try again.")
        
        # Test connections
        if not scraper.test_connections():
            print("❌ Connection tests failed. Please check your setup.")
            return 1
        
        # Select departments
        config = scraper.current_config
        print(f"\n🎯 Available departments for {config.name}:")
        for dept_code, dept_name in config.departments.items():
            print(f"  {dept_code}: {dept_name}")
        
        print("\n🎯 Select scraping mode:")
        print("1. Scrape Computer Science only (recommended for testing)")
        print("2. Scrape CS + Math + Stats (recommended for CS majors)")
        print("3. Scrape all departments")
        print("4. Custom department list")
        
        while True:
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == "1":
                # Find CS department code
                cs_codes = [code for code in config.departments.keys() 
                           if 'computer' in config.departments[code].lower() or code.upper() in ['CS', 'CSC', '6']]
                departments = cs_codes[:1] if cs_codes else ['CSC']
                break
            elif choice == "2":
                # Find CS, Math, Stats codes
                cs_codes = [code for code in config.departments.keys() 
                           if 'computer' in config.departments[code].lower() or code.upper() in ['CS', 'CSC', '6']]
                math_codes = [code for code in config.departments.keys() 
                             if 'math' in config.departments[code].lower() or code.upper() in ['MATH', '18']]
                stat_codes = [code for code in config.departments.keys() 
                             if 'stat' in config.departments[code].lower()]
                departments = cs_codes + math_codes + stat_codes
                break
            elif choice == "3":
                departments = None  # All departments
                break
            elif choice == "4":
                custom = input(f"Enter department codes (e.g., {','.join(list(config.departments.keys())[:3])}): ").strip()
                departments = [d.strip().upper() for d in custom.split(",")]
                break
            else:
                print("Invalid choice. Please enter 1, 2, 3, or 4.")
        
        # Confirm before starting
        dept_list = departments if departments else list(config.departments.keys())
        print(f"\n🚀 About to scrape from {config.name}: {', '.join(dept_list)}")
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