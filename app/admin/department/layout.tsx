import React from 'react'
import RealtimeFetch from './realtime-fetch'

const layout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <RealtimeFetch>
        {children}
    </RealtimeFetch>
  )
}

export default layout