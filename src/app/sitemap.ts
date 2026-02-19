import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ubunifutech.com';
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/build`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
