// @page /feed
// Social media feed with complex loops and conditional rendering

import { ref, computed, type Ref } from 'auwla'

const posts = ref([
  {
    id: 1,
    author: { name: 'Alice Johnson', avatar: '/avatars/alice.jpg', verified: true },
    content: 'Just launched my new project! 🚀',
    timestamp: '2 hours ago',
    likes: 42,
    comments: 8,
    shares: 3,
    isLiked: false,
    isBookmarked: true,
    type: 'text',
    visibility: 'public'
  },
  {
    id: 2,
    author: { name: 'Bob Smith', avatar: '/avatars/bob.jpg', verified: false },
    content: 'Beautiful sunset today',
    timestamp: '4 hours ago',
    likes: 128,
    comments: 15,
    shares: 7,
    isLiked: true,
    isBookmarked: false,
    type: 'image',
    image: '/images/sunset.jpg',
    visibility: 'public'
  },
  {
    id: 3,
    author: { name: 'Carol Davis', avatar: '/avatars/carol.jpg', verified: true },
    content: 'Excited to announce our Series A funding! 💰',
    timestamp: '1 day ago',
    likes: 256,
    comments: 42,
    shares: 18,
    isLiked: false,
    isBookmarked: false,
    type: 'announcement',
    visibility: 'public',
    isPinned: true
  },
  {
    id: 4,
    author: { name: 'David Wilson', avatar: '/avatars/david.jpg', verified: false },
    content: 'This is a private post for close friends only',
    timestamp: '3 hours ago',
    likes: 5,
    comments: 2,
    shares: 0,
    isLiked: true,
    isBookmarked: false,
    type: 'text',
    visibility: 'friends'
  }
])

const currentUser = ref({
  id: 1,
  name: 'Current User',
  following: [1, 2, 3], // Following Alice, Bob, Carol
  blockedUsers: [],
  preferences: {
    showVerifiedOnly: false,
    hideAds: true,
    autoplayVideos: false
  }
})

const filter = ref('all') // 'all', 'following', 'verified'
const isLoading = ref(false)
const showCreatePost = ref(false)
const newPostContent = ref('')

const filteredPosts = computed(() => {
  let filtered = posts.value

  // Filter by visibility (only show public posts or posts from friends)
  filtered = filtered.filter(post => 
    post.visibility === 'public' || 
    (post.visibility === 'friends' && currentUser.value.following.includes(post.author.id))
  )

  // Apply user filters
  if (filter.value === 'following') {
    filtered = filtered.filter(post => currentUser.value.following.includes(post.author.id))
  } else if (filter.value === 'verified') {
    filtered = filtered.filter(post => post.author.verified)
  }

  // Filter out blocked users
  filtered = filtered.filter(post => !currentUser.value.blockedUsers.includes(post.author.id))

  return filtered
})

export default function SocialFeedPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header with filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Feed</h1>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => showCreatePost.value = !showCreatePost.value}
          >
            {showCreatePost.value ? 'Cancel' : 'Create Post'}
          </button>
        </div>
        
        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button 
            className={`flex-1 py-2 px-4 rounded ${filter.value === 'all' ? 'bg-white shadow' : ''}`}
            onClick={() => filter.value = 'all'}
          >
            All Posts
          </button>
          <button 
            className={`flex-1 py-2 px-4 rounded ${filter.value === 'following' ? 'bg-white shadow' : ''}`}
            onClick={() => filter.value = 'following'}
          >
            Following
          </button>
          <button 
            className={`flex-1 py-2 px-4 rounded ${filter.value === 'verified' ? 'bg-white shadow' : ''}`}
            onClick={() => filter.value = 'verified'}
          >
            Verified Only
          </button>
        </div>
      </div>

      {/* Create post form */}
      {showCreatePost.value && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <textarea 
            placeholder="What's on your mind?"
            value={newPostContent.value}
            onChange={(e) => newPostContent.value = e.target.value}
            className="w-full border rounded p-3 mb-3 resize-none"
            rows={3}
          />
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button className="text-blue-500">📷 Photo</button>
              <button className="text-blue-500">🎥 Video</button>
              <button className="text-blue-500">📍 Location</button>
            </div>
            <button 
              className={`px-6 py-2 rounded ${
                newPostContent.value.trim() 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!newPostContent.value.trim()}
            >
              Post
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading.value && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading posts...</p>
        </div>
      )}

      {/* Posts feed */}
      {!isLoading.value && (
        <div className="space-y-6">
          {/* Empty state */}
          {filteredPosts.value.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg text-gray-600 mb-2">No posts to show</h3>
              {filter.value === 'following' ? (
                <p className="text-gray-500">Follow some users to see their posts here</p>
              ) : filter.value === 'verified' ? (
                <p className="text-gray-500">No verified users have posted recently</p>
              ) : (
                <p className="text-gray-500">Be the first to create a post!</p>
              )}
            </div>
          ) : (
            filteredPosts.value.map(post => (
              <article key={post.id} className="bg-white rounded-lg shadow">
                {/* Pinned indicator */}
                {post.isPinned && (
                  <div className="bg-blue-50 px-4 py-2 border-b">
                    <span className="text-sm text-blue-600">📌 Pinned Post</span>
                  </div>
                )}
                
                <div className="p-4">
                  {/* Post header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={post.author.avatar} 
                        alt={post.author.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{post.author.name}</span>
                          {post.author.verified && (
                            <span className="text-blue-500">✓</span>
                          )}
                          {post.visibility === 'friends' && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Friends Only</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{post.timestamp}</span>
                      </div>
                    </div>
                    
                    {/* Post menu */}
                    <button className="text-gray-400 hover:text-gray-600">⋯</button>
                  </div>

                  {/* Post content */}
                  <div className="mb-4">
                    {/* Announcement styling */}
                    {post.type === 'announcement' && (
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg mb-3">
                        <span className="text-sm font-medium text-purple-800">📢 Announcement</span>
                      </div>
                    )}
                    
                    <p className="text-gray-800">{post.content}</p>
                    
                    {/* Image content */}
                    {post.type === 'image' && post.image && (
                      <img 
                        src={post.image} 
                        alt="Post content"
                        className="mt-3 rounded-lg w-full"
                      />
                    )}
                  </div>

                  {/* Engagement stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div className="flex space-x-4">
                      {post.likes > 0 && <span>{post.likes} likes</span>}
                      {post.comments > 0 && <span>{post.comments} comments</span>}
                      {post.shares > 0 && <span>{post.shares} shares</span>}
                    </div>
                    
                    {/* Following indicator */}
                    {currentUser.value.following.includes(post.author.id) && (
                      <span className="text-blue-500 text-xs">Following</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex space-x-6">
                      <button 
                        className={`flex items-center space-x-1 ${
                          post.isLiked ? 'text-red-500' : 'text-gray-500'
                        }`}
                      >
                        <span>{post.isLiked ? '❤️' : '🤍'}</span>
                        <span>Like</span>
                      </button>
                      
                      <button className="flex items-center space-x-1 text-gray-500">
                        <span>💬</span>
                        <span>Comment</span>
                      </button>
                      
                      <button className="flex items-center space-x-1 text-gray-500">
                        <span>🔄</span>
                        <span>Share</span>
                      </button>
                    </div>
                    
                    <button 
                      className={`${
                        post.isBookmarked ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    >
                      {post.isBookmarked ? '🔖' : '📑'}
                    </button>
                  </div>
                </div>

                {/* Comments preview */}
                {post.comments > 0 && (
                  <div className="px-4 pb-4">
                    <button className="text-sm text-gray-500">
                      View all {post.comments} comments
                    </button>
                    
                    {/* Show first comment if exists */}
                    {post.comments > 0 && (
                      <div className="mt-2 flex space-x-2">
                        <img 
                          src="/avatars/commenter.jpg" 
                          alt="Commenter"
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">John Doe</span>
                          <span className="text-sm text-gray-600 ml-2">Great post! 👍</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {/* Load more button */}
      {!isLoading.value && filteredPosts.value.length > 0 && (
        <div className="text-center mt-8">
          <button 
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200"
            onClick={() => isLoading.value = true}
          >
            Load More Posts
          </button>
        </div>
      )}
    </div>
  )
}