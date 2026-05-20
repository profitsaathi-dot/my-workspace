"use client";

import { useEffect, useState } from "react";
import { Star, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  toast,
} from "@workspace/ui";

interface Review {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  verified: boolean;
  approved: boolean;
  productId: number;
  productName: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews/seller?page=${page}&size=10`);
      const data = await response.json();

      setReviews(data.reviews || []);
      setTotalPages(data.totalPages || 0);
      setTotalItems(data.totalItems || 0);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (reviewId: number, approved: boolean) => {
    setModerating(reviewId);
    try {
      const response = await fetch(
        `/api/reviews/${reviewId}/moderate?approved=${approved}`,
        { method: "PATCH" }
      );

      if (!response.ok) {
        throw new Error("Failed to moderate review");
      }

      toast.success(approved ? "Review approved" : "Review hidden");
      
      // Update local state
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, approved } : r))
      );
    } catch (error) {
      toast.error("Failed to moderate review");
    } finally {
      setModerating(null);
    }
  };

  if (loading && page === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading reviews...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Product Reviews</h1>
        <p className="text-muted-foreground">
          Manage reviews for your products ({totalItems} total)
        </p>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No reviews yet. Reviews will appear here once customers rate your products.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{review.productName}</CardTitle>
                    <CardDescription>
                      Reviewed by {review.customerName} on{" "}
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.verified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Verified Purchase
                      </Badge>
                    )}
                    {review.approved ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Hidden
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rating */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-5 ${
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-gray-700">{review.comment}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {review.approved ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleModerate(review.id, false)}
                      disabled={moderating === review.id}
                    >
                      <EyeOff className="size-4 mr-2" />
                      {moderating === review.id ? "Hiding..." : "Hide Review"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleModerate(review.id, true)}
                      disabled={moderating === review.id}
                    >
                      <Eye className="size-4 mr-2" />
                      {moderating === review.id ? "Approving..." : "Show Review"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
