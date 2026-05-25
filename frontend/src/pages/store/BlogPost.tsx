import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEOHead from '../../components/SEO/SEOHead';
import { truncateText, generateCanonicalUrl } from '../../utils/seo';
import api from '../../services/api';
import type { Post } from '../../types';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (postSlug: string) => {
    try {
      const response = await api.get(`/blog/slug/${postSlug}`);
      setPost(response.data.data);
    } catch (error) {
      console.error('Failed to fetch post:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="aspect-video bg-gray-200 rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Yazı Bulunamadı</h2>
          <Link to="/blog" className="text-blue-600 hover:underline">
            Blog'a Dön
          </Link>
        </div>
      </div>
    );
  }

  const description = post.excerpt || truncateText(post.content, 160);
  const canonicalUrl = generateCanonicalUrl(`/blog/${post.slug}`);

  return (
    <>
      <SEOHead
        title={`${post.title} | Blog`}
        description={description}
        image={post.coverImage}
        url={canonicalUrl}
        type="article"
        keywords={`blog, ${post.title}`}
      />

      <article className="min-h-screen bg-gray-50 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <Link to="/" className="text-blue-600 hover:underline">Ana Sayfa</Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link to="/blog" className="text-blue-600 hover:underline">Blog</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600">{post.title}</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {post.author.firstName[0]}{post.author.lastName[0]}
                </div>
                <span className="font-medium">
                  {post.author.firstName} {post.author.lastName}
                </span>
              </div>
              <span>•</span>
              <time dateTime={post.publishedAt || post.createdAt}>
                {formatDate(post.publishedAt || post.createdAt)}
              </time>
            </div>
          </header>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="aspect-video bg-gray-200 rounded-2xl overflow-hidden mb-8">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 lg:p-12">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          {/* Back to Blog */}
          <div className="mt-12 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tüm Yazılara Dön
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
