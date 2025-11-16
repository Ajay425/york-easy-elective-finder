import { Button } from "@/components/ui/button";

export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-3 mb-10">
      <Button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
      >
        Prev
      </Button>
      <span className="text-sm text-yellow-100">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
      >
        Next
      </Button>
    </div>
  );
}