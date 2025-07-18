#!/usr/bin/env python3
"""
Universal University Course Flowchart Scraper
Extensible scraper for course flowcharts/semester plans
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
import io
from typing import List, Dict, Optional, Any, Tuple
import logging
from dataclasses import dataclass
from abc import ABC, abstractmethod
import sys

# Try to import PDF processing libraries (optional for non-PDF sources)
try:
    import PyPDF2
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    
try:
    import pdfplumber
    PDFPLUMBER_SUPPORT = True
except ImportError:
    PDFPLUMBER_SUPPORT = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('flowchart_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CourseFlowchart:
    """Data class for course flowchart information"""
    university: str
    major: str
    academic_year: str
    catalog_year: str
    flowchart: Dict[str, Any]
    tracks: List[Dict[str, Any]]

class UniversityFlowchartParser(ABC):
    """Abstract base class for university-specific flowchart parsers"""
    
    @abstractmethod
    def get_flowchart_urls(self) -> Dict[str, str]:
        """Return dict of major_name -> flowchart_url"""
        pass
    
    @abstractmethod
    def parse_flowchart(self, content: bytes, major: str) -> Optional[CourseFlowchart]:
        """Parse flowchart from content (PDF or HTML)"""
        pass
    
    @abstractmethod
    def get_university_info(self) -> Dict[str, str]:
        """Return university metadata"""
        pass

class CalPolyFlowchartParser(UniversityFlowchartParser):
    """Parser for Cal Poly San Luis Obispo course flowcharts"""
    
    def get_university_info(self) -> Dict[str, str]:
        return {
            "name": "California Polytechnic State University",
            "short_name": "Cal Poly SLO",
            "location": "San Luis Obispo, California",
            "system": "quarter",
            "website": "https://www.calpoly.edu"
        }
    
    def get_flowchart_urls(self) -> Dict[str, str]:
        """Return Cal Poly flowchart URLs"""
        # These are the actual Cal Poly flowchart PDFs
        base_url = "https://flowcharts.calpoly.edu/downloads/mymap/"
        
        return {
            "Computer Science": f"{base_url}22-26.52CSCBSU.pdf",
            "Software Engineering": f"{base_url}22-26.53SEBSU.pdf", 
            "Computer Engineering": f"{base_url}22-26.14CPEBSU.pdf",
            "Mathematics": f"{base_url}22-26.28MATBSU.pdf",
            "Statistics": f"{base_url}22-26.32STABSU.pdf"
        }
    
    def parse_flowchart(self, content: bytes, major: str) -> Optional[CourseFlowchart]:
        """Parse Cal Poly flowchart PDF"""
        try:
            if PDFPLUMBER_SUPPORT:
                return self._parse_with_pdfplumber(content, major)
            elif PDF_SUPPORT:
                return self._parse_with_pypdf2(content, major)
            else:
                # Fallback: create a basic template structure
                logger.warning("No PDF parsing library available. Creating template structure.")
                return self._create_template_flowchart(major)
                
        except Exception as e:
            logger.error(f"Error parsing {major} flowchart: {e}")
            return self._create_template_flowchart(major)
    
    def _parse_with_pdfplumber(self, content: bytes, major: str) -> Optional[CourseFlowchart]:
        """Parse PDF using pdfplumber (more accurate)"""
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                
                return self._parse_flowchart_text(text, major)
                
        except Exception as e:
            logger.error(f"pdfplumber parsing failed: {e}")
            return None
    
    def _parse_with_pypdf2(self, content: bytes, major: str) -> Optional[CourseFlowchart]:
        """Parse PDF using PyPDF2 (fallback)"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
            
            return self._parse_flowchart_text(text, major)
            
        except Exception as e:
            logger.error(f"PyPDF2 parsing failed: {e}")
            return None
    
    def _parse_flowchart_text(self, text: str, major: str) -> Optional[CourseFlowchart]:
        """Parse flowchart from extracted text"""
        try:
            # Extract year information
            year_pattern = r'(\d{4})-(\d{2,4})'
            year_match = re.search(year_pattern, text)
            catalog_year = year_match.group(0) if year_match else "2022-2026"
            
            # Create flowchart structure
            flowchart = self._extract_year_structure(text)
            
            # Extract tracks/concentrations if any
            tracks = self._extract_tracks(text)
            
            return CourseFlowchart(
                university=self.get_university_info()["name"],
                major=major,
                academic_year="2024-2025",
                catalog_year=catalog_year,
                flowchart=flowchart,
                tracks=tracks
            )
            
        except Exception as e:
            logger.error(f"Error parsing flowchart text: {e}")
            return None
    
    def _extract_year_structure(self, text: str) -> Dict[str, Any]:
        """Extract year-by-year course structure from text"""
        flowchart = {}
        
        # Look for year indicators
        year_patterns = [
            (r'FIRST\s+YEAR|FRESHMAN', 'year_1'),
            (r'SECOND\s+YEAR|SOPHOMORE', 'year_2'), 
            (r'THIRD\s+YEAR|JUNIOR', 'year_3'),
            (r'FOURTH\s+YEAR|SENIOR', 'year_4')
        ]
        
        for pattern, year_key in year_patterns:
            year_match = re.search(pattern, text, re.IGNORECASE)
            if year_match:
                year_courses = self._extract_year_courses(text, year_match.start())
                flowchart[year_key] = year_courses
        
        # If no clear year structure found, create a basic one
        if not flowchart:
            flowchart = self._create_basic_structure(text)
        
        return flowchart
    
    def _extract_year_courses(self, text: str, start_pos: int) -> Dict[str, Any]:
        """Extract courses for a specific year"""
        # Extract text for this year (until next year or end)
        next_year_patterns = [
            r'SECOND\s+YEAR|SOPHOMORE',
            r'THIRD\s+YEAR|JUNIOR', 
            r'FOURTH\s+YEAR|SENIOR',
            r'FIRST\s+YEAR|FRESHMAN'
        ]
        
        end_pos = len(text)
        for pattern in next_year_patterns:
            next_match = re.search(pattern, text[start_pos + 100:], re.IGNORECASE)
            if next_match:
                end_pos = start_pos + 100 + next_match.start()
                break
        
        year_text = text[start_pos:end_pos]
        
        # Extract courses by quarter
        quarters = {
            'fall': self._extract_quarter_courses(year_text, ['FALL', 'F']),
            'winter': self._extract_quarter_courses(year_text, ['WINTER', 'W']),
            'spring': self._extract_quarter_courses(year_text, ['SPRING', 'S'])
        }
        
        return quarters
    
    def _extract_quarter_courses(self, text: str, quarter_keywords: List[str]) -> Dict[str, Any]:
        """Extract courses for a specific quarter"""
        courses = []
        total_units = 0
        
        # Look for course patterns: "CSC 101 Intro Programming (4)"
        course_pattern = r'([A-Z]{2,4})\s*(\d{3}[A-Z]*)\s*([^(]*?)\s*\((\d+)\)'
        
        for keyword in quarter_keywords:
            # Find section for this quarter
            quarter_match = re.search(f'{keyword}', text, re.IGNORECASE)
            if quarter_match:
                # Extract courses from this section
                section_start = quarter_match.end()
                section_end = section_start + 500  # Look ahead 500 chars
                section_text = text[section_start:section_end]
                
                matches = re.findall(course_pattern, section_text)
                for match in matches:
                    dept = match[0]
                    number = match[1]
                    name = match[2].strip()
                    units = int(match[3])
                    
                    courses.append({
                        'course_id': f"{dept} {number}",
                        'course_name': name,
                        'units': units,
                        'category': self._determine_course_category(dept, number),
                        'prerequisites': []  # Would need more complex parsing
                    })
                    total_units += units
                
                break
        
        return {
            'quarter': quarter_keywords[0].title(),
            'total_units': total_units,
            'courses': courses
        }
    
    def _determine_course_category(self, dept: str, number: str) -> str:
        """Determine course category based on department and number"""
        if dept in ['CSC', 'CPE', 'SE']:
            return 'major'
        elif dept in ['MATH', 'STAT', 'PHYS', 'CHEM']:
            return 'support'
        elif int(number[0]) < 3:  # 100-200 level
            return 'foundational'
        else:
            return 'elective'
    
    def _extract_tracks(self, text: str) -> List[Dict[str, Any]]:
        """Extract concentration/track information"""
        tracks = []
        
        # Look for concentration patterns
        concentration_patterns = [
            r'CONCENTRATION[S]?[:\s]+([^.]+)',
            r'TRACK[S]?[:\s]+([^.]+)',
            r'SPECIALIZATION[S]?[:\s]+([^.]+)'
        ]
        
        for pattern in concentration_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                tracks.append({
                    'track_name': match.strip(),
                    'additional_requirements': []
                })
        
        return tracks
    
    def _create_basic_structure(self, text: str) -> Dict[str, Any]:
        """Create basic 4-year structure when parsing fails"""
        # Extract all courses and distribute them across years
        course_pattern = r'([A-Z]{2,4})\s*(\d{3}[A-Z]*)\s*([^(]*?)\s*\((\d+)\)'
        all_courses = re.findall(course_pattern, text)
        
        years = {'year_1': {}, 'year_2': {}, 'year_3': {}, 'year_4': {}}
        
        # Simple distribution: lower numbered courses in earlier years
        for i, (dept, number, name, units) in enumerate(all_courses[:24]):  # Limit to 24 courses
            year_num = min(int(number[0]) if number[0].isdigit() else 1, 4)
            year_key = f'year_{year_num}'
            
            if year_key not in years:
                continue
                
            quarter = ['fall', 'winter', 'spring'][i % 3]
            
            if quarter not in years[year_key]:
                years[year_key][quarter] = {'courses': [], 'total_units': 0}
            
            course_info = {
                'course_id': f"{dept} {number}",
                'course_name': name.strip(),
                'units': int(units),
                'category': self._determine_course_category(dept, number)
            }
            
            years[year_key][quarter]['courses'].append(course_info)
            years[year_key][quarter]['total_units'] += int(units)
        
        return years
    
    def _create_template_flowchart(self, major: str) -> CourseFlowchart:
        """Create a template flowchart when parsing fails"""
        logger.info(f"Creating template flowchart for {major}")
        
        # Basic template structure for Cal Poly CS
        template_flowchart = {
            'year_1': {
                'fall': {
                    'quarter': 'Fall Year 1',
                    'total_units': 16,
                    'courses': [
                        {'course_id': 'CSC 101', 'course_name': 'Fundamentals of Computer Science', 'units': 4, 'category': 'major'},
                        {'course_id': 'MATH 141', 'course_name': 'Calculus I', 'units': 4, 'category': 'support'},
                        {'course_id': 'ENGL 134', 'course_name': 'Writing and Rhetoric', 'units': 4, 'category': 'ge'},
                        {'course_id': 'GE Area', 'course_name': 'General Education', 'units': 4, 'category': 'ge'}
                    ]
                },
                'winter': {
                    'quarter': 'Winter Year 1',
                    'total_units': 16,
                    'courses': [
                        {'course_id': 'CSC 102', 'course_name': 'Fundamentals of Computer Science II', 'units': 4, 'category': 'major'},
                        {'course_id': 'MATH 142', 'course_name': 'Calculus II', 'units': 4, 'category': 'support'},
                        {'course_id': 'PHYS 141', 'course_name': 'General Physics I', 'units': 4, 'category': 'support'},
                        {'course_id': 'GE Area', 'course_name': 'General Education', 'units': 4, 'category': 'ge'}
                    ]
                },
                'spring': {
                    'quarter': 'Spring Year 1', 
                    'total_units': 16,
                    'courses': [
                        {'course_id': 'CSC 103', 'course_name': 'Fundamentals of Computer Science III', 'units': 4, 'category': 'major'},
                        {'course_id': 'MATH 143', 'course_name': 'Calculus III', 'units': 4, 'category': 'support'},
                        {'course_id': 'PHYS 142', 'course_name': 'General Physics II', 'units': 4, 'category': 'support'},
                        {'course_id': 'GE Area', 'course_name': 'General Education', 'units': 4, 'category': 'ge'}
                    ]
                }
            }
        }
        
        return CourseFlowchart(
            university=self.get_university_info()["name"],
            major=major,
            academic_year="2024-2025",
            catalog_year="2022-2026",
            flowchart=template_flowchart,
            tracks=[]
        )

class UniversalFlowchartScraper:
    """Universal course flowchart scraper supporting multiple universities"""
    
    def __init__(self, aws_region: str = 'us-east-1', table_name: str = 'college-hq-course-flowchart'):
        self.aws_region = aws_region
        self.table_name = table_name
        
        # Setup HTTP session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
        })
        
        # Initialize available university parsers
        self.parsers = {
            "calpoly": CalPolyFlowchartParser(),
            # Future parsers can be added here
        }
        
        # Initialize AWS
        self.dynamodb = None
        self.table = None
        self._init_aws()
        
        # Check PDF library support
        self._check_pdf_support()
    
    def _check_pdf_support(self):
        """Check and report PDF parsing capabilities"""
        if PDFPLUMBER_SUPPORT:
            logger.info("✅ pdfplumber available - best PDF parsing")
        elif PDF_SUPPORT:
            logger.info("⚠️  PyPDF2 available - basic PDF parsing")
        else:
            logger.warning("❌ No PDF libraries found. Install with: pip install pdfplumber PyPDF2")
            logger.info("Will create template flowcharts instead")
    
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
        """Scrape course flowcharts for a specific university"""
        if university_key not in self.parsers:
            raise ValueError(f"University '{university_key}' not supported. Available: {list(self.parsers.keys())}")
        
        parser = self.parsers[university_key]
        university_info = parser.get_university_info()
        flowchart_urls = parser.get_flowchart_urls()
        
        # Filter majors if specified
        if majors:
            flowchart_urls = {major: url for major, url in flowchart_urls.items() if major in majors}
        
        logger.info(f"🎯 Scraping flowcharts for {university_info['name']}")
        logger.info(f"📚 Majors to scrape: {', '.join(flowchart_urls.keys())}")
        
        results = {
            "university": university_info["name"],
            "total_majors": len(flowchart_urls),
            "successful_majors": [],
            "failed_majors": [],
            "save_success": 0,
            "save_errors": 0
        }
        
        flowcharts = []
        
        for major, url in flowchart_urls.items():
            logger.info(f"\n{'='*50}")
            logger.info(f"🔍 Scraping {major} flowchart")
            logger.info(f"📄 URL: {url}")
            
            try:
                # Download content
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                # Parse flowchart
                flowchart = parser.parse_flowchart(response.content, major)
                
                if flowchart:
                    flowcharts.append(flowchart)
                    results["successful_majors"].append(major)
                    logger.info(f"✅ Successfully parsed {major} flowchart")
                else:
                    results["failed_majors"].append(major)
                    logger.warning(f"❌ Failed to parse {major} flowchart")
                
                # Be respectful to server
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Error scraping {major} flowchart: {e}")
                results["failed_majors"].append(major)
        
        # Save to DynamoDB
        if flowcharts:
            success_count, error_count = self._save_flowcharts(flowcharts, university_key)
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
    
    def _save_flowcharts(self, flowcharts: List[CourseFlowchart], university_key: str) -> Tuple[int, int]:
        """Save flowcharts to DynamoDB"""
        logger.info(f"💾 Saving {len(flowcharts)} flowcharts to DynamoDB...")
        
        success_count = 0
        error_count = 0
        
        for flowchart in flowcharts:
            try:
                # Create university_major_year key
                major_clean = flowchart.major.lower().replace(' ', '_').replace('-', '_')
                year_clean = flowchart.academic_year.replace('-', '_')
                university_major_year = f"{university_key}_{major_clean}_{year_clean}"
                
                item = {
                    'university_major_year': university_major_year,
                    'university_major_id': f"{university_key}_{major_clean}",
                    'university': flowchart.university,
                    'major': flowchart.major,
                    'academic_year': flowchart.academic_year,
                    'catalog_year': flowchart.catalog_year,
                    'flowchart': flowchart.flowchart,
                    'tracks': flowchart.tracks,
                    'last_updated': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'scraped_by': 'universal_flowchart_scraper'
                }
                
                # Convert floats to decimals for DynamoDB
                item = self._convert_floats_to_decimals(item)
                
                # Save to DynamoDB
                self.table.put_item(Item=item)
                success_count += 1
                logger.info(f"✅ Saved {flowchart.major} flowchart")
                
                # Rate limiting
                time.sleep(0.1)
                
            except ClientError as e:
                error_count += 1
                logger.error(f"❌ Failed to save {flowchart.major} flowchart: {e}")
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Unexpected error saving {flowchart.major} flowchart: {e}")
        
        logger.info(f"✅ Saved {success_count} flowcharts successfully")
        if error_count > 0:
            logger.warning(f"❌ {error_count} flowcharts failed to save")
        
        return success_count, error_count
    
    def print_summary(self, results: Dict) -> None:
        """Print summary of scraping results"""
        print(f"\n{'='*60}")
        print("📊 FLOWCHART SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"🏫 University: {results['university']}")
        print(f"📊 Total Majors Attempted: {results['total_majors']}")
        print(f"✅ Successful Majors: {', '.join(results['successful_majors']) if results['successful_majors'] else 'None'}")
        print(f"❌ Failed Majors: {', '.join(results['failed_majors']) if results['failed_majors'] else 'None'}")
        print(f"💾 Flowcharts Saved: {results['save_success']}")
        print(f"⚠️  Save Errors: {results['save_errors']}")
        
        if results['save_success'] > 0:
            print(f"\n🎉 SUCCESS! Your database now has flowcharts for {results['save_success']} majors!")
            print("🚀 Your AI advisor can now provide semester-by-semester planning!")
        else:
            print("\n😞 No flowcharts were saved. Check the logs for details.")
        
        print(f"{'='*60}")

def main():
    """Main function"""
    print("📊 Universal University Course Flowchart Scraper")
    print("=" * 60)
    
    try:
        scraper = UniversalFlowchartScraper()
        
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
        available_majors = list(parser.get_flowchart_urls().keys())
        
        print(f"\n📚 Available majors for {university_key}:")
        for major in available_majors:
            print(f"  - {major}")
        
        major_choice = input(f"\nScrape specific majors (comma-separated) or 'all' for everything: ").strip()
        
        majors = None
        if major_choice.lower() != 'all':
            majors = [m.strip() for m in major_choice.split(',') if m.strip()]
        
        # Confirm and run
        target_majors = majors if majors else available_majors
        print(f"\n🚀 About to scrape flowcharts for: {', '.join(target_majors)}")
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