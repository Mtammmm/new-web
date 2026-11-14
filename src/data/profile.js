// Toàn bộ nội dung portfolio nằm ở đây. Sửa file này là đủ, không cần đụng vào giao diện.
// Nguồn: CV (public/Dang_Minh_Tam_CV.pdf) và GitHub github.com/Mtammmm.

export const profile = {
  name: 'Đặng Minh Tâm',
  handle: 'Mtammmm',
  title: 'Backend & cloud developer',
  subtitle: 'IT student at RMIT University Vietnam · Cloud Computing minor',
  location: 'Ho Chi Minh City, Vietnam',
  avatar: 'https://avatars.githubusercontent.com/u/218529468?v=4',
  intro:
    'I build backends in Java/Spring Boot, Node.js and Python, deploy them on AWS, and integrate LLM APIs into tools people use. Currently looking for backend, cloud or AI internships, FinTech especially welcome.',
  facts: [
    ['focus', 'Backend · Cloud · LLM integration'],
    ['studying', 'B. Information Technology, RMIT (2025 – 2028)'],
    ['next', 'NAWA scholarship exchange, University of Wrocław, 2027'],
    ['status', 'Open to internships']
  ],
  availability: 'Open to internships 2026',
  email: 'viktor.dangg@gmail.com',
  resume: '/Dang_Minh_Tam_CV.pdf',
  links: {
    github: 'https://github.com/Mtammmm',
    linkedin: 'https://www.linkedin.com/in/t%C3%A2m-%C4%91%E1%BA%B7ng-204330377/',
    facebook: 'https://www.facebook.com/angtam.949521',
    instagram: 'https://www.instagram.com/saxaxa_/'
  }
};

// Tên hiển thị của các liên kết trong profile.links.
export const linkLabels = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram'
};

// arch: các bước của hệ thống, vẽ thành sơ đồ luồng. highlight: kết quả nổi bật (nếu có).
// cover (tuỳ chọn): đường dẫn ảnh bìa riêng, vd. '/projects/csv-insight-cover.jpg'. Nếu có, ảnh này
// phủ kín tấm trên trang Work thay cho bìa dựng tự động (nền tối + sơ đồ kiến trúc).
export const projects = [
  {
    slug: 'csv-insight',
    title: 'CSV Insight',
    year: '2025',
    role: 'Cloud & backend',
    summary:
      'Cloud CSV analytics app. Uploads go to S3, a Dockerised worker on ECS processes the files, and Glue/Athena power the queries behind a Flask API running on Lambda.',
    arch: ['Static frontend', 'Flask API · Lambda', 'S3 uploads', 'ECS worker', 'Glue + Athena'],
    did: [
      'Built the Flask API, runnable locally and deployed as an AWS Lambda entrypoint.',
      'Wrote Lambda handlers for uploads and task events, and a Dockerised CSV-processing worker that runs on ECS.',
      'Stored uploads in S3 and records in DynamoDB; made processed data queryable through Glue and Athena.',
      'Added automated tests (pytest for the backend, Node test runner for the frontend) and an in-memory mode so the app runs without AWS.'
    ],
    impact: [
      'Graded High Distinction (80/100).',
      'Production mode refuses to start without a random JWT secret of 32+ characters; credentials stay out of the repo.'
    ],
    stack: ['Python', 'Flask', 'AWS Lambda', 'S3', 'ECS', 'DynamoDB', 'Docker', 'Pytest'],
    highlight: 'High Distinction · 80/100',
    repo: 'https://github.com/Mtammmm/CSV-Insight'
  },
  {
    slug: 'caiec-agritrade',
    title: 'CAIEC AgriTrade',
    year: '2026',
    role: 'Full-stack',
    summary:
      'Agricultural trade platform built for the CAIEC competition, with Supabase auth and Postgres, a dashboard UI, and AI features powered by Google Gemini.',
    arch: ['Next.js + shadcn/ui', 'Zustand · TanStack Query', 'Supabase Auth + Postgres', 'Gemini API'],
    did: [
      'Built the full-stack app in Next.js and TypeScript, with a dashboard UI using shadcn/ui and Tailwind CSS.',
      'Set up Supabase authentication and the Postgres database.',
      'Integrated Google Gemini for the platform’s AI features.',
      'Managed client state with Zustand and server data with TanStack Query.'
    ],
    impact: [],
    stack: ['TypeScript', 'Next.js', 'React', 'Tailwind CSS', 'Supabase', 'Gemini AI', 'Bun'],
    repo: 'https://github.com/Mtammmm/CAIEC-AgriTrade'
  },
  {
    slug: 'neo-meeting-summarizer',
    title: 'NEO Meeting Summarizer',
    year: '2025 – 2026',
    role: 'Neo Culture Tech Club',
    summary:
      'Upload or record a meeting, transcribe it, and get a summary with action items, speaker attribution and topic tags. Supports Vietnamese output, live progress and Markdown/PDF export.',
    arch: ['Upload / record', 'Whisper transcription', 'ChatGPT summary', 'WebSocket progress', 'Markdown / PDF'],
    did: [
      'Integrated the ChatGPT API to summarise meeting transcripts and extract action items.',
      'Added Vietnamese-language output so summaries work for the club’s Vietnamese meetings.'
    ],
    impact: [],
    stack: ['ChatGPT API', 'Whisper', 'WebSockets'],
    repo: 'https://github.com/rmit-nct/Meeting-Summarizer'
  },
  {
    slug: 'healthcare-backend',
    title: 'Healthcare Web Application',
    year: 'Mar – May 2025',
    role: 'Backend developer',
    summary:
      'Strictly typed, layered Spring Boot backend on a relational SQL database, implementing business logic for thousands of indigenous and migrant population records.',
    arch: ['REST controllers', 'Service layer', 'Repository layer', 'SQL database'],
    did: [
      'Designed the backend architecture with Spring Boot and a relational SQL database, using a strictly typed, layered structure.',
      'Implemented the complex business logic behind the population records.'
    ],
    impact: ['Handles thousands of indigenous and migrant population records.'],
    stack: ['Java', 'Spring Boot', 'SQL'],
    repo: null
  },
  {
    slug: 'ecommerce-backend',
    title: 'E-Commerce Website',
    year: 'Oct 2025 – Jan 2026',
    role: 'Backend developer',
    summary:
      'Modular, maintainable Node.js + Express backend with dynamic server-side templating and reusable patterns for data management.',
    arch: ['Express routes', 'Controllers', 'Server-side templates', 'Data layer'],
    did: [
      'Developed a modular, maintainable backend with Node.js and Express.',
      'Implemented dynamic server-side templating and set up reusable patterns for data management.'
    ],
    impact: [],
    stack: ['Node.js', 'Express', 'JavaScript'],
    repo: null
  },
  {
    slug: 'neo-cyber-research',
    title: 'NEO Cyber Research',
    year: '2025 – 2026',
    role: 'Project leader',
    summary: 'Led the club’s research into modern encryption and implemented selected cryptographic algorithms as demos.',
    arch: null,
    did: [
      'Led the club’s research into modern encryption.',
      'Implemented selected cryptographic algorithms as demos.'
    ],
    impact: [],
    stack: ['Cryptography', 'Research'],
    repo: null
  },
  {
    slug: 'breast-cancer-classifier',
    title: 'Classifier from Scratch',
    year: '2026',
    role: 'ML study',
    summary:
      'Logistic regression on the Breast Cancer Wisconsin dataset with gradients and gradient descent written by hand in NumPy (no .fit()), saved to JSON for inference.',
    arch: ['Wisconsin dataset', 'StandardScaler', 'NumPy logistic regression', 'model.json'],
    did: [
      'Split the Breast Cancer Wisconsin dataset into train, validation and test sets and standardised the 30 features.',
      'Wrote logistic regression by hand in NumPy: forward pass, binary cross-entropy loss, gradients and gradient descent, without calling .fit().',
      'Evaluated with accuracy, precision, recall and F1, and saved the model and training history to JSON for a separate prediction script.'
    ],
    impact: [
      'Held-out test set: 95.35% accuracy, 98.08% precision, 94.44% recall, 96.23% F1.'
    ],
    stack: ['Python', 'NumPy', 'scikit-learn'],
    repo: 'https://github.com/Mtammmm/chat-bot'
  }
];

// Hiển thị dạng git log, mới nhất ở trên.
export const experience = [
  {
    date: 'Mar 2026 – Sep 2026',
    title: 'Internal Vice President',
    org: 'RMIT Innovation & Social Entrepreneur Club',
    points: [
      'Led internal operations for a 70+ member club, strengthening engagement and team cohesion.',
      'Oversaw skill-building workshops on leadership, pitching and project management.',
      'Drove a cross-club collaboration with Neo Culture Tech and organised the end-of-semester trip.',
      'Hosted the visiting Reactor School delegation from NUS Singapore at RMIT Vietnam.'
    ]
  },
  {
    date: 'Feb 2026 – May 2026',
    title: 'External Relations',
    org: 'NEO League Season 2 · Innovation Humanity Challenge',
    points: [
      'Reached out to sponsors and handled stakeholder communication, including IoT workshop logistics.',
      'Contributed to the website and rules for a competition with 100+ contestants from HCMC and Hanoi.'
    ]
  },
  {
    date: 'Jul 2025 – Present',
    title: 'Technology Department member',
    org: 'RMIT Neo Culture Tech Club',
    tag: 'HEAD',
    points: [
      'Regular sprints and team meetings, collaborating and reviewing code on GitHub.',
      'Maintain the club platform: find bugs and report them to the Technical Vice President.'
    ]
  },
  {
    date: 'Mar 2025',
    title: 'Bachelor of Information Technology',
    org: 'RMIT University, Saigon South · Minor: Cloud Computing · GPA 3.0',
    tag: 'init',
    points: []
  }
];

export const awards = [
  {
    year: '2026',
    title: 'NAWA Scholarship',
    detail: 'Polish National Agency for Academic Exchange. Exchange at the University of Wrocław in 2027.'
  },
  {
    year: '2026',
    title: 'Top 10 Finalist & Team Leader, NEO League Season 2',
    detail: 'IoT & Innovation competition. Led the team from concept to final pitch.'
  },
  {
    year: '2025',
    title: 'High Distinction, CSV Insight',
    detail: 'Cloud computing project, 80/100.'
  }
];

export const stack = {
  languages: ['Java', 'TypeScript', 'Python', 'SQL', 'C#', 'JavaScript', 'R'],
  backend: ['Spring Boot', 'Node.js', 'Express', 'Flask', 'Socket.IO', 'REST APIs'],
  frontend: ['React', 'Next.js', 'Tailwind CSS', 'HTML', 'CSS'],
  dataCloud: ['PostgreSQL', 'Supabase', 'DynamoDB', 'AWS', 'Docker'],
  ai: ['OpenAI API', 'Gemini API', 'Whisper', 'NumPy'],
  practices: ['Git/GitHub', 'Agile/Scrum', 'Pytest'],
  design: ['Figma', 'Canva', 'Premiere Pro', 'Lightroom']
};

// Trang About: các dòng chữ nhỏ xếp đối xứng (kim cương) ở màn đầu.
export const statements = [
  'Đặng Minh Tâm is a backend developer who learns by shipping',
  'Building typed, layered services in Java, Node.js and Python',
  'Deploying on AWS with Lambda, S3, ECS, Athena and DynamoDB',
  'Wiring LLM APIs into tools that people actually use, from summaries to dashboards',
  'Leading clubs, teams and pitches from the first idea to the final demo, on time and in scope',
  'IT student at RMIT Vietnam, heading to the University of Wrocław on a NAWA scholarship in 2027'
];

// Hai cột chữ lặp ở hai bên khung.
export const frameWords = ['Backend engineering', 'Cloud computing'];

// Chữ đỏ cỡ lớn nằm sau người trên dải ảnh chân dung (trang About), mỗi phần tử một dòng.
export const major = ['Information', 'Technology'];

export const scope = [
  'Java / Spring Boot',
  'Node.js / Express',
  'Python / Flask',
  'TypeScript / Next.js',
  'React / Tailwind CSS',
  'SQL / PostgreSQL',
  'DynamoDB / Supabase',
  'AWS Lambda / S3 / ECS',
  'Glue / Athena',
  'Docker',
  'OpenAI / Gemini APIs',
  'REST APIs / WebSockets',
  'Git / Agile / Scrum'
];

export const bio =
  'IT student at RMIT University Vietnam with a Cloud Computing minor. Hands-on backend experience in Java/SQL and Node.js/Express, practical work integrating LLM APIs, and a track record of leading student organisations. Looking for internships where backend and AI meet real products, FinTech especially.';

// Học vấn, hiển thị ở trang About: tên bên trái, năm bên phải, detail là dòng phụ (tuỳ chọn).
export const education = [
  {
    title: 'Bachelor of Information Technology, RMIT University Vietnam',
    detail: 'Minor in Cloud Computing · GPA 3.0',
    year: '2025 — 2028',
    // Dùng cho chữ kiểu bìa tạp chí trên dải chân dung (About).
    school: 'RMIT University Vietnam',
    minor: 'Cloud Computing'
  },
  {
    title: 'NAWA scholarship exchange, University of Wrocław, Poland',
    year: '2027'
  }
];

// Ảnh ở cột giữa trang About, đổi theo tiến độ cuộn. Thêm ảnh: chỉ cần thêm một phần tử.
export const aboutPhotos = [
  {
    src: '/about-ferry.jpg',
    alt: `${profile.name} on a ferry deck, looking out to sea`,
    caption: 'Studying at RMIT since 2025',
    meta: 'Backend / Cloud / Applied AI'
  },
  {
    src: '/nus-delegation.jpg',
    alt: 'Group photo with the Reactor School delegation from NUS Singapore at RMIT Vietnam',
    caption: 'Hosting the Reactor School delegation from NUS Singapore',
    meta: 'Internal Vice President · RMIT ISE Club'
  },
  {
    src: '/nus-lunch.jpg',
    alt: 'Talking with a visiting NUS student over lunch at RMIT Vietnam',
    caption: 'Lunch and conversations with the visiting NUS students',
    meta: 'RMIT Vietnam · Saigon South'
  },
  {
    src: '/club-session.jpg',
    alt: 'Two students listening during a club workshop session at RMIT Vietnam',
    caption: 'Club workshop session',
    meta: 'RMIT Vietnam'
  },
  {
    src: '/nct-workshop.jpg',
    alt: 'A speaker presenting a case study slide at a Neo Culture Tech workshop',
    caption: 'Case study session at a Neo Culture Tech workshop',
    meta: 'RMIT Neo Culture Tech Club'
  }
];
