export interface Major {
  id: string;
  name: string;
  department: string;
  degree: 'BS' | 'BA' | 'MS' | 'MA' | 'PhD';
  units: number;
  requirements: {
    core: string[];
    electives: string[];
    concentration?: string[];
    ge: string[];
  };
  flowchart: string; // URL to flowchart PDF
  catalog: string; // URL to catalog page
}

export interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
}

export interface CollegeConfig {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
  };
  academicCalendar: {
    quarters: boolean;
    terms: AcademicTerm[];
  };
  departments: string[];
  majors: Major[];
  classSearchEndpoint?: string;
  classSearchParams?: {
    term: string;
    subject: string;
    courseNumber: string;
  };
}

export const colleges: Record<string, CollegeConfig> = {
  'calpoly': {
    id: 'calpoly',
    name: 'California Polytechnic State University',
    shortName: 'Cal Poly',
    logo: '/assets/colleges/calpoly-logo.png',
    colors: {
      primary: '#154734', // Cal Poly Green
      secondary: '#C8C372', // Cal Poly Gold
    },
    academicCalendar: {
      quarters: true,
      terms: [
        {
          id: '202410',
          name: 'Fall 2024',
          startDate: '2024-09-19',
          endDate: '2024-12-13',
          registrationStart: '2024-05-01',
          registrationEnd: '2024-09-18',
        },
        {
          id: '202420',
          name: 'Winter 2025',
          startDate: '2025-01-06',
          endDate: '2025-03-21',
          registrationStart: '2024-11-01',
          registrationEnd: '2025-01-05',
        },
        {
          id: '202430',
          name: 'Spring 2025',
          startDate: '2025-03-31',
          endDate: '2025-06-13',
          registrationStart: '2025-02-01',
          registrationEnd: '2025-03-30',
        },
      ],
    },
    departments: [
      'AERO', 'AG', 'AGB', 'AGED', 'ANT', 'ARCE', 'ARCH', 'ART', 'ASCI', 'BIO',
      'BMED', 'BRAE', 'BUS', 'CD', 'CE', 'CHEM', 'CM', 'COMS', 'CPE', 'CRP',
      'CSC', 'DANC', 'DATA', 'ECON', 'EDUC', 'EE', 'ENGL', 'ENVE', 'ES', 'FSN',
      'GEOG', 'GS', 'HIST', 'IME', 'ISLA', 'ITP', 'LA', 'LAES', 'MATE', 'MATH',
      'ME', 'MSCI', 'MU', 'NR', 'PEM', 'PHIL', 'PHYS', 'POLS', 'PSY', 'RELS',
      'SCM', 'SOC', 'SPAN', 'STAT', 'TH', 'UNIV', 'WGS'
    ],
    majors: [
      {
        id: 'csc-bs',
        name: 'Computer Science',
        department: 'CSC',
        degree: 'BS',
        units: 180,
        requirements: {
          core: [
            'CSC 101', 'CSC 202', 'CSC 203', 'CSC 225', 'CSC 248', 'CSC 349',
            'CSC 357', 'CSC 430', 'CSC 445', 'CSC 453', 'CSC 480', 'CSC 481'
          ],
          electives: [
            'CSC 300-499', // Any upper-division CSC course
          ],
          ge: [
            'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4',
            'D1', 'D2', 'D3', 'D4', 'E', 'F', 'GE Electives'
          ],
        },
        flowchart: '/assets/flowcharts/csc-bs.pdf',
        catalog: 'https://catalog.calpoly.edu/collegesandprograms/collegeofengineering/computerscience/',
      },
      // Add more majors here
    ],
    classSearchEndpoint: 'https://pass.calpoly.edu/registrar/class-search',
    classSearchParams: {
      term: '202410', // Fall 2024
      subject: '',
      courseNumber: '',
    },
  },
  // Add more colleges here as needed
};

export const getCollegeConfig = (collegeId: string): CollegeConfig => {
  return colleges[collegeId] || colleges['calpoly']; // Default to Cal Poly if college not found
}; 