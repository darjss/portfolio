export type Locale = 'en' | 'mn';

export interface LocalizedText {
    en: string;
    mn: string;
}

export interface Project {
    name: LocalizedText;
    description: LocalizedText;
    websiteUrl?: string;
    sourceUrl?: string;
}

export interface TimelineItem {
    role: LocalizedText;
    organization: LocalizedText;
    period: string;
    highlights: LocalizedText[];
}

export interface EducationItem {
    institution: LocalizedText;
    program: LocalizedText;
    period: string;
}

export interface Social {
    icon: 'github' | 'email' | 'phone';
    link: string;
    title: LocalizedText;
}

export const profile = {
    name: 'Aviddaram Bazarragchaa',
    title: {
        en: 'Software Developer',
        mn: 'Програм хангамжийн хөгжүүлэгч'
    },
    location: {
        en: 'Ulaanbaatar, Mongolia',
        mn: 'Улаанбаатар, Монгол Улс'
    },
    description: {
        en: 'I am a software developer and student at the National University of Mongolia, building practical products with TypeScript, JavaScript, backend systems, and DevOps workflows.',
        mn: 'Би Монгол Улсын Их Сургуулийн оюутан, програм хангамжийн хөгжүүлэгч бөгөөд TypeScript, JavaScript, backend систем болон DevOps урсгалаар бодит бүтээгдэхүүн хөгжүүлдэг.'
    }
};

export const terminalCopy = {
    command: 'npx connect',
    initializing: {
        en: 'Initializing...',
        mn: 'Эхлүүлж байна...'
    },
    ready: {
        en: 'Ready to connect.',
        mn: 'Холбогдоход бэлэн боллоо.'
    },
    waiting: {
        en: 'Waiting for contact request...',
        mn: 'Холбогдох хүсэлтийг хүлээж байна...'
    }
};

export const socials: Social[] = [{
    icon: 'github' as const,
    link: 'https://github.com/darjss',
    title: {
        en: 'View GitHub profile',
        mn: 'GitHub хаяг үзэх'
    }
}, {
    icon: 'email',
    link: 'mailto:darjsavid@gmail.com',
    title: {
        en: 'Send email',
        mn: 'И-мэйл илгээх'
    }
}, {
    icon: 'phone',
    link: 'tel:+97694568799',
    title: {
        en: 'Call +976 94568799',
        mn: '+976 94568799 дугаарт залгах'
    }
}];

export const projects: Project[] = [{
    name: {
        en: 'sisi-agent',
        mn: 'sisi-agent'
    },
    description: {
        en: 'My bachelor thesis project focused on building an AI agent system for practical, autonomous workflows.',
        mn: 'AI agent системийг бодит, бие даасан ажлын урсгалд ашиглахад чиглэсэн миний бакалаврын дипломын төсөл.'
    },
    sourceUrl: 'https://github.com/darjss/sisi-agent'
}, {
    name: {
        en: 'tseej-bichig',
        mn: 'тээж бичиг'
    },
    description: {
        en: 'A dictation app for children in Mongolia that automates speaking exercises to help them improve Mongolian language skills.',
        mn: 'Монгол хүүхдүүдэд зориулсан сонсгол бичгийн апп бөгөөд диктантыг автоматжуулж, хэлний чадвараа сайжруулахад тусалдаг.'
    },
    sourceUrl: 'https://github.com/darjss/tseej-bichig'
}, {
    name: {
        en: 'diagram',
        mn: 'diagram'
    },
    description: {
        en: 'An AI product that turns prompts into diagrams to make ideas and system flows easier to explore visually.',
        mn: 'Prompt-оос диаграм үүсгэдэг AI бүтээгдэхүүн бөгөөд санаа болон системийн урсгалыг дүрслэн ойлгоход хялбар болгодог.'
    },
    sourceUrl: 'https://github.com/darjss/diagram'
}];

export const uiCopy = {
    tabs: {
        about: {
            en: 'about.ts',
            mn: 'танилцуулга.ts'
        },
        projects: {
            en: 'projects.md',
            mn: 'төслүүд.md'
        },
        experience: {
            en: 'experience.md',
            mn: 'туршлага.md'
        }
    },
    controls: {
        language: {
            en: '🇲🇳',
            mn: '🇺🇸'
        },
        themeLight: {
            en: '☀️',
            mn: '☀️'
        },
        themeDark: {
            en: '🌙',
            mn: '🌙'
        }
    },
    projectWebsite: {
        en: 'Open Project Website',
        mn: 'Төслийн сайт нээх'
    },
    projectSource: {
        en: 'View Source Code',
        mn: 'Эх код үзэх'
    },
    projectSourcePrivate: {
        en: 'Source Code Private',
        mn: 'Эх код нууц'
    },
    cvDownload: {
        en: 'Download CV',
        mn: 'CV татах'
    },
    sections: {
        experience: {
            en: 'work-experience.md',
            mn: 'ажлын-туршлага.md'
        },
        education: {
            en: 'education.md',
            mn: 'боловсрол.md'
        }
    }
};

export const education: EducationItem[] = [{
    institution: {
        en: 'National University of Mongolia',
        mn: 'Монгол Улсын Их Сургууль'
    },
    program: {
        en: 'Information Systems, Bachelor Degree',
        mn: 'Мэдээллийн систем, бакалаврын зэрэг'
    },
    period: 'Sep 2022 - May 2026'
}, {
    institution: {
        en: 'Pinecone Academy',
        mn: 'Pinecone Academy'
    },
    program: {
        en: 'Leap Software Engineering Program',
        mn: 'Leap Software Engineering хөтөлбөр'
    },
    period: 'Oct 2023 - May 2024'
}];

export const experience: TimelineItem[] = [{
    role: {
        en: 'Software Developer',
        mn: 'Програм хөгжүүлэгч'
    },
    organization: {
        en: 'Golomt Bank',
        mn: 'Голомт Банк'
    },
    period: 'May 2024 - Jun 2025',
    highlights: [{
        en: 'Contributed to SocialPay backend development, preventive maintenance, and issue resolution to keep the app stable and reliable.',
        mn: 'SocialPay багийн backend хөгжүүлэлтэд оролцож, урьдчилан сэргийлэх засвар үйлчилгээ болон алдааны шийдлээр аппликешний тогтвортой, найдвартай байдлыг хангасан.'
    }, {
        en: 'Built a full Spring Boot backend for an SME banking app with authentication, transaction processing, and secure POS-to-internet-banking integration.',
        mn: 'Spring Boot ашиглан ЖДҮ-д зориулсан банкны аппликешний backend-ийг нэвтрэх эрх баталгаажуулалт, гүйлгээ боловсруулалт, ПОС интеграцитайгаар бие даан хэрэгжүүлсэн.'
    }, {
        en: 'Integrated QR interoperability between SocialPay and MostMoney platforms, strengthening third-party API integration experience.',
        mn: 'SocialPay болон MostMoney платформуудын хооронд QR кодын харилцан ажиллах интеграци хийж, гуравдагч талын API интеграцийн туршлагаа бататгасан.'
    }]
}, {
    role: {
        en: 'SAT Reading and Writing Instructor',
        mn: 'SAT уншлага ба бичгийн багш'
    },
    organization: {
        en: 'Universal Learning Center',
        mn: 'Universal Learning Center'
    },
    period: 'Feb 2022 - May 2022',
    highlights: [{
        en: 'Prepared 20+ students across 2 classes and created targeted study plans for SAT reading and writing.',
        mn: '20+ оюутныг 2 ангид хуваан SAT уншлага, бичгийн хэсэгт бэлтгэж, зорилтот сургалтын төлөвлөгөө боловсруулсан.'
    }, {
        en: 'Improved average student scores by around 300 points over a two-month preparation cycle.',
        mn: '2 сарын бэлтгэлийн хугацаанд оюутнуудын голч оноог дунджаар 300 оноогоор ахиулсан.'
    }, {
        en: 'Mentored international applicants on US university admissions strategy, scholarships, and financial aid paths.',
        mn: 'Олон улсын оюутнуудад АНУ-ын их, дээд сургуулийн элсэлт, тэтгэлэг, санхүүжилтийн зөвлөгөө өгсөн.'
    }]
}];
