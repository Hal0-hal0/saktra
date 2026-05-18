'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useProfiles } from "./realtime-fetch"
import DepartmentDrawer from "./department-drawer"
import { DepartmentAnalyticsModal } from "@/components/admin/department-analytics-modal"
import { BarChart3 } from "lucide-react"

type Profile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  status: string | null
  department: string | null
  position: string | null
  user_scores?: { average_score: number | null }[]
}

const Department = () => {
  const { profiles } = useProfiles() as { profiles: Profile[] }

  const getDepartmentStats = (deptName: string) => {
    const deptProfiles = profiles.filter((p) => p.department === deptName)
    const executives = deptProfiles
      .filter((p) => p.role === 'executive' || p.role === 'bod')
      .map((p) => p.user_name || p.email)

    const scores = deptProfiles
      .map((p) => p.user_scores?.[0]?.average_score)
      .filter((score: number | null | undefined): score is number => typeof score === 'number')

    const avgScore = scores.length
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10)
      : 0

    return {
      count: deptProfiles.length,
      executives: executives.length > 0 ? executives.join(", ") : "No Executive assigned",
      score: avgScore
    }
  }

  const fndStats = getDepartmentStats('finance and administration')
  const prStats = getDepartmentStats('public relations')
  const mcdStats = getDepartmentStats('media and creatives')
  const sodStats = getDepartmentStats('strategic operations')

  return (
    <div className='flex flex-col gap-10'>
      <div>
        <h1 className="font-bold text-xl ">Departments</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-2">
        {/* Finance and Administration */}
        <Card className='w-full'>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-2">
              <CardTitle className="font-bold text-xl">Finance and Administration</CardTitle>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Executive: <span className="text-muted-foreground font-normal">{fndStats.executives}</span></p>
                <p className="text-sm font-medium">{fndStats.count} Members</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold tracking-tight">{fndStats.score}%</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Score</p>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={fndStats.score} className="h-2" />
          </CardContent>
          <CardFooter className="gap-3">
            <DepartmentDrawer department="finance and administration">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>
            <DepartmentAnalyticsModal
              department="finance and administration"
              departmentLabel="Finance and Administration"
              profiles={profiles}
            >
              <Button variant="outline"><BarChart3 className="size-4" />Analytics</Button>
            </DepartmentAnalyticsModal>
          </CardFooter>
        </Card>

        {/* Public Relations */}
        <Card className='w-full'>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-2">
              <CardTitle className="font-bold text-xl">Public Relations</CardTitle>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Executive: <span className="text-muted-foreground font-normal">{prStats.executives}</span></p>
                <p className="text-sm font-medium">{prStats.count} Members</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold tracking-tight">{prStats.score}%</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Score</p>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={prStats.score} className="h-2" />
          </CardContent>
          <CardFooter className="gap-3">
            <DepartmentDrawer department="public relations">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>
            <DepartmentAnalyticsModal
              department="public relations"
              departmentLabel="Public Relations"
              profiles={profiles}
            >
              <Button variant="outline"><BarChart3 className="size-4" />Analytics</Button>
            </DepartmentAnalyticsModal>
          </CardFooter>
        </Card>

        {/* Media and Creatives */}
        <Card className='w-full'>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-2">
              <CardTitle className="font-bold text-xl">Media and Creatives</CardTitle>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Executive: <span className="text-muted-foreground font-normal">{mcdStats.executives}</span></p>
                <p className="text-sm font-medium">{mcdStats.count} Members</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold tracking-tight">{mcdStats.score}%</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Score</p>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={mcdStats.score} className="h-2" />
          </CardContent>
          <CardFooter className="gap-3">
            <DepartmentDrawer department="media and creatives">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>
            <DepartmentAnalyticsModal
              department="media and creatives"
              departmentLabel="Media and Creatives"
              profiles={profiles}
            >
              <Button variant="outline"><BarChart3 className="size-4" />Analytics</Button>
            </DepartmentAnalyticsModal>
          </CardFooter>
        </Card>

        {/* Strategic Operations */}
        <Card className='w-full'>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-2">
              <CardTitle className="font-bold text-xl">Strategic Operations</CardTitle>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Executive: <span className="text-muted-foreground font-normal">{sodStats.executives}</span></p>
                <p className="text-sm font-medium">{sodStats.count} Members</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold tracking-tight">{sodStats.score}%</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Score</p>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={sodStats.score} className="h-2" />
          </CardContent>
          <CardFooter className="gap-3">
            <DepartmentDrawer department="strategic operations">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>
            <DepartmentAnalyticsModal
              department="strategic operations"
              departmentLabel="Strategic Operations"
              profiles={profiles}
            >
              <Button variant="outline"><BarChart3 className="size-4" />Analytics</Button>
            </DepartmentAnalyticsModal>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default Department