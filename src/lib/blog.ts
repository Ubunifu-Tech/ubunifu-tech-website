import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), '_posts');

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  coverImage?: string;
  excerpt: string;
  content: string;
  tags: string[];
  readingTime: number; // estimated minutes
}

// Rough reading time at ~200 words/minute, floored at 1 minute.
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function getAllPosts(): BlogPost[] {
  // Ensure directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title,
        date: data.date,
        author: data.author,
        coverImage: data.coverImage,
        excerpt: data.excerpt,
        tags: data.tags || [],
        content,
        readingTime: estimateReadingTime(content),
      };
    });

  // Sort posts by date
  return allPosts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      author: data.author,
      coverImage: data.coverImage,
      excerpt: data.excerpt,
      tags: data.tags || [],
      content,
      readingTime: estimateReadingTime(content),
    };
  } catch {
    return null;
  }
}
