#!/usr/bin/env python3
"""
Universal University Degree Requirements Scraper
Extensible scraper designed to handle multiple universities
Starting with Cal Poly, easily expandable to other institutions
"""

import requests
from bs4 import BeautifulSoup
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from decimal import Decimal
import re
import json
import time
from typing import List, Dict, Optional, Any
import logging
from dataclasses import dataclass
from abc import ABC, abstractmethod
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('degree_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class DegreeRequirement:
    """Data class for degree requirement information"""
    university: str
    major: str
    degree_type: str
    total_units: int
    requirements: Dict[str, Any]
    graduation_requirements: Dict[str, Any]

class UniversityParser(ABC):
    """Abstract base class for university-specific parsers"""
    
    @abstractmethod
    def get_degree_urls(self) -> Dict[str, str]:
        """Return dict of major_name -> degree_page_url"""
        pass
    
    @abstractmethod
    def parse_degree_page(self, soup: BeautifulSoup, major: str) -> Optional[DegreeRequirement]:
        """Parse degree requirements from page HTML"""
        pass
    
    @abstractmethod
    def get_university_info(self) -> Dict[str, str]:
        """Return university metadata"""
        pass

class CalPolyParser(UniversityParser):
    """Parser for Cal Poly San Luis Obispo degree requirements"""
    
    def get_university_info(self) -> Dict[str, str]:
        return {
            "name": "California Polytechnic State University",
            "short_name": "Cal Poly SLO",
            "location": "San Luis Obispo, California",
            "system": "quarter",
            "website": "https://www.calpoly.edu"
        }
    
    def get_degree_urls(self) -> Dict[str, str]:
        """Return Cal Poly degree program URLs"""
        return {
            "Computer Science": "https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/computersciencesoftwareengineering/bscomputerscience/",
            "Software Engineering": "https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/computersciencesoftwareengineering/bssoftwareengineering/",
            "Computer Engineering": "https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/electricalengineering/bscomputerengineering/",
            "Mathematics": "https://catalog.calpoly.edu/collegesandprograms/collegeofscience/mathematics/bsmathematics/",
            "Statistics": "https://catalog.calpoly.edu/collegesandprograms/collegeofscience/statistics/bsstatistics/"
        }
    
    def parse_degree_page(self, soup: BeautifulSoup, major: str) -> Optional[DegreeRequirement]:
        """Parse Cal Poly degree requirements page"""
        try:
            # Extract basic program info
            program_info = self._extract_program_info(soup, major)
            
            # Extract course requirements by category
            requirements = {
                "major_courses": self._extract_major_courses(soup),
                "support_courses": self._extract_support_courses(soup),
                "general_education": self._extract_general_education(soup),
                "free_electives": self._extract_free_electives(soup)
            }
            
            # Extract graduation requirements
            graduation_reqs = self._extract_graduation_requirements(soup)
            
            return DegreeRequirement(
                university=self.get_university_info()["name"],
                major=major,
                degree_type=program_info.get("degree_type", "Bachelor of Science"),
                total_units=program_info.get("total_units", 180),
                requirements=requirements,
                graduation_requirements=graduation_reqs
            )
            
        except Exception as e:
            logger.error(f"Error parsing {major} degree page: {e}")
            return None
    
    def _extract_program_info(self, soup: BeautifulSoup, major: str) -> Dict[str, Any]:
        """Extract basic program information"""
        info = {
            "degree_type": "Bachelor of Science",
            "total_units": 180  # Cal Poly default
        }
        
        # Look for total units in common locations
        text = soup.get_text()
        
        # Pattern: "120 units" or "180 total units"
        units_match = re.search(r'(\d{3})\s*(?:total\s*)?units?', text, re.IGNORECASE)
        if units_match:
            info["total_units"] = int(units_match.group(1))
        
        # Look for degree type
        if "Bachelor of Arts" in text or "B.A." in text:
            info["degree_type"] = "Bachelor of Arts"
        elif "Bachelor of Science" in text or "B.S." in text:
            info["degree_type"] = "Bachelor of Science"
        
        return info
    
    def _extract_major_courses(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract major course requirements"""
        major_courses = {
            "total_units": 0,
            "courses": []
        }
        
        # Look for major requirements section
        major_sections = soup.find_all(['h3', 'h4', 'h5'], string=re.compile(r'Major.*Requirement', re.IGNORECASE))
        
        for section in major_sections:
            # Find the content after this heading
            content = self._get_content_after_heading(section)
            courses = self._extract_courses_from_content(content)
            major_courses["courses"].extend(courses)
        
        # Calculate total units
        major_courses["total_units"] = sum(course.get("units", 0) for course in major_courses["courses"])
        
        return major_courses
    
    def _extract_support_courses(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract support course requirements"""
        support_courses = {
            "total_units": 0,
            "courses": []
        }
        
        # Look for support requirements section
        support_sections = soup.find_all(['h3', 'h4', 'h5'], string=re.compile(r'Support.*Requirement', re.IGNORECASE))
        
        for section in support_sections:
            content = self._get_content_after_heading(section)
            courses = self._extract_courses_from_content(content)
            support_courses["courses"].extend(courses)
        
        support_courses["total_units"] = sum(course.get("units", 0) for course in support_courses["courses"])
        
        return support_courses
    
    def _extract_general_education(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract general education requirements"""
        ge_info = {
            "total_units": 72,  # Cal Poly standard
            "areas": {}
        }
        
        # Look for GE sections
        ge_sections = soup.find_all(['h3', 'h4', 'h5'], string=re.compile(r'General.*Education|GE', re.IGNORECASE))
        
        for section in ge_sections:
            content = self._get_content_after_heading(section)
            ge_areas = self._extract_ge_areas(content)
            ge_info["areas"].update(ge_areas)
        
        return ge_info
    
    def _extract_free_electives(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract free elective requirements"""
        return {
            "total_units": 4,
            "description": "Free electives to reach total unit requirement"
        }
    
    def _extract_graduation_requirements(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract graduation requirements"""
        return {
            "min_gpa": 2.0,
            "min_major_gpa": 2.0,
            "residency_units": 30,
            "upper_division_units": 60
        }
    
    def _get_content_after_heading(self, heading) -> str:
        """Get text content after a heading until next heading"""
        content = []
        current = heading.find_next_sibling()
        
        while current and current.name not in ['h1', 'h2', 'h3', 'h4', 'h5']:
            if hasattr(current, 'get_text'):
                content.append(current.get_text())
            current = current.find_next_sibling()
        
        return ' '.join(content)
    
    def _extract_courses_from_content(self, content: str) -> List[Dict[str, Any]]:
        """Extract course information from text content"""
        courses = []
        
        # Pattern: "CSC 101 Fundamentals of Computer Science (4)"
        course_pattern = r'([A-Z]{2,4}\s*\d{3}[A-Z]*)\s*([^(]+?)\s*\((\d+)\)'
        
        matches = re.findall(course_pattern, content)
        
        for match in matches:
            course_code = re.sub(r'\s+', ' ', match[0].strip())
            course_name = match[1].strip()
            units = int(match[2])
            
            courses.append({
                "course_id": course_code,
                "course_name": course_name,
                "units": units,
                "required": True,
                "prerequisites": []  # Would need more complex parsing
            })
        
        return courses
    
    def _extract_ge_areas(self, content: str) -> Dict[str, Any]:
        """Extract GE area requirements"""
        areas = {}
        
        # Common Cal Poly GE areas
        ge_patterns = {
            "A1": r'A1.*?Oral Communication.*?(\d+)',
            "A2": r'A2.*?Written Communication.*?(\d+)',
            "A3": r'A3.*?Critical Thinking.*?(\d+)',
            "B1": r'B1.*?Mathematics.*?(\d+)',
            "B2": r'B2.*?Life Sciences.*?(\d+)'
        }
        
        for area_code, pattern in ge_patterns.items():
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if match:
                areas[area_code] = {
                    "units": int(match.group(1)),
                    "description": f"GE Area {area_code}"
                }
        
        return areas

class UniversalDegreeRequirementsScraper:
    """Universal degree requirements scraper supporting multiple universities"""
    
    def __init__(self, aws_region: str = 'us-east-1', table_name: str = 'college-hq-degree-requirements'):
        self.aws_region = aws_region
        self.table_name = table_name
        
        # Setup HTTP session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
        })
        
        # Initialize available university parsers
        self.parsers = {
            "calpoly": CalPolyParser(),
            # Future parsers can be added here:
            # "stanford": StanfordParser(),
            # "berkeley": BerkeleyParser(),
        }
        
        # Initialize AWS
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
    
    def list_supported_universities(self) -> List[str]:
        """Return list of supported universities"""
        return list(self.parsers.keys())
    
    def scrape_university(self, university_key: str, majors: Optional[List[str]] = None) -> Dict[str, Any]:
        """Scrape degree requirements for a specific university"""
        if university_key not in self.parsers:
            raise ValueError(f"University '{university_key}' not supported. Available: {list(self.parsers.keys())}")
        
        parser = self.parsers[university_key]
        university_info = parser.get_university_info()
        degree_urls = parser.get_degree_urls()
        
        # Filter majors if specified
        if majors:
            degree_urls = {major: url for major, url in degree_urls.items() if major in majors}
        
        logger.info(f"🎯 Scraping {university_info['name']}")
        logger.info(f"📚 Majors to scrape: {', '.join(degree_urls.keys())}")
        
        results = {
            "university": university_info["name"],
            "total_majors": len(degree_urls),
            "successful_majors": [],
            "failed_majors": [],
            "save_success": 0,
            "save_errors": 0
        }
        
        degree_requirements = []
        
        for major, url in degree_urls.items():
            logger.info(f"\n{'='*50}")
            logger.info(f"🔍 Scraping {major}")
            
            try:
                # Get page content
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Parse degree requirements
                degree_req = parser.parse_degree_page(soup, major)
                
                if degree_req:
                    degree_requirements.append(degree_req)
                    results["successful_majors"].append(major)
                    logger.info(f"✅ Successfully parsed {major}")
                else:
                    results["failed_majors"].append(major)
                    logger.warning(f"❌ Failed to parse {major}")
                
                # Be respectful to server
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Error scraping {major}: {e}")
                results["failed_majors"].append(major)
        
        # Save to DynamoDB
        if degree_requirements:
            success_count, error_count = self._save_degree_requirements(degree_requirements, university_key)
            results["save_success"] = success_count
            results["save_errors"] = error_count
        
        return results
    
    def _convert_floats_to_decimals(self, obj):
        """Recursively convert float values to Decimal for DynamoDB compatibility"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {key: self._convert_floats_to_decimals(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_floats_to_decimals(item) for item in obj]
        else:
            return obj
    
    def _save_degree_requirements(self, degree_requirements: List[DegreeRequirement], university_key: str) -> tuple:
        """Save degree requirements to DynamoDB"""
        logger.info(f"💾 Saving {len(degree_requirements)} degree requirements to DynamoDB...")
        
        success_count = 0
        error_count = 0
        
        for degree_req in degree_requirements:
            try:
                # Create university_major_id
                major_clean = degree_req.major.lower().replace(' ', '_').replace('-', '_')
                university_major_id = f"{university_key}_{major_clean}"
                
                item = {
                    'university_major_id': university_major_id,
                    'university': degree_req.university,
                    'major': degree_req.major,
                    'degree_type': degree_req.degree_type,
                    'total_units': degree_req.total_units,
                    'requirements': degree_req.requirements,
                    'graduation_requirements': degree_req.graduation_requirements,
                    'last_updated': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'scraped_by': 'universal_degree_scraper'
                }
                
                # Convert floats to decimals for DynamoDB
                item = self._convert_floats_to_decimals(item)
                
                # Save to DynamoDB
                self.table.put_item(Item=item)
                success_count += 1
                logger.info(f"✅ Saved {degree_req.major}")
                
                # Rate limiting
                time.sleep(0.1)
                
            except ClientError as e:
                error_count += 1
                logger.error(f"❌ Failed to save {degree_req.major}: {e}")
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Unexpected error saving {degree_req.major}: {e}")
        
        logger.info(f"✅ Saved {success_count} degree requirements successfully")
        if error_count > 0:
            logger.warning(f"❌ {error_count} degree requirements failed to save")
        
        return success_count, error_count
    
    def print_summary(self, results: Dict) -> None:
        """Print summary of scraping results"""
        print(f"\n{'='*60}")
        print("🎓 DEGREE REQUIREMENTS SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"🏫 University: {results['university']}")
        print(f"📊 Total Majors Attempted: {results['total_majors']}")
        print(f"✅ Successful Majors: {', '.join(results['successful_majors']) if results['successful_majors'] else 'None'}")
        print(f"❌ Failed Majors: {', '.join(results['failed_majors']) if results['failed_majors'] else 'None'}")
        print(f"💾 Requirements Saved: {results['save_success']}")
        print(f"⚠️  Save Errors: {results['save_errors']}")
        
        if results['save_success'] > 0:
            print(f"\n🎉 SUCCESS! Your database now has degree requirements for {results['save_success']} majors!")
            print("🚀 Your AI advisor will now be much smarter about degree planning!")
        else:
            print("\n😞 No degree requirements were saved. Check the logs for details.")
        
        print(f"{'='*60}")

def main():
    """Main function"""
    print("🎓 Universal University Degree Requirements Scraper")
    print("=" * 60)
    
    try:
        scraper = UniversalDegreeRequirementsScraper()
        
        # Show supported universities
        supported = scraper.list_supported_universities()
        print(f"🏫 Supported Universities: {', '.join(supported)}")
        
        # Select university
        print(f"\n📝 Select university to scrape:")
        for i, uni in enumerate(supported, 1):
            print(f"{i}. {uni}")
        
        while True:
            try:
                choice = int(input(f"\nEnter choice (1-{len(supported)}): "))
                if 1 <= choice <= len(supported):
                    university_key = supported[choice - 1]
                    break
                else:
                    print(f"Please enter a number between 1 and {len(supported)}")
            except ValueError:
                print("Please enter a valid number")
        
        # Select majors (optional)
        parser = scraper.parsers[university_key]
        available_majors = list(parser.get_degree_urls().keys())
        
        print(f"\n📚 Available majors for {university_key}:")
        for major in available_majors:
            print(f"  - {major}")
        
        major_choice = input(f"\nScrape specific majors (comma-separated) or 'all' for everything: ").strip()
        
        majors = None
        if major_choice.lower() != 'all':
            majors = [m.strip() for m in major_choice.split(',') if m.strip()]
        
        # Confirm and run
        target_majors = majors if majors else available_majors
        print(f"\n🚀 About to scrape: {', '.join(target_majors)}")
        confirm = input("Continue? (y/n): ").lower().strip()
        
        if confirm != 'y':
            print("Scraping cancelled.")
            return 0
        
        # Run scraper
        results = scraper.scrape_university(university_key, majors)
        
        # Print summary
        scraper.print_summary(results)
        
        return 0 if results['save_success'] > 0 else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Scraping interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        print(f"❌ Scraping failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())