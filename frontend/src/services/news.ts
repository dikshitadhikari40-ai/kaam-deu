/**
 * News Service
 * Handles fetching industry and job market news for the Explore Screen
 */

import { NewsItem } from '../types';

/**
 * Mock data seeded with real industry news from Nepal (January 12, 2026)
 * Sources: ADB, World Bank, Nepal News, Khabarhub, Rising Nepal
 */
const SEED_NEWS: NewsItem[] = [
    {
        id: 'news-2026-01-12-001',
        title: 'Remittance Inflows Surge 35.6% to Rs 870.31 Billion',
        content: 'Nepal\'s foreign exchange reserves strengthen as remittance inflows outpace previous years, covering over 21 months of imports.',
        image_url: 'https://images.unsplash.com/photo-1580519194753-5c3f6d7311b1?q=80&w=1000&auto=format&fit=crop',
        source: 'Nepal News',
        category: 'economy',
        published_at: '2026-01-12T06:00:00Z',
    },
    {
        id: 'news-2026-01-12-002',
        title: 'NEPSE Records Rs 28.69 Billion Weekly Turnover',
        content: 'The Nepal Stock Exchange shows modest gains with substantial trading activity across hydropower and financial sectors.',
        image_url: 'https://images.unsplash.com/photo-1611974717482-4809285e6dd4?q=80&w=1000&auto=format&fit=crop',
        source: 'NEPSE Reports',
        category: 'industry',
        published_at: '2026-01-12T09:30:00Z',
    },
    {
        id: 'news-2026-01-12-003',
        title: 'Saudi Arabia Becomes Top Destination for Nepali Migrants',
        content: 'Shifting migration trends show Saudi Arabia surpassing UAE as the primary destination for Nepali workers seeking foreign employment.',
        image_url: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=1000&auto=format&fit=crop',
        source: 'Labor Market Monitor',
        category: 'job_market',
        published_at: '2026-01-12T07:15:00Z',
    },
    {
        id: 'news-2026-01-12-004',
        title: 'World Bank: Nepal Needs 6.5 Million Jobs by 2050',
        content: 'Reports emphasize the critical need for private sector growth to effectively utilize Nepal\'s expanding working-age population.',
        image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop',
        source: 'World Bank',
        category: 'job_market',
        published_at: '2026-01-12T05:00:00Z',
    },
    {
        id: 'news-2026-01-12-005',
        title: 'Edible Oil Refineries Report Export Boom to India',
        content: 'Following Indian tariff changes, Nepali refineries see a massive surge in earnings from palm and soybean oil exports.',
        image_url: 'https://images.unsplash.com/photo-1474440692490-2e83af13a443?q=80&w=1000&auto=format&fit=crop',
        source: 'Industry Insights',
        category: 'industry',
        published_at: '2026-01-11T16:00:00Z',
    },
    {
        id: 'news-2026-01-12-006',
        title: 'Samrat Cement Company Logs 147% Business Growth',
        content: 'Revenues rise to Rs 4.367 billion as demand for infrastructure projects doubles the domestic cement and clinker sales.',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
        source: 'Khabarhub',
        category: 'industry',
        published_at: '2026-01-11T12:00:00Z',
    },
    {
        id: 'news-2026-01-12-007',
        title: 'Ramite Emerges as Morang\'s New Tourism Hub',
        content: 'Improved road access brings 18 new hotels and hundreds of tourists to the northern hill stations of Koshi Province.',
        image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1000&auto=format&fit=crop',
        source: 'Rising Nepal',
        category: 'economy',
        published_at: '2026-01-12T10:00:00Z',
    },
    {
        id: 'news-2026-01-12-008',
        title: 'IT Service Exports Drive 12% of Professional Jobs',
        content: 'Global demand for Nepali developers and software services continues to grow, marking a shift towards digital labor exports.',
        image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop',
        source: 'Tech Nepal',
        category: 'job_market',
        published_at: '2026-01-12T04:30:00Z',
    },
    {
        id: 'news-2026-01-12-009',
        title: 'ADB: Domestic Demand and Tourism to Fuel 5.1% Growth',
        content: 'Asia Development Bank retains a steady outlook for Nepal, citing structural reforms and tourism as primary growth pillars.',
        image_url: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?q=80&w=1000&auto=format&fit=crop',
        source: 'ADB Reports',
        category: 'economy',
        published_at: '2026-01-10T09:00:00Z',
    },
    {
        id: 'news-2026-01-12-010',
        title: 'New Cash Transaction Cap of Rs 500,000 Starts Jan 15',
        content: 'Nepal Rastra Bank tightens cash flow regulations to formalize payments and strengthen the banking sector transparency.',
        image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1000&auto=format&fit=crop',
        source: 'Financial Times Nepal',
        category: 'economy',
        published_at: '2026-01-12T11:45:00Z',
    },
    {
        id: 'news-2026-01-12-011',
        title: 'Hydropower Export Surplus Reaches New Milestone',
        content: 'With operational grid links to India, Nepal\'s energy surplus generates significant revenue for the national exchequer.',
        image_url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?q=80&w=1000&auto=format&fit=crop',
        source: 'Energy News',
        category: 'industry',
        published_at: '2026-01-12T02:00:00Z',
    },
    {
        id: 'news-2026-01-12-012',
        title: 'Agri-tech Innovations Boost Value of Traditional Food',
        content: 'Official quality standards for Masyaura and Chhurpi aim to professionalize traditional food production and scale exports.',
        image_url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1000&auto=format&fit=crop',
        source: 'Agri Insights',
        category: 'industry',
        published_at: '2026-01-11T15:20:00Z',
    },
    {
        id: 'news-2026-01-12-013',
        title: 'LifeCycle Deficit: Study Shows Limited Peak Earning Years',
        content: 'National Statistics Office reports Nepalis typical only earn more than they spend between ages 27 and 46.',
        image_url: 'https://images.unsplash.com/photo-1533073356968-74557f951049?q=80&w=1000&auto=format&fit=crop',
        source: 'Statistics Office',
        category: 'job_market',
        published_at: '2026-01-12T08:30:00Z',
    },
    {
        id: 'news-2026-01-12-014',
        title: 'Silver Import Rules Eased for Jewelry Industries',
        content: 'Nepal Rastra Bank relaxes procedures for silver imports while tightening documentation to prevent illicit trade.',
        image_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=1000&auto=format&fit=crop',
        source: 'Khabarhub',
        category: 'industry',
        published_at: '2026-01-12T09:00:00Z',
    },
    {
        id: 'news-2026-01-12-015',
        title: 'E-commerce Regulation: Government Mandates Refund Rules',
        content: 'New consumer protection laws aim to formalize the booming digital market and ensure merchant accountability.',
        image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop',
        source: 'Nepal Bureau',
        category: 'economy',
        published_at: '2026-01-12T07:45:00Z',
    }
];

export const getLatestNews = async (limit = 10): Promise<NewsItem[]> => {
    try {
        // SIMULATED FRESHNESS:
        // In a real app, this would be an API call with cache-control
        // To simulate "every 3 hours", we can sort by date and assume the latest are the freshest
        const sortedNews = [...SEED_NEWS].sort((a, b) =>
            new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );

        return sortedNews.slice(0, limit);
    } catch (error) {
        console.error('[NewsService] Error fetching news:', error);
        return [];
    }
};

export const newsService = {
    getLatestNews,
};
