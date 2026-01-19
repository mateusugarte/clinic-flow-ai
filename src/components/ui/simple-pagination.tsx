import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function SimplePagination({ 
  currentPage, 
  totalPages,
  onPageChange 
}: PaginationProps) {
  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2" role="navigation" aria-label="Paginação">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevClick}
        disabled={currentPage === 1}
        aria-label="Página anterior"
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm text-muted-foreground px-3">
        Página <span className="font-medium text-foreground">{currentPage}</span> de{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </span>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextClick}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

export { SimplePagination };
