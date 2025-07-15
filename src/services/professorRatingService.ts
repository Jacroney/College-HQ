import axios from 'axios';

interface ProfessorRating {
  name: string;
  department: string;
  overallRating: number;
  difficulty: number;
  wouldTakeAgain: number;
  totalRatings: number;
  rmpUrl: string;
  polyRatingsUrl: string;
}

class ProfessorRatingService {
  private static instance: ProfessorRatingService;
  private cache: Map<string, ProfessorRating> = new Map();

  private constructor() {}

  static getInstance(): ProfessorRatingService {
    if (!ProfessorRatingService.instance) {
      ProfessorRatingService.instance = new ProfessorRatingService();
    }
    return ProfessorRatingService.instance;
  }

  async getProfessorRating(name: string, department: string): Promise<ProfessorRating> {
    const cacheKey = `${name}-${department}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Fetch ratings from both sources in parallel
      const [rmpRating, polyRating] = await Promise.all([
        this.fetchRateMyProfessorRating(name, department),
        this.fetchPolyRatingsRating(name, department),
      ]);

      // Combine ratings
      const combinedRating: ProfessorRating = {
        name,
        department,
        overallRating: this.calculateCombinedRating(rmpRating, polyRating),
        difficulty: rmpRating?.difficulty || 0,
        wouldTakeAgain: rmpRating?.wouldTakeAgain || 0,
        totalRatings: (rmpRating?.totalRatings || 0) + (polyRating?.totalRatings || 0),
        rmpUrl: rmpRating?.url || '',
        polyRatingsUrl: polyRating?.url || '',
      };

      // Cache the result
      this.cache.set(cacheKey, combinedRating);
      return combinedRating;
    } catch (error) {
      console.error('Error fetching professor ratings:', error);
      return {
        name,
        department,
        overallRating: 0,
        difficulty: 0,
        wouldTakeAgain: 0,
        totalRatings: 0,
        rmpUrl: '',
        polyRatingsUrl: '',
      };
    }
  }

  private async fetchRateMyProfessorRating(name: string, department: string) {
    try {
      // TODO: Implement AWS Lambda function to scrape RateMyProfessor data
      // This should use AWS Lambda with proper rate limiting and error handling
      const response = await axios.get(`/api/professor/rmp?name=${encodeURIComponent(name)}&department=${encodeURIComponent(department)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RateMyProfessor rating:', error);
      return null;
    }
  }

  private async fetchPolyRatingsRating(name: string, department: string) {
    try {
      // TODO: Implement AWS Lambda function to scrape PolyRatings data
      // This should use AWS Lambda with proper rate limiting and error handling
      const response = await axios.get(`/api/professor/polyratings?name=${encodeURIComponent(name)}&department=${encodeURIComponent(department)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching PolyRatings rating:', error);
      return null;
    }
  }

  private calculateCombinedRating(rmpRating: { overallRating?: number } | null, polyRating: { overallRating?: number } | null): number {
    let totalRating = 0;
    let totalWeight = 0;

    if (rmpRating?.overallRating) {
      // Convert RMP's 5-star scale to 4-star scale
      totalRating += (rmpRating.overallRating * 4) / 5;
      totalWeight += 1;
    }

    if (polyRating?.overallRating) {
      totalRating += polyRating.overallRating;
      totalWeight += 1;
    }

    return totalWeight > 0 ? totalRating / totalWeight : 0;
  }

  clearCache() {
    this.cache.clear();
  }
}

export default ProfessorRatingService; 