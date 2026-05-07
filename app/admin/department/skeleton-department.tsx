import { SkeletonTable } from "@/components/skeleton/skeleton-table";
import { SkeletonCard } from "@/components/skeleton/skeleton-card";
import { SkeletonText } from "@/components/skeleton/skeleton-text";

import React from 'react'

const SkeletonMembers = () => {
  return (
    <div>
        <div className="grid grid-cols-3 gap-4">
            <SkeletonCard/>
            <SkeletonCard/>
            <SkeletonCard/>
            <SkeletonCard/>
        </div>
    </div>

  )
}

export default SkeletonMembers