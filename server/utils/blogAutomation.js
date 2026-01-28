const BlogPost = require('../models/BlogPost');

/**
 * Sync posts from the configured WordPress API
 */
const syncWordPressPosts = async () => {
    const wpUrl = process.env.WORDPRESS_API_URL;
    if (!wpUrl) {
        console.log('⚠️ WordPress API URL not configured, adding mock data.');
        await addMockPosts();
        return;
    }

    try {
        console.log(`🔄 Syncing posts from ${wpUrl}...`);
        const response = await fetch(`${wpUrl}?per_page=10&_embed`);
        // ... (existing code)
    } catch (error) {
        console.error('❌ Error syncing WordPress posts, adding mock data fallback.');
        await addMockPosts();
    }
};

const addMockPosts = async () => {
    try {
        const existingCount = await BlogPost.countDocuments();
        if (existingCount > 0) return;

        const mockPosts = [
            {
                title: "Just For Today: Acceptance",
                slug: "jft-acceptance",
                excerpt: "Today I will accept life on its own terms. I will not try to force outcomes...",
                content: "Acceptance is not agreement. It is simply acknowledging what is. By accepting my current situation, I find the peace necessary to make healthy changes...",
                author: "Recovery Guide",
                category: "Just For Today",
                featuredImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "5 Tips for Staying Sober During Holidays",
                slug: "sober-holidays",
                excerpt: "The holidays can be a trigger-rich environment. Here is how to navigate them with serenity...",
                content: "1. Have an exit strategy. 2. Keep your sponsor on speed dial. 3. Remember why you started...",
                author: "Community Member",
                category: "General",
                featuredImage: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80"
            }
        ];

        for (const post of mockPosts) {
            await new BlogPost(post).save();
        }
        console.log('✅ Mock blog posts added.');
    } catch (e) {
        console.error('Error adding mock posts:', e);
    }
};

module.exports = {
    syncWordPressPosts
};
