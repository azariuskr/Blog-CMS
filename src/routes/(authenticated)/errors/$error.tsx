import { createFileRoute } from '@tanstack/react-router'
import { AppHeader } from '@/components/admin/app-layout/app-header'
import { ForbiddenError } from '@/components/errors/forbidden-error'
import { GeneralError } from '@/components/errors/general-error'
import { MaintenanceError } from '@/components/errors/maintenance-error'
import { NotFoundError } from '@/components/errors/not-found-error'
import { UnauthorizedError } from '@/components/errors/unauthorized-error'

export const Route = createFileRoute('/(authenticated)/errors/$error')({
  component: RouteComponent,
})

// eslint-disable-next-line react-refresh/only-export-components
function RouteComponent() {
  const { error } = Route.useParams()

  const errorMap: Record<string, React.ComponentType> = {
    unauthorized: UnauthorizedError,
    forbidden: ForbiddenError,
    'not-found': NotFoundError,
    'internal-server-error': GeneralError,
    'maintenance-error': MaintenanceError,
  }
  const ErrorComponent = errorMap[error] || NotFoundError

  return (
    <>
      <AppHeader />
      <div className='flex-1 [&>div]:h-full'>
        <ErrorComponent />
      </div>
    </>
  )
}
