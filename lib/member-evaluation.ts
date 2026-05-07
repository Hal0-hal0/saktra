export const UNAUTHORIZED_EVALUATION_MESSAGE = "You are not authorized to evaluate this record."

export type EvaluationRole = "admin" | "bod" | "executive" | "user" | "unknown"

export type EvaluationProfile = {
  user_id?: string | null
  role?: string | null
  department?: string | null
  position?: string | null
}

export type EvaluationAuthInput = {
  evaluatorId?: string | null
  evaluatorRole?: string | null
  evaluatorDepartment?: string | null
  evaluatorPosition?: string | null
  targetId?: string | null
  targetRole?: string | null
  targetDepartment?: string | null
  targetPosition?: string | null
}

export const departmentOptions = [
  {
    value: "public relations",
    label: "Public Relations Department",
    positions: [
      "Marketing Officer",
      "Partnership and Sponsorship Officer",
      "Caption Writing Officer",
    ],
  },
  {
    value: "finance and administration",
    label: "Finance and Administration Department",
    positions: [
      "Secretariat Officer",
      "Human Resource Officer",
      "Finance Officer",
    ],
  },
  {
    value: "strategic operations",
    label: "Strategic Operations Department",
    positions: [
      "Project and Program",
      "Research and Development",
      "Logistics",
    ],
  },
  {
    value: "media and creatives",
    label: "Media and Creatives Department",
    positions: [
      "Productions Officer",
      "Creatives Officer",
      "Technicals Officer",
    ],
  },
] as const

export const bodPositions = [
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Auditor",
  "Public Information Officer",
] as const

export function normalizeEvaluationRole(role?: string | null): EvaluationRole {
  const normalized = role?.trim().toLowerCase()

  if (!normalized) return "unknown"
  if (["board of directors", "board", "bod"].includes(normalized)) return "bod"
  if (["executive member", "executive", "exec"].includes(normalized)) return "executive"
  if (["member", "user"].includes(normalized)) return "user"
  if (normalized === "admin") return "admin"

  return "unknown"
}

export function formatEvaluationRole(role?: string | null) {
  const normalized = normalizeEvaluationRole(role)

  if (normalized === "bod") return "Board of Directors"
  if (normalized === "executive") return "Executive Member"
  if (normalized === "user") return "Member"
  if (normalized === "admin") return "Admin"
  return "Unknown"
}

export function normalizeDepartment(department?: string | null) {
  return department?.trim().toLowerCase() ?? ""
}

export function normalizePosition(position?: string | null) {
  return position?.trim() ?? ""
}

export function isValidDepartmentPosition(position?: string | null, department?: string | null) {
  if (!position || !department) return false
  const normalizedDept = normalizeDepartment(department)
  const deptConfig = departmentOptions.find((dept) => dept.value === normalizedDept)
  if (!deptConfig) return false
  return deptConfig.positions.some((pos) => pos.toLowerCase() === position.toLowerCase())
}

export function isValidBodPosition(position?: string | null) {
  if (!position) return false
  return bodPositions.some((pos) => pos.toLowerCase() === position.toLowerCase())
}

export function canEvaluate({
  evaluatorId,
  evaluatorRole,
  evaluatorDepartment,
  evaluatorPosition,
  targetId,
  targetRole,
  targetDepartment,
  targetPosition,
}: EvaluationAuthInput) {
  const normalizedEvaluatorRole = normalizeEvaluationRole(evaluatorRole)
  const normalizedTargetRole = normalizeEvaluationRole(targetRole)
  const normalizedEvaluatorDepartment = normalizeDepartment(evaluatorDepartment)
  const normalizedTargetDepartment = normalizeDepartment(targetDepartment)

  if (!evaluatorId || !targetId) return false
  if (evaluatorId === targetId) return false

  // BOD evaluates executives
  if (normalizedEvaluatorRole === "bod") {
    return normalizedTargetRole === "executive"
  }

  // Executives evaluate members in the same department
  if (normalizedEvaluatorRole === "executive") {
    return (
      normalizedTargetRole === "user" &&
      Boolean(normalizedEvaluatorDepartment) &&
      normalizedEvaluatorDepartment === normalizedTargetDepartment
    )
  }

  return false
}

export function filterEvaluationTargets(
  evaluator: EvaluationProfile,
  targets: EvaluationProfile[]
) {
  return targets.filter((target) =>
    canEvaluate({
      evaluatorId: evaluator.user_id,
      evaluatorRole: evaluator.role,
      evaluatorDepartment: evaluator.department,
      evaluatorPosition: evaluator.position,
      targetId: target.user_id,
      targetRole: target.role,
      targetDepartment: target.department,
      targetPosition: target.position,
    })
  )
}
