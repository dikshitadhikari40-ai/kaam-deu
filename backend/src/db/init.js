const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDb, saveDb, prepare } = require('./database');

async function initializeDatabase() {
    console.log('Initializing database...');

    await initDb();

    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const { getDb } = require('./database');
    const db = getDb();

    // Execute each statement separately
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
        if (stmt.trim()) {
            try {
                db.run(stmt);
            } catch (e) {
                // Ignore errors for IF NOT EXISTS statements
            }
        }
    }
    saveDb();

    console.log('Schema created successfully!');

    // Check if we need to seed
    const existingUsers = prepare('SELECT COUNT(*) as count FROM users').get();

    if (existingUsers && existingUsers.count > 0) {
        console.log('Database already has data, skipping seed.');
        return;
    }

    console.log('Seeding database with sample data...');

    // Sample workers (Nepali context)
    const workers = [
        {
            email: 'ram.thapa@email.com',
            password: 'password123',
            name: 'Ram Thapa',
            age: 28,
            phone: '+977-9841234567',
            location: 'Kathmandu, Nepal',
            bio: 'Experienced construction worker with 5 years in building and renovation. Skilled in masonry, carpentry, and general labor. Hardworking and reliable.',
            job_title: 'Construction Worker',
            experience_years: 5,
            expected_salary_npr: 25000,
            skills: JSON.stringify(['Masonry', 'Carpentry', 'Painting', 'Plumbing Basics']),
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
            ])
        },
        {
            email: 'sita.gurung@email.com',
            password: 'password123',
            name: 'Sita Gurung',
            age: 24,
            phone: '+977-9851234567',
            location: 'Pokhara, Nepal',
            bio: 'Professional housekeeper with experience in hotels and private homes. Detail-oriented and trustworthy. Can also cook traditional Nepali meals.',
            job_title: 'Housekeeper',
            experience_years: 3,
            expected_salary_npr: 18000,
            skills: JSON.stringify(['Cleaning', 'Cooking', 'Laundry', 'Childcare']),
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
                'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800'
            ])
        },
        {
            email: 'bikash.rai@email.com',
            password: 'password123',
            name: 'Bikash Rai',
            age: 32,
            phone: '+977-9861234567',
            location: 'Bhaktapur, Nepal',
            bio: 'Licensed electrician with 8 years experience. Specialized in residential and commercial wiring, repairs, and installations. Safety certified.',
            job_title: 'Electrician',
            experience_years: 8,
            expected_salary_npr: 35000,
            skills: JSON.stringify(['Electrical Wiring', 'Repairs', 'Installation', 'Safety Compliance']),
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800'
            ])
        },
        {
            email: 'maya.tamang@email.com',
            password: 'password123',
            name: 'Maya Tamang',
            age: 26,
            phone: '+977-9871234567',
            location: 'Lalitpur, Nepal',
            bio: 'Skilled tailor with expertise in traditional and modern clothing. Can design and stitch kurta suruwal, sari blouses, and western wear.',
            job_title: 'Tailor',
            experience_years: 6,
            expected_salary_npr: 22000,
            skills: JSON.stringify(['Stitching', 'Pattern Making', 'Alterations', 'Embroidery']),
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
            ])
        },
        {
            email: 'krishna.shah@email.com',
            password: 'password123',
            name: 'Krishna Shah',
            age: 35,
            phone: '+977-9881234567',
            location: 'Chitwan, Nepal',
            bio: 'Professional driver with clean record. Experienced in both city and highway driving. Can drive cars, vans, and small trucks.',
            job_title: 'Driver',
            experience_years: 10,
            expected_salary_npr: 28000,
            skills: JSON.stringify(['Driving', 'Vehicle Maintenance', 'Navigation', 'Customer Service']),
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
            ])
        }
    ];

    // Sample businesses
    const businesses = [
        {
            email: 'hr@everestconstruction.com',
            password: 'password123',
            company_name: 'Everest Construction Pvt. Ltd.',
            contact_person: 'Rajesh Sharma',
            phone: '+977-01-4123456',
            location: 'Kathmandu, Nepal',
            description: 'Leading construction company in Nepal. Building homes, offices, and commercial spaces since 2005.',
            industry: 'Construction',
            company_size: '50-100',
            logo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400'
        },
        {
            email: 'jobs@himalayahotel.com',
            password: 'password123',
            company_name: 'Himalaya Hotel & Resort',
            contact_person: 'Anita Shrestha',
            phone: '+977-061-234567',
            location: 'Pokhara, Nepal',
            description: 'Premium hospitality services in the heart of Pokhara. Looking for dedicated staff to join our team.',
            industry: 'Hospitality',
            company_size: '100-200',
            logo_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
        }
    ];

    // Insert workers
    for (const worker of workers) {
        const userId = uuidv4();
        const profileId = uuidv4();
        const passwordHash = bcrypt.hashSync(worker.password, 10);

        prepare(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
            userId, worker.email, passwordHash, 'worker'
        );

        prepare(`
            INSERT INTO worker_profiles (id, user_id, name, age, phone, location, bio, job_title, experience_years, expected_salary_npr, skills, images, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            profileId, userId, worker.name, worker.age, worker.phone,
            worker.location, worker.bio, worker.job_title, worker.experience_years,
            worker.expected_salary_npr, worker.skills, worker.images, 1
        );
    }

    // Insert businesses
    for (const business of businesses) {
        const userId = uuidv4();
        const profileId = uuidv4();
        const passwordHash = bcrypt.hashSync(business.password, 10);

        prepare(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
            userId, business.email, passwordHash, 'business'
        );

        prepare(`
            INSERT INTO business_profiles (id, user_id, company_name, contact_person, phone, location, description, industry, company_size, logo_url, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            profileId, userId, business.company_name, business.contact_person,
            business.phone, business.location, business.description,
            business.industry, business.company_size, business.logo_url, 1
        );
    }

    console.log(`Seeded ${workers.length} workers and ${businesses.length} businesses.`);
    console.log('Database setup complete!');
}

// Run if called directly
if (require.main === module) {
    initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };
