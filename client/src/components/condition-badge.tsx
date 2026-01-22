import { Badge } from "@/components/ui/badge";
import { CONDITION_LABELS } from "@/lib/constants";

interface ConditionBadgeProps {
  score: number;
  showLabel?: boolean;
}

export function ConditionBadge({ score, showLabel = true }: ConditionBadgeProps) {
  const condition = CONDITION_LABELS[score] || CONDITION_LABELS[3];

  return (
    <Badge
      variant="secondary"
      className={`${condition.color} text-white border-0`}
      data-testid={`badge-condition-${score}`}
    >
      {score}/5 {showLabel && `• ${condition.label}`}
    </Badge>
  );
}
