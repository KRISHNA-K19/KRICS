const CareerPath = require('../models/CareerPath');
const Opportunity = require('../models/Opportunity');

exports.seedDefaultData = async () => {
  try {
    const careerPathCount = await CareerPath.countDocuments();
    if (careerPathCount === 0) {
      await CareerPath.insertMany([
        {
          title: 'Data Scientist',
          description: 'Leverage machine learning, statistics, and data visualization to solve complex business domain challenges.',
          requiredSkills: [
            { name: 'Python', minLevel: 'ADVANCED' },
            { name: 'SQL', minLevel: 'INTERMEDIATE' },
            { name: 'Machine Learning', minLevel: 'ADVANCED' },
            { name: 'Inferential Statistics', minLevel: 'INTERMEDIATE' },
            { name: 'Data Visualization', minLevel: 'INTERMEDIATE' }
          ],
          importantSkills: ['PyTorch', 'Pandas', 'Docker', 'A/B Testing'],
          supportingSkills: ['Git', 'Cloud Computing', 'BigQuery'],
          averageSalary: '$125,000 / yr',
          demandLevel: 'Very High'
        },
        {
          title: 'AI/ML Engineer',
          description: 'Design, build, and deploy production machine learning models and neural networks at scale.',
          requiredSkills: [
            { name: 'Python', minLevel: 'EXPERT' },
            { name: 'PyTorch', minLevel: 'ADVANCED' },
            { name: 'Machine Learning', minLevel: 'ADVANCED' },
            { name: 'MLOps & Deployment', minLevel: 'INTERMEDIATE' }
          ],
          importantSkills: ['Docker', 'Kubernetes', 'Transformers', 'C++'],
          supportingSkills: ['Linux', 'Git', 'Vector Databases'],
          averageSalary: '$140,000 / yr',
          demandLevel: 'Extremely High'
        },
        {
          title: 'Full Stack Developer',
          description: 'Build complete web applications with modern frontend frameworks and robust backend APIs.',
          requiredSkills: [
            { name: 'React', minLevel: 'ADVANCED' },
            { name: 'Node.js', minLevel: 'ADVANCED' },
            { name: 'JavaScript', minLevel: 'EXPERT' },
            { name: 'SQL', minLevel: 'INTERMEDIATE' }
          ],
          importantSkills: ['TypeScript', 'Express', 'Tailwind CSS', 'MongoDB'],
          supportingSkills: ['Docker', 'REST APIs', 'GraphQL'],
          averageSalary: '$115,000 / yr',
          demandLevel: 'High'
        }
      ]);
      console.log('[KRICS Seed] Default Career Paths seeded successfully.');
    }

    const opportunityCount = await Opportunity.countDocuments();
    if (opportunityCount === 0) {
      await Opportunity.insertMany([
        {
          title: 'Junior Data Scientist',
          organization: 'Google AI Research',
          type: 'Full-Time Job',
          description: 'Develop predictive analytics models and collaborate with senior staff to extract telemetry insights.',
          location: 'Bengaluru / Remote',
          requiredSkills: ['Python', 'SQL', 'Machine Learning'],
          preferredSkills: ['PyTorch', 'BigQuery'],
          applicationUrl: 'https://careers.google.com',
          deadline: '2026-10-31'
        },
        {
          title: 'Full Stack Engineer Intern',
          organization: 'Microsoft India',
          type: 'Internship',
          description: 'Build responsive web apps and cloud APIs using React, Node.js, and Azure services.',
          location: 'Hyderabad / Hybrid',
          requiredSkills: ['React', 'Node.js', 'JavaScript'],
          preferredSkills: ['TypeScript', 'SQL'],
          applicationUrl: 'https://careers.microsoft.com',
          deadline: '2026-11-15'
        }
      ]);
      console.log('[KRICS Seed] Default Opportunities seeded successfully.');
    }
  } catch (err) {
    console.error('[KRICS Seed Error]:', err.message);
  }
};
