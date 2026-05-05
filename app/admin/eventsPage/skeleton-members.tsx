import { SkeletonTable } from "@/components/skeleton/skeleton-table";
import { SkeletonCard } from "@/components/skeleton/skeleton-card";
import { SkeletonText } from "@/components/skeleton/skeleton-text";

import React from 'react'

const SkeletonMembers = () => {
  return (
    <div>
        <SkeletonText/>
        <div className="flex gap-5 mb-5 mt-5">
            <SkeletonCard/>
            <SkeletonCard/>
            <SkeletonCard/>
            <SkeletonCard/>
        </div>
        <SkeletonTable/>
    </div>

  )
}

export default SkeletonMembers