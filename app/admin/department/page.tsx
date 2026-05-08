'use client'
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useProfiles } from "./realtime-fetch"
import DepartmentDrawer from "./department-drawer"

const Department = () => {
  const { profiles } = useProfiles()
  const [fnd, setFnd] = useState(0)
  const [pr, setPr] = useState(0)
  const [mcd, setMcd] = useState(0)
  const [sod, setSod] = useState(0)

  const countFnd = profiles.filter((p: any) => p.department === 'finance and administration').length
  const countPr = profiles.filter((p: any) => p.department === 'public relations').length
  const countMcd = profiles.filter((p: any) => p.department === 'media and creatives').length
  const countSod = profiles.filter((p: any) => p.department === 'strategic operations').length

  const profilesFnd = profiles.filter((p: any) => p.department === 'finance and administration')
  console.log("Profles in FND", profilesFnd)



  useEffect(() => {
    setFnd(70)
    setMcd(50)
    setPr(30)
    setSod(90)
    // const timer = setTimeout(() => setFnd(10), 500)
    // return () => clearTimeout(timer)
  }, [])

  return (
    <div className='flex flex-col gap-10'>
      <div>
        <h1 className="font-bold text-xl ">Departments</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Card className='w-full max-w-sm'>
          <CardHeader className="flex flex-row justify-between">
            <div className="w-2/3">
              <CardTitle className="font-bold">Finance and Administration Department</CardTitle>
              <CardDescription>
                <h3>Head: { }</h3>
                <h3>{countFnd} Members</h3>
              </CardDescription>
            </div>
            <div>
              <h1 className="flex text-4xl">{fnd}%</h1>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={fnd} className="w-[100%]" />
          </CardContent>
          <CardFooter className="gap-5">
            <DepartmentDrawer department="finance and administration">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>
            <Button variant="outline">Analytics</Button>
          </CardFooter>
        </Card>

        <Card className='w-full max-w-sm'>
          <CardHeader className="flex flex-row justify-between">
            <div className="w-2/3">
              <CardTitle className="font-bold">Public Relations Department</CardTitle>
              <CardDescription>
                <h3>Head: { }</h3>
                <h3>{countPr} Members</h3>
              </CardDescription>
            </div>
            <div>
              <h1 className="flex text-4xl">{pr}%</h1>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={pr} className="w-[100%]" />
          </CardContent>
          <CardFooter className="gap-5">
            <DepartmentDrawer department="public relations">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>

            <Button variant="outline">Analytics</Button>
          </CardFooter>
        </Card>

        <Card className='w-full max-w-sm'>
          <CardHeader className="flex flex-row justify-between">
            <div className="w-2/3">
              <CardTitle className="font-bold">Media and Creatives Department </CardTitle>
              <CardDescription>
                <h3>Head: { }</h3>
                <h3>{countMcd} Members</h3>
              </CardDescription>
            </div>
            <div>
              <h1 className="flex text-4xl">{mcd}%</h1>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={mcd} className="w-[100%]" />
          </CardContent>
          <CardFooter className="gap-5">
            <DepartmentDrawer department="media and creatives">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>

            <Button variant="outline">Analytics</Button>
          </CardFooter>
        </Card>

        <Card className='w-full max-w-sm'>
          <CardHeader className="flex flex-row justify-between">
            <div className="w-2/3">
              <CardTitle className="font-bold">Strategic Operations Department</CardTitle>
              <CardDescription>
                <h3>Head: { }</h3>
                <h3>{countSod} Members</h3>
              </CardDescription>
            </div>
            <div>
              <h1 className="flex text-4xl">{sod}%</h1>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={sod} className="w-[100%]" />
          </CardContent>
          <CardFooter className="gap-5">
            <DepartmentDrawer department="strategic operations">
              <Button variant="default">View Members</Button>
            </DepartmentDrawer>

            <Button variant="outline">Analytics</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default Department