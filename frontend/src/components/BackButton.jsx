import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

// Reusable "Retour" button used on routed feature pages.
const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-2 mb-4 ${className}`}
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4" /> Retour
    </Button>
  );
};

export default BackButton;
