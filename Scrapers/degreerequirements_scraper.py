#!/usr/bin/env python3
"""
Enhanced Universal University Degree Requirements Scraper
Now captures flexible requirement structures for any university/major
"""

import requests
from bs4 import BeautifulSoup
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from decimal import Decimal
import re
import json
import time
from typing import List, Dict, Optional, Any, Union
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
class UniversalRequirement:
    """Universal requirement structure that works for any university/major"""
    requirement_id: str
    name: str
    description: str
    requirement_type: str  # required_all, choose_exact, choose_minimum, choose_units, alternative, etc.
    units_required: Optional[int] = None
    courses_required: Optional[int] = None
    fulfillment_rules: Dict[str, Any] = None
    courses: List[Dict[str, Any]] = None
    sub_requirements: List['UniversalRequirement'] = None

@dataclass 
class DegreeRequirement:
    """Enhanced data class for degree requirement information"""
    university: str
    major: str
    degree_type: str
    total_units: int
    requirements: List[UniversalRequirement]  # Changed to universal format
    graduation_requirements: Dict[str, Any]
    metadata: Dict[str, Any] = None

class RequirementPatternDetector:
    """Detects flexible requirement patterns in academic text"""
    
    def __init__(self):
        # Patterns that indicate flexible requirements
        self.choice_patterns = [
            r'choose\s+(\d+)\s+(?:from|of)',
            r'select\s+(\d+)\s+(?:from|of)', 
            r'take\s+(\d+)\s+(?:from|of)',
            r'(\d+)\s+(?:course|courses)\s+from',
            r'(\d+)\s+of\s+the\s+following',
            r'one\s+of\s+the\s+following',
            r'any\s+(\d+)\s+(?:course|courses)',
        ]
        
        self.alternative_patterns = [
            r'(?:or|OR)',
            r'either.*?or',
            r'alternative(?:ly)?',
            r'in\s+lieu\s+of',
            r'instead\s+of',
        ]
        
        self.sequence_patterns = [
            r'sequence',
            r'series',
            r'must\s+be\s+taken\s+in\s+order',
            r'prerequisite\s+chain',
            r'(?:I,\s*II,\s*III|1,\s*2,\s*3)',
        ]
        
        self.category_patterns = [
            r'(?:upper|lower)\s+division',
            r'(\d{3})\s*level\s+(?:or\s+above|and\s+above|\+)',
            r'any\s+([A-Z]{2,4})\s+course',
            r'elective(?:s)?',
            r'approved\s+(?:course|elective)',
        ]
        
        self.units_patterns = [
            r'(\d+)\s+units?\s+(?:from|of|in)',
            r'minimum\s+of\s+(\d+)\s+units?',
            r'at\s+least\s+(\d+)\s+units?',
            r'(\d+)[-–](\d+)\s+units?',
        ]

    def detect_requirement_type(self, text: str) -> Dict[str, Any]:
        """Analyze text to determine requirement type and rules"""
        text_lower = text.lower()
        
        # Check for choice patterns
        for pattern in self.choice_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    count = int(match.group(1)) if match.group(1).isdigit() else 1
                except (IndexError, ValueError):
                    count = 1
                    
                return {
                    "type": "choose_exact" if count > 1 else "choose_minimum",
                    "courses_required": count,
                    "selection_count": count,
                    "detected_pattern": pattern
                }
        
        # Check for alternatives
        if any(re.search(pattern, text_lower) for pattern in self.alternative_patterns):
            return {
                "type": "alternative",
                "courses_required": 1,
                "detected_pattern": "alternative"
            }
        
        # Check for sequences
        if any(re.search(pattern, text_lower) for pattern in self.sequence_patterns):
            return {
                "type": "sequence",
                "prerequisite_chain": True,
                "detected_pattern": "sequence"
            }
        
        # Check for category-based
        for pattern in self.category_patterns:
            if re.search(pattern, text_lower):
                return {
                    "type": "category_based",
                    "category_restriction": pattern,
                    "detected_pattern": "category"
                }
        
        # Check for units-based
        for pattern in self.units_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    units = int(match.group(1))
                    return {
                        "type": "choose_units",
                        "units_required": units,
                        "detected_pattern": "units"
                    }
                except (IndexError, ValueError):
                    pass
        
        # Default to required_all
        return {
            "type": "required_all",
            "detected_pattern": "default"
        }

class CalPolyParser(UniversityParser):
    """Enhanced Cal Poly parser with universal requirement detection"""
    
    def __init__(self):
        super().__init__()
        self.pattern_detector = RequirementPatternDetector()
        self.all_extracted_courses = []
        self.requirement_groups = []
    
    def get_university_info(self) -> Dict[str, str]:
        return {
            "name": "California Polytechnic State University",
            "short_name": "Cal Poly SLO",
            "location": "San Luis Obispo, California",
            "system": "quarter",
            "website": "https://www.calpoly.edu"
        }
    
    def get_degree_urls(self) -> Dict[str, str]:
        return {
            "Computer Science": "https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/computersciencesoftwareengineering/bscomputerscience/",
            "Software Engineering": "https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/computersciencesoftwareengineering/bssoftwareengineering/",
            "Computer Engineering": "https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/electricalengineering/bscomputerengineering/",
            "Mathematics": "https://catalog.calpoly.edu/collegesandprograms/collegeofscience/mathematics/bsmathematics/",
            "Statistics": "https://catalog.calpoly.edu/collegesandprograms/collegeofscience/statistics/bsstatistics/"
        }
    
    def parse_degree_page(self, soup: BeautifulSoup, major: str) -> Optional[DegreeRequirement]:
        """Parse Cal Poly degree requirements with universal format"""
        try:
            # Reset for each major
            self.all_extracted_courses = []
            self.requirement_groups = []
            
            # Extract basic program info
            program_info = self._extract_program_info(soup, major)
            
            # Extract requirements using enhanced detection
            universal_requirements = self._extract_universal_requirements(soup, major)
            
            # Extract graduation requirements
            graduation_reqs = self._extract_graduation_requirements(soup)
            
            # Create metadata
            metadata = {
                "scraping_method": "enhanced_pattern_detection",
                "total_requirement_groups": len(universal_requirements),
                "scrape_timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
                "pattern_analysis": self._analyze_patterns(soup)
            }
            
            print(f"\n=== UNIVERSAL REQUIREMENTS EXTRACTED FOR {major} ===")
            print(f"Number of requirement groups: {len(universal_requirements)}")
            for req in universal_requirements:
                print(f"  - {req.name}: {req.requirement_type} ({len(req.courses or [])} courses)")
            
            return DegreeRequirement(
                university=self.get_university_info()["name"],
                major=major,
                degree_type=program_info.get("degree_type", "Bachelor of Science"),
                total_units=program_info.get("total_units", 180),
                requirements=universal_requirements,
                graduation_requirements=graduation_reqs,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Error parsing {major} degree page: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _extract_universal_requirements(self, soup: BeautifulSoup, major: str) -> List[UniversalRequirement]:
        """Extract requirements in universal format"""
        requirements = []
        
        print("\n=== EXTRACTING UNIVERSAL REQUIREMENTS ===")
        
        # Strategy 1: Extract from major requirement tables
        major_req = self._extract_major_requirement_group(soup)
        if major_req:
            requirements.append(major_req)
        
        # Strategy 2: Extract flexible support requirements
        support_reqs = self._extract_support_requirement_groups(soup)
        requirements.extend(support_reqs)
        
        # Strategy 3: Extract general education 
        ge_req = self._extract_ge_requirement_group(soup)
        if ge_req:
            requirements.append(ge_req)
        
        # Strategy 4: Extract electives
        elective_reqs = self._extract_elective_requirement_groups(soup)
        requirements.extend(elective_reqs)
        
        return requirements
    
    def _extract_major_requirement_group(self, soup: BeautifulSoup) -> Optional[UniversalRequirement]:
        """Extract core major requirements"""
        print("\n--- Extracting Major Requirements ---")
        
        # Find major courses from tables
        all_courses = []
        course_tables = soup.find_all('table')
        
        for i, table in enumerate(course_tables):
            table_text = table.get_text()
            if any(keyword in table_text.upper() for keyword in ['MAJOR', 'CORE', 'REQUIRED', 'COMPUTER SCIENCE']):
                print(f"Found major requirements in table {i+1}")
                courses = self._extract_courses_from_table(table)
                all_courses.extend(courses)
        
        if not all_courses:
            return None
        
        # Filter to actual major courses (CS/CPE + core math)
        major_courses = []
        for course in all_courses:
            dept = course['course_id'].split()[0]
            course_num = course['course_id'].split()[1] if len(course['course_id'].split()) > 1 else ""
            
            if (dept in ['CSC', 'CPE'] or 
                (dept == 'MATH' and course_num in ['141', '142', '143', '206', '244']) or
                (dept == 'STAT' and course_num in ['312'])):
                major_courses.append({
                    "type": "specific_course",
                    "course_id": course['course_id'],
                    "course_name": course['course_name'],
                    "units": course.get('units', 4),
                    "required": True
                })
        
        if not major_courses:
            return None
        
        total_units = sum(course.get('units', 4) for course in major_courses)
        
        return UniversalRequirement(
            requirement_id="core_major",
            name="Core Major Requirements",
            description="Fundamental courses required for all students in this major",
            requirement_type="required_all",
            units_required=total_units,
            courses_required=len(major_courses),
            fulfillment_rules={"selection_count": "all"},
            courses=major_courses
        )
    
    def _extract_support_requirement_groups(self, soup: BeautifulSoup) -> List[UniversalRequirement]:
        """Extract flexible support requirements with choice detection"""
        print("\n--- Extracting Support Requirements ---")
        
        requirements = []
        
        # Find all support courses from tables
        all_courses = []
        course_tables = soup.find_all('table')
        
        for table in course_tables:
            table_text = table.get_text()
            if any(keyword in table_text.upper() for keyword in ['MAJOR', 'CORE', 'REQUIRED']):
                courses = self._extract_courses_from_table(table)
                all_courses.extend(courses)
        
        # Filter to support courses
        support_courses = []
        for course in all_courses:
            dept = course['course_id'].split()[0]
            course_num = course['course_id'].split()[1] if len(course['course_id'].split()) > 1 else ""
            
            # Skip major courses
            if (dept in ['CSC', 'CPE'] or 
                (dept == 'MATH' and course_num in ['141', '142', '143', '206', '244']) or
                (dept == 'STAT' and course_num in ['312'])):
                continue
                
            support_courses.append(course)
        
        if not support_courses:
            return requirements
        
        # Group support courses by department/type
        course_groups = {}
        for course in support_courses:
            dept = course['course_id'].split()[0]
            
            if dept in ['PHYS']:
                group_key = 'physics_science'
            elif dept in ['CHEM']:
                group_key = 'chemistry_science'  
            elif dept in ['BIO', 'BOT', 'MCRO', 'BMED']:
                group_key = 'biology_science'
            elif dept in ['PHIL']:
                group_key = 'philosophy_ethics'
            elif dept in ['ES', 'WGQS']:
                group_key = 'diversity_studies'
            else:
                group_key = 'other_support'
            
            if group_key not in course_groups:
                course_groups[group_key] = []
            course_groups[group_key].append(course)
        
        # Create requirement groups for each category
        for group_key, courses in course_groups.items():
            if len(courses) <= 1:
                continue  # Skip single courses for now
            
            # Detect if this is a sequence or alternatives
            group_text = ' '.join([c['course_name'] for c in courses])
            pattern_info = self.pattern_detector.detect_requirement_type(group_text)
            
            # Create course options
            course_options = []
            if group_key in ['physics_science', 'chemistry_science', 'biology_science']:
                # These are usually sequences you choose from
                course_options = [{
                    "type": "course_sequence",
                    "sequence": [c['course_id'] for c in courses],
                    "course_name": f"{group_key.replace('_', ' ').title()} Sequence",
                    "total_units": sum(c.get('units', 4) for c in courses)
                }]
                req_type = "alternative"
                description = f"Choose one complete science sequence"
            else:
                # Individual course choices
                course_options = [{
                    "type": "specific_course",
                    "course_id": c['course_id'],
                    "course_name": c['course_name'],
                    "units": c.get('units', 4)
                } for c in courses]
                req_type = "choose_minimum"
                description = f"Choose courses from {group_key.replace('_', ' ')}"
            
            requirements.append(UniversalRequirement(
                requirement_id=group_key,
                name=group_key.replace('_', ' ').title() + " Requirement",
                description=description,
                requirement_type=req_type,
                courses_required=1 if req_type == "alternative" else len(courses),
                fulfillment_rules={
                    "selection_count": 1 if req_type == "alternative" else len(courses),
                    "pattern_detected": pattern_info.get("detected_pattern", "inferred")
                },
                courses=course_options
            ))
        
        return requirements
    
    def _extract_ge_requirement_group(self, soup: BeautifulSoup) -> Optional[UniversalRequirement]:
        """Extract general education requirements"""
        print("\n--- Extracting General Education Requirements ---")
        
        # Look for GE table or section
        ge_sections = soup.find_all(['h3', 'h4', 'h5'], string=re.compile(r'General.*Education|GE', re.IGNORECASE))
        
        if not ge_sections:
            # Create default GE requirement
            return UniversalRequirement(
                requirement_id="general_education",
                name="General Education Requirements",
                description="University-wide general education requirements",
                requirement_type="choose_units",
                units_required=72,  # Cal Poly standard
                fulfillment_rules={"min_units": 72, "category": "general_education"},
                courses=[{
                    "type": "course_category",
                    "category": {
                        "subject_area": ["general_education"],
                        "description": "Approved GE courses"
                    }
                }]
            )
        
        # TODO: Parse specific GE areas if found
        return None
    
    def _extract_elective_requirement_groups(self, soup: BeautifulSoup) -> List[UniversalRequirement]:
        """Extract elective requirements"""
        print("\n--- Extracting Elective Requirements ---")
        
        requirements = []
        
        # Look for elective mentions in text
        text = soup.get_text()
        
        # Check for technical electives
        if re.search(r'technical\s+elective', text, re.IGNORECASE):
            requirements.append(UniversalRequirement(
                requirement_id="technical_electives",
                name="Technical Electives",
                description="Upper division technical courses in approved areas",
                requirement_type="choose_units",
                units_required=12,  # Common amount
                fulfillment_rules={
                    "min_units": 12,
                    "level_restriction": "upper_division",
                    "department_restriction": ["CSC", "CPE", "MATH", "STAT", "EE"]
                },
                courses=[{
                    "type": "course_category",
                    "category": {
                        "department": ["CSC", "CPE", "MATH", "STAT"],
                        "level": "300+",
                        "description": "Upper division technical courses"
                    }
                }]
            ))
        
        # Check for free electives
        if re.search(r'free\s+elective', text, re.IGNORECASE):
            requirements.append(UniversalRequirement(
                requirement_id="free_electives",
                name="Free Electives",
                description="Any approved courses to reach total unit requirement",
                requirement_type="choose_units",
                units_required=4,
                fulfillment_rules={"min_units": 4, "any_approved_course": True},
                courses=[{
                    "type": "free_choice",
                    "description": "Any approved university courses"
                }]
            ))
        
        return requirements
    
    def _analyze_patterns(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Analyze the page for requirement patterns"""
        text = soup.get_text()
        
        analysis = {
            "choice_patterns_found": [],
            "alternative_patterns_found": [],
            "sequence_patterns_found": [],
            "category_patterns_found": [],
            "units_patterns_found": []
        }
        
        # Check each pattern type
        for pattern in self.pattern_detector.choice_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                analysis["choice_patterns_found"].append(pattern)
        
        for pattern in self.pattern_detector.alternative_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                analysis["alternative_patterns_found"].append(pattern)
        
        # Add counts
        analysis["total_patterns_detected"] = sum(len(patterns) for patterns in analysis.values())
        
        return analysis
    
    # Keep your existing helper methods
    def _extract_program_info(self, soup: BeautifulSoup, major: str) -> Dict[str, Any]:
        """Extract basic program information"""
        info = {
            "degree_type": "Bachelor of Science",
            "total_units": 180
        }
        
        text = soup.get_text()
        units_match = re.search(r'(\d{3})\s*(?:total\s*)?units?', text, re.IGNORECASE)
        if units_match:
            info["total_units"] = int(units_match.group(1))
        
        if "Bachelor of Arts" in text or "B.A." in text:
            info["degree_type"] = "Bachelor of Arts"
        elif "Bachelor of Science" in text or "B.S." in text:
            info["degree_type"] = "Bachelor of Science"
        
        return info
    
    def _extract_graduation_requirements(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract graduation requirements"""
        return {
            "min_gpa": 2.0,
            "min_major_gpa": 2.0,
            "residency_units": 30,
            "upper_division_units": 60
        }
    
    # Keep your existing course extraction methods
    def _extract_courses_from_table(self, table) -> List[Dict[str, Any]]:
        """Extract course information from HTML table"""
        courses = []
        rows = table.find_all('tr')
        
        for row_idx, row in enumerate(rows):
            cells = row.find_all(['td', 'th'])
            
            for cell_idx, cell in enumerate(cells):
                cell_text = cell.get_text().strip()
                course_matches = re.findall(r'([A-Z]{2,4}(?:/[A-Z]{2,4})?)\s*(\d{3}[A-Z]*)', cell_text)
                
                if course_matches:
                    course_name_context = cell_text
                    if cell_idx + 1 < len(cells):
                        next_cell = cells[cell_idx + 1]
                        course_name_context += " " + next_cell.get_text().strip()
                
                for match in course_matches:
                    dept_part = match[0]
                    number_part = match[1]
                    primary_dept = dept_part.split('/')[0]
                    course_code = f"{primary_dept} {number_part}"
                    
                    if any(c['course_id'] == course_code for c in courses):
                        continue
                    
                    course_name = self._extract_course_name_from_cell(course_name_context, course_code)
                    units = self._extract_units_from_cell(cell_text)
                    
                    courses.append({
                        "course_id": course_code,
                        "course_name": course_name,
                        "units": units,
                        "required": True,
                        "prerequisites": []
                    })
        
        return courses
    
    def _extract_course_name_from_cell(self, cell_text: str, course_code: str) -> str:
        """Extract course name from table cell"""
        text = cell_text.strip()
        text = re.sub(r'[A-Z]{2,4}(?:/[A-Z]{2,4})?\s*\d{3}[A-Z]*', '', text)
        text = re.sub(r'^\s*[-–&]\s*', '', text)
        text = re.sub(r'\s*\(\d+\)\s*$', '', text)
        text = re.sub(r'\s*\d+\s*units?\s*$', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*or\s+', '', text, flags=re.IGNORECASE)
        
        parts = re.split(r'[&\n\r]', text)
        for part in parts:
            part = part.strip()
            if 10 <= len(part) <= 80 and not re.match(r'^\d+$', part):
                part = re.sub(r'[A-Z]{2,4}\s*\d{3}[A-Z]*', '', part).strip()
                if len(part) >= 10:
                    return part
        
        return "Course Name Not Available"
    
    def _extract_units_from_cell(self, cell_text: str) -> int:
        """Extract units from table cell"""
        units_match = re.search(r'\((\d+)\)|\b(\d+)\s*units?\b', cell_text, re.IGNORECASE)
        if units_match:
            return int(units_match.group(1) or units_match.group(2))
        return 4

# Keep your existing UniversalDegreeRequirementsScraper class but update the save method
class UniversalDegreeRequirementsScraper:
    """Universal degree requirements scraper supporting multiple universities"""
    
    def __init__(self, aws_region: str = 'us-east-1', table_name: str = 'college-hq-degree-requirements'):
        self.aws_region = aws_region
        self.table_name = table_name
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
        })
        
        self.parsers = {
            "calpoly": CalPolyParser(),
        }
        
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
            logger.error("AWS credentials not found.")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize AWS resources: {e}")
            raise
    
    def _save_degree_requirements(self, degree_requirements: List[DegreeRequirement], university_key: str) -> tuple:
        """Save enhanced degree requirements to DynamoDB"""
        logger.info(f"💾 Saving {len(degree_requirements)} enhanced degree requirements...")
        
        success_count = 0
        error_count = 0
        
        for degree_req in degree_requirements:
            try:
                major_clean = degree_req.major.lower().replace(' ', '_').replace('-', '_')
                university_major_id = f"{university_key}_{major_clean}"
                
                # Convert UniversalRequirement objects to dicts
                requirements_data = []
                for req in degree_req.requirements:
                    req_dict = {
                        "requirement_id": req.requirement_id,
                        "name": req.name,
                        "description": req.description,
                        "requirement_type": req.requirement_type,
                        "units_required": req.units_required,
                        "courses_required": req.courses_required,
                        "fulfillment_rules": req.fulfillment_rules or {},
                        "courses": req.courses or [],
                        "sub_requirements": req.sub_requirements or []
                    }
                    requirements_data.append(req_dict)
                
                item = {
                    'university_major_id': university_major_id,
                    'university': degree_req.university,
                    'major': degree_req.major,
                    'degree_type': degree_req.degree_type,
                    'total_units': degree_req.total_units,
                    'requirements': {
                        "format_version": "2.0_universal",
                        "requirement_groups": requirements_data
                    },
                    'graduation_requirements': degree_req.graduation_requirements,
                    'metadata': degree_req.metadata or {},
                    'last_updated': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'scraped_by': 'enhanced_universal_scraper'
                }
                
                item = self._convert_floats_to_decimals(item)
                self.table.put_item(Item=item)
                success_count += 1
                logger.info(f"✅ Saved {degree_req.major} with {len(requirements_data)} requirement groups")
                
                time.sleep(0.1)
                
            except ClientError as e:
                error_count += 1
                logger.error(f"❌ Failed to save {degree_req.major}: {e}")
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Unexpected error saving {degree_req.major}: {e}")
        
        return success_count, error_count
    
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
    
    # Keep the rest of your existing methods (scrape_university, print_summary, etc.)
    def scrape_university(self, university_key: str, majors: Optional[List[str]] = None) -> Dict[str, Any]:
        """Scrape degree requirements for a specific university"""
        if university_key not in self.parsers:
            raise ValueError(f"University '{university_key}' not supported. Available: {list(self.parsers.keys())}")
        
        parser = self.parsers[university_key]
        university_info = parser.get_university_info()
        degree_urls = parser.get_degree_urls()
        
        if majors:
            degree_urls = {major: url for major, url in degree_urls.items() if major in majors}
        
        logger.info(f"🎯 Scraping {university_info['name']} with enhanced pattern detection")
        logger.info(f"📚 Majors to scrape: {', '.join(degree_urls.keys())}")
        
        results = {
            "university": university_info["name"],
            "total_majors": len(degree_urls),
            "successful_majors": [],
            "failed_majors": [],
            "save_success": 0,
            "save_errors": 0,
            "enhancement_summary": {}
        }
        
        degree_requirements = []
        
        for major, url in degree_urls.items():
            logger.info(f"\n{'='*50}")
            logger.info(f"🔍 Enhanced scraping for {major}")
            print(f"URL: {url}")
            
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                degree_req = parser.parse_degree_page(soup, major)
                
                if degree_req:
                    degree_requirements.append(degree_req)
                    results["successful_majors"].append(major)
                    results["enhancement_summary"][major] = {
                        "requirement_groups": len(degree_req.requirements),
                        "patterns_detected": degree_req.metadata.get("pattern_analysis", {}).get("total_patterns_detected", 0),
                        "format_version": "2.0_universal"
                    }
                    logger.info(f"✅ Successfully parsed {major} with {len(degree_req.requirements)} requirement groups")
                else:
                    results["failed_majors"].append(major)
                    logger.warning(f"❌ Failed to parse {major}")
                
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Error scraping {major}: {e}")
                results["failed_majors"].append(major)
        
        if degree_requirements:
            success_count, error_count = self._save_degree_requirements(degree_requirements, university_key)
            results["save_success"] = success_count
            results["save_errors"] = error_count
        
        return results
    
    def list_supported_universities(self) -> List[str]:
        """Return list of supported universities"""
        return list(self.parsers.keys())
    
    def print_summary(self, results: Dict) -> None:
        """Print enhanced summary of scraping results"""
        print(f"\n{'='*60}")
        print("🎓 ENHANCED DEGREE REQUIREMENTS SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"🏫 University: {results['university']}")
        print(f"📊 Total Majors Attempted: {results['total_majors']}")
        print(f"✅ Successful Majors: {', '.join(results['successful_majors']) if results['successful_majors'] else 'None'}")
        print(f"❌ Failed Majors: {', '.join(results['failed_majors']) if results['failed_majors'] else 'None'}")
        print(f"💾 Requirements Saved: {results['save_success']}")
        print(f"⚠️  Save Errors: {results['save_errors']}")
        
        if results.get("enhancement_summary"):
            print(f"\n🔍 ENHANCEMENT SUMMARY:")
            for major, summary in results["enhancement_summary"].items():
                print(f"  📚 {major}:")
                print(f"    - Requirement groups: {summary['requirement_groups']}")
                print(f"    - Patterns detected: {summary['patterns_detected']}")
                print(f"    - Format version: {summary['format_version']}")
        
        if results['save_success'] > 0:
            print(f"\n🎉 SUCCESS! Enhanced requirement data saved for {results['save_success']} majors!")
            print("🚀 Your AI advisor now understands flexible requirements!")
            print("💡 New capabilities:")
            print("   - Choose X from Y course options")
            print("   - Alternative requirement paths")
            print("   - Course sequences and prerequisites")
            print("   - Category-based requirements")
        else:
            print("\n😞 No degree requirements were saved. Check the logs for details.")
        
        print(f"{'='*60}")

# Add the missing abstract base class
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

def main():
    """Main function"""
    print("🎓 Enhanced Universal University Degree Requirements Scraper")
    print("🔍 Now with intelligent requirement pattern detection!")
    print("=" * 70)
    
    try:
        scraper = UniversalDegreeRequirementsScraper()
        
        supported = scraper.list_supported_universities()
        print(f"🏫 Supported Universities: {', '.join(supported)}")
        
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
        
        parser = scraper.parsers[university_key]
        available_majors = list(parser.get_degree_urls().keys())
        
        print(f"\n📚 Available majors for {university_key}:")
        for major in available_majors:
            print(f"  - {major}")
        
        major_choice = input(f"\nScrape specific majors (comma-separated) or 'all' for everything: ").strip()
        
        majors = None
        if major_choice.lower() != 'all':
            majors = [m.strip() for m in major_choice.split(',') if m.strip()]
        
        target_majors = majors if majors else available_majors
        print(f"\n🚀 About to scrape with enhanced pattern detection: {', '.join(target_majors)}")
        print("🔍 New features:")
        print("   - Flexible requirement detection")
        print("   - Choice pattern analysis")
        print("   - Course sequence identification")
        print("   - Alternative pathway detection")
        
        confirm = input("\nContinue? (y/n): ").lower().strip()
        
        if confirm != 'y':
            print("Scraping cancelled.")
            return 0
        
        results = scraper.scrape_university(university_key, majors)
        scraper.print_summary(results)
        
        return 0 if results['save_success'] > 0 else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Scraping interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Enhanced scraping failed: {e}")
        print(f"❌ Enhanced scraping failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())