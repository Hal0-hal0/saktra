'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/supabase-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type Props = {
    children: React.ReactNode
    eventId: string
    eventName: string
    userId: string
}

export function EvaluateModal({ children, eventId, eventName, userId }: Props) {
    const [open, setOpen] = useState(false)
    const [rating, setRating] = useState(0)
    const [hovered, setHovered] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const reset = () => {
        setRating(0)
        setHovered(0)
        setComment('')
        setSubmitting(false)
    }

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please select a rating before submitting.', { position: 'top-center' })
            return
        }

        setSubmitting(true)

        const { error } = await supabase.from('event_evaluations').insert({
            user_id: userId,
            event_id: eventId,
            rating,
            comment: comment.trim() || null,
        })

        if (error) {
            toast.error('Failed to submit evaluation. Please try again.', { position: 'top-center' })
            setSubmitting(false)
            return
        }

        toast.success('Thank you for your feedback!', { position: 'top-center' })
        reset()
        setOpen(false)
    }

    const ratingLabels: Record<number, string> = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent',
    }

    return (
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Evaluate Event</DialogTitle>
                    <DialogDescription className="capitalize">
                        Share your experience for <span className="font-medium text-foreground">{eventName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Rating</p>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onMouseEnter={() => setHovered(star)}
                                    onMouseLeave={() => setHovered(0)}
                                    onClick={() => setRating(star)}
                                    className="rounded transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        className={cn(
                                            'size-8 transition-colors',
                                            (hovered || rating) >= star
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'fill-muted text-muted-foreground/30'
                                        )}
                                    />
                                </button>
                            ))}
                            {(hovered || rating) > 0 && (
                                <span className="ml-2 text-sm font-medium text-muted-foreground">
                                    {ratingLabels[hovered || rating]}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            Comment <span className="text-muted-foreground font-normal">(Optional)</span>
                        </p>
                        <Textarea
                            placeholder="What did you think about the event?"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => { reset(); setOpen(false) }}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={submitting || rating === 0}>
                        {submitting && <Spinner data-icon="inline-start" />}
                        Submit Evaluation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}