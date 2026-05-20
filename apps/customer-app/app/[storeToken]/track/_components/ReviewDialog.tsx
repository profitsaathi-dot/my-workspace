"use client";

import { useState } from "react";
import { Star, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  toast,
} from "@workspace/ui";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNo: string;
  productName: string;
}

// Suggestion templates based on rating
const SUGGESTIONS = {
  5: [
    "Excellent quality! Highly recommend.",
    "Amazing product, exceeded my expectations!",
    "Perfect! Exactly what I was looking for.",
    "Outstanding quality and fast delivery.",
    "Love it! Will definitely order again.",
  ],
  4: [
    "Very good product, happy with my purchase.",
    "Good quality, worth the price.",
    "Nice product, met my expectations.",
    "Satisfied with the quality and service.",
    "Good value for money.",
  ],
  3: [
    "Decent product, does the job.",
    "Average quality, as expected.",
    "It's okay, nothing special.",
    "Fair product for the price.",
    "Acceptable quality.",
  ],
  2: [
    "Not as expected, could be better.",
    "Below average quality.",
    "Disappointed with the product.",
    "Not worth the price.",
    "Expected better quality.",
  ],
  1: [
    "Very poor quality, not satisfied.",
    "Extremely disappointed.",
    "Not as described, very unhappy.",
    "Would not recommend.",
    "Poor quality, waste of money.",
  ],
};

export function ReviewDialog({ open, onOpenChange, orderNo, productName }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const suggestions = rating > 0 ? SUGGESTIONS[rating as keyof typeof SUGGESTIONS] : [];

  const handleSuggestionClick = (suggestion: string) => {
    if (comment.trim()) {
      // If there's already text, append with a space
      setComment(comment.trim() + " " + suggestion);
    } else {
      // If empty, just set the suggestion
      setComment(suggestion);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      console.log("[Review] Submitting review:", { orderNo, rating, comment: comment.trim() });
      
      const response = await fetch(`/user/api/reviews/order/${orderNo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rating, 
          comment: comment.trim() || "" // Send empty string instead of undefined
        }),
      });

      console.log("[Review] Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Review] Error response:", errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Failed to submit review (${response.status})`);
        }
        
        throw new Error(errorData.message || "Failed to submit review");
      }

      const data = await response.json();
      console.log("[Review] Success:", data);

      toast.success("Review submitted successfully!");
      setRating(0);
      setComment("");
      onOpenChange(false);
    } catch (error) {
      console.error("[Review] Exception:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setRating(0);
      setComment("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with <strong>{productName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label>Your Rating</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] rounded"
                >
                  <Star
                    className={`size-10 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-center font-medium text-[color:var(--accent)]">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Quick Suggestions */}
          {rating > 0 && suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick suggestions (tap to add)</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)] text-foreground hover:bg-[color:var(--accent)]/20 transition-colors"
                  >
                    <Plus className="size-3" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={rating > 0 ? "Tap a suggestion above or write your own..." : "Select a rating first to see suggestions..."}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || rating === 0} 
              className="flex-1"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
