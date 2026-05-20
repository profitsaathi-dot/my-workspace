"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, ChevronDown, ChevronUp, Filter, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@workspace/ui";

interface Review {
  id: number;
  rating: number;
  comment?: string;
  customerName?: string;
  createdAt: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
}

interface ProductReviewsProps {
  productId: number;
}

type SortOption = "latest" | "highest" | "lowest";
type FilterRating = "all" | 1 | 2 | 3 | 4 | 5;

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [filterRating, setFilterRating] = useState<FilterRating>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        
        console.log("[ProductReviews] Fetching reviews for product:", productId);
        
        // Single API call - backend returns both reviews and stats
        const response = await fetch(`/user/api/reviews/product/${productId}?page=0&size=50`);

        console.log("[ProductReviews] Response status:", response.status);

        if (!response.ok) {
          console.error("[ProductReviews] Fetch failed:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("[ProductReviews] Error details:", errorText);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log("[ProductReviews] Response data:", data);
        
        // Backend returns { reviews: [...], stats: {...}, currentPage, totalItems, totalPages }
        const reviewsList = data.reviews || [];
        const statsData = data.stats || null;
        
        console.log("[ProductReviews] Reviews count:", reviewsList.length);
        console.log("[ProductReviews] Stats:", statsData);
        
        setReviews(reviewsList);
        setFilteredReviews(reviewsList);
        
        if (statsData) {
          // Ensure ratingDistribution exists
          if (!statsData.ratingDistribution && statsData.distribution) {
            statsData.ratingDistribution = statsData.distribution;
          }
          setStats(statsData);
        }
      } catch (error) {
        console.error("[ProductReviews] Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...reviews];

    // Filter by rating
    if (filterRating !== "all") {
      result = result.filter((review) => review.rating === filterRating);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    setFilteredReviews(result);
  }, [reviews, sortBy, filterRating]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <Card className="p-4 text-center">
        <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No reviews yet</p>
        <p className="text-xs text-muted-foreground mt-1">Be the first to review!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Rating Summary Card - Clickable */}
      <Card 
        className="p-4 bg-[color:var(--accent-soft)] cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-[color:var(--accent)]">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-3 ${
                    star <= Math.round(stats.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution?.[rating] || 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-3">{rating}</span>
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--accent)] transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronUp className="size-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-5 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            {expanded ? "Tap to hide reviews" : "Tap to see reviews"}
          </p>
        </div>
      </Card>

      {/* Filters - Show when expanded */}
      {expanded && reviews.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          {/* Filter Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFilters(!showFilters);
            }}
            className="flex items-center gap-2 text-sm font-medium text-[color:var(--accent)] px-1"
          >
            <Filter className="size-4" />
            <span>Filters & Sort</span>
            {showFilters ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {/* Filter Options */}
          {showFilters && (
            <Card className="p-3 space-y-3">
              {/* Sort Options */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Sort By</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSortBy("latest")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sortBy === "latest"
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Clock className="size-3" />
                    Latest
                  </button>
                  <button
                    onClick={() => setSortBy("highest")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sortBy === "highest"
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <TrendingUp className="size-3" />
                    Highest
                  </button>
                  <button
                    onClick={() => setSortBy("lowest")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sortBy === "lowest"
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <TrendingDown className="size-3" />
                    Lowest
                  </button>
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Filter by Rating</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterRating("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterRating === "all"
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    All
                  </button>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilterRating(rating as FilterRating)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filterRating === rating
                          ? "bg-[color:var(--accent)] text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Star className="size-3 fill-current" />
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results count */}
              <p className="text-xs text-muted-foreground text-center pt-1">
                Showing {filteredReviews.length} of {reviews.length} reviews
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Reviews List - Expandable */}
      {expanded && filteredReviews.length > 0 && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-medium px-1">
            <MessageSquare className="size-4 text-[color:var(--accent)]" />
            <span>Customer Reviews ({filteredReviews.length})</span>
          </div>

          {filteredReviews.map((review) => {
            console.log("[ProductReviews] Rendering review:", review);
            console.log("[ProductReviews] Comment value:", review.comment);
            console.log("[ProductReviews] Comment type:", typeof review.comment);
            
            return (
              <Card key={review.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 size-8 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center text-xs font-semibold text-[color:var(--accent)]">
                    {review.customerName?.[0]?.toUpperCase() || "?"}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {review.customerName || "Anonymous"}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`size-3 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Always show comment section for debugging */}
                    <div className="mb-2">
                      {review.comment ? (
                        <p className="text-sm text-foreground/85 leading-relaxed">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No comment provided
                        </p>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* No reviews after filtering */}
      {expanded && reviews.length > 0 && filteredReviews.length === 0 && (
        <Card className="p-4 text-center">
          <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No reviews match your filters</p>
          <button
            onClick={() => {
              setFilterRating("all");
              setSortBy("latest");
            }}
            className="text-xs text-[color:var(--accent)] mt-2 underline"
          >
            Clear filters
          </button>
        </Card>
      )}

      {/* No comments message when expanded but no reviews */}
      {expanded && reviews.length === 0 && (
        <Card className="p-4 text-center">
          <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No detailed reviews yet</p>
        </Card>
      )}
    </div>
  );
}
