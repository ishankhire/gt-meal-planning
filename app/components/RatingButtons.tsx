interface RatingButtonsProps {
  foodName: string;
  rating: 'like' | 'dislike' | null;
  onToggle: (foodName: string, rating: 'like' | 'dislike') => void;
  stopPropagation?: boolean;
}

export function RatingButtons({ foodName, rating, onToggle, stopPropagation }: RatingButtonsProps) {
  const handleClick = (e: React.MouseEvent, ratingType: 'like' | 'dislike') => {
    if (stopPropagation) e.stopPropagation();
    onToggle(foodName, ratingType);
  };

  return (
    <>
      <button
        onClick={(e) => handleClick(e, 'like')}
        className={`p-1 rounded transition-colors shrink-0 ${
          rating === 'like' ? 'text-blue-500' : 'text-zinc-300 hover:text-blue-400'
        }`}
        title="Like"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" />
        </svg>
      </button>
      <button
        onClick={(e) => handleClick(e, 'dislike')}
        className={`p-1 rounded transition-colors shrink-0 ${
          rating === 'dislike' ? 'text-red-500' : 'text-zinc-300 hover:text-red-400'
        }`}
        title="Dislike"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" />
        </svg>
      </button>
    </>
  );
}
