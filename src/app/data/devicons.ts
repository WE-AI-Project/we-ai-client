// ── WE&AI Devicon 목록 (curated) ──
// URL: https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/{slug}/{slug}-{variant}.svg

export type DevIcon = {
  name:     string;
  slug:     string;
  variant:  string; // "original" | "plain" | "plain-wordmark"
  category: string;
};

export function deviconUrl(slug: string, variant = "original") {
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}-${variant}.svg`;
}

export const DEVICONS: DevIcon[] = [
  // ── Backend ──
  { name: "Java",         slug: "java",         variant: "original",       category: "Backend"    },
  { name: "Spring",       slug: "spring",       variant: "original",       category: "Backend"    },
  { name: "Python",       slug: "python",       variant: "original",       category: "Backend"    },
  { name: "FastAPI",      slug: "fastapi",      variant: "original",       category: "Backend"    },
  { name: "Go",           slug: "go",           variant: "original",       category: "Backend"    },
  { name: "Rust",         slug: "rust",         variant: "plain",          category: "Backend"    },
  { name: "Node.js",      slug: "nodejs",       variant: "original",       category: "Backend"    },
  { name: "Express",      slug: "express",      variant: "original",       category: "Backend"    },
  { name: "Kotlin",       slug: "kotlin",       variant: "original",       category: "Backend"    },
  { name: "C#",           slug: "csharp",       variant: "original",       category: "Backend"    },
  { name: "C++",          slug: "cplusplus",    variant: "original",       category: "Backend"    },
  { name: "PHP",          slug: "php",          variant: "original",       category: "Backend"    },
  { name: "Ruby",         slug: "ruby",         variant: "original",       category: "Backend"    },
  { name: "Django",       slug: "django",       variant: "plain",          category: "Backend"    },
  { name: "Flask",        slug: "flask",        variant: "original",       category: "Backend"    },
  { name: "GraphQL",      slug: "graphql",      variant: "plain",          category: "Backend"    },

  // ── Frontend ──
  { name: "JavaScript",   slug: "javascript",   variant: "original",       category: "Frontend"   },
  { name: "TypeScript",   slug: "typescript",   variant: "original",       category: "Frontend"   },
  { name: "React",        slug: "react",        variant: "original",       category: "Frontend"   },
  { name: "Vue.js",       slug: "vuejs",        variant: "original",       category: "Frontend"   },
  { name: "Angular",      slug: "angularjs",    variant: "original",       category: "Frontend"   },
  { name: "Next.js",      slug: "nextjs",       variant: "original",       category: "Frontend"   },
  { name: "Svelte",       slug: "svelte",       variant: "original",       category: "Frontend"   },
  { name: "HTML5",        slug: "html5",        variant: "original",       category: "Frontend"   },
  { name: "CSS3",         slug: "css3",         variant: "original",       category: "Frontend"   },
  { name: "Tailwind",     slug: "tailwindcss",  variant: "original",       category: "Frontend"   },
  { name: "SASS",         slug: "sass",         variant: "original",       category: "Frontend"   },
  { name: "Flutter",      slug: "flutter",      variant: "original",       category: "Frontend"   },
  { name: "Swift",        slug: "swift",        variant: "original",       category: "Frontend"   },

  // ── Database ──
  { name: "PostgreSQL",   slug: "postgresql",   variant: "original",       category: "Database"   },
  { name: "MySQL",        slug: "mysql",        variant: "original",       category: "Database"   },
  { name: "MongoDB",      slug: "mongodb",      variant: "original",       category: "Database"   },
  { name: "Redis",        slug: "redis",        variant: "original",       category: "Database"   },
  { name: "SQLite",       slug: "sqlite",       variant: "original",       category: "Database"   },
  { name: "Elasticsearch",slug: "elasticsearch",variant: "original",       category: "Database"   },

  // ── DevOps / Infra ──
  { name: "Docker",       slug: "docker",       variant: "original",       category: "DevOps"     },
  { name: "Kubernetes",   slug: "kubernetes",   variant: "plain",          category: "DevOps"     },
  { name: "Terraform",    slug: "terraform",    variant: "original",       category: "DevOps"     },
  { name: "Ansible",      slug: "ansible",      variant: "original",       category: "DevOps"     },
  { name: "Nginx",        slug: "nginx",        variant: "original",       category: "DevOps"     },
  { name: "Linux",        slug: "linux",        variant: "original",       category: "DevOps"     },
  { name: "Bash",         slug: "bash",         variant: "plain",          category: "DevOps"     },
  { name: "AWS",          slug: "amazonwebservices", variant: "plain-wordmark", category: "DevOps" },
  { name: "GCP",          slug: "googlecloud",  variant: "original",       category: "DevOps"     },
  { name: "Azure",        slug: "azure",        variant: "original",       category: "DevOps"     },
  { name: "GitHub Actions",slug:"githubactions", variant: "original",      category: "DevOps"     },
  { name: "Jenkins",      slug: "jenkins",      variant: "original",       category: "DevOps"     },

  // ── Tools ──
  { name: "Git",          slug: "git",          variant: "original",       category: "Tools"      },
  { name: "GitHub",       slug: "github",       variant: "original",       category: "Tools"      },
  { name: "GitLab",       slug: "gitlab",       variant: "original",       category: "Tools"      },
  { name: "VS Code",      slug: "vscode",       variant: "original",       category: "Tools"      },
  { name: "IntelliJ",     slug: "intellij",     variant: "original",       category: "Tools"      },
  { name: "Gradle",       slug: "gradle",       variant: "original",       category: "Tools"      },
  { name: "Maven",        slug: "maven",        variant: "original",       category: "Tools"      },
  { name: "NPM",          slug: "npm",          variant: "original-wordmark", category: "Tools"   },
  { name: "Yarn",         slug: "yarn",         variant: "original",       category: "Tools"      },
  { name: "Figma",        slug: "figma",        variant: "original",       category: "Tools"      },
  { name: "Jupyter",      slug: "jupyter",      variant: "original",       category: "Tools"      },

  // ── AI / Data ──
  { name: "PyTorch",      slug: "pytorch",      variant: "original",       category: "AI"         },
  { name: "TensorFlow",   slug: "tensorflow",   variant: "original",       category: "AI"         },
  { name: "Pandas",       slug: "pandas",       variant: "original",       category: "AI"         },
  { name: "NumPy",        slug: "numpy",        variant: "original",       category: "AI"         },
];

export const DEVICON_CATEGORIES = ["All", "Backend", "Frontend", "Database", "DevOps", "Tools", "AI"] as const;
