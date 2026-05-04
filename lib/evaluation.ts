export type EvaluationEvent = {
  id: string
  name: string
  status?: string
  evaluation_open?: boolean
}

export type EvaluationCriteria = {
  id: string
  criteria_description: string
  criteria_type: string
}

export type EvaluationAnswer = {
  id?: string
  criteria_id: string
  rating_value: number | null
  answer_text: string | null
}

export type EvaluationResponse = {
  id: string
  user_id: string
  event_id: string
  status: string | null
  created_at: string
}

export function groupCriteriaByType(criteria: EvaluationCriteria[]) {
  return criteria.reduce<Record<string, EvaluationCriteria[]>>((groups, item) => {
    const key = item.criteria_type || "Other"

    if (!groups[key]) {
      groups[key] = []
    }

    groups[key].push(item)
    return groups
  }, {})
}

export function formatCriteriaType(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
