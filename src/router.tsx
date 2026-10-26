import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { Button, Result } from 'antd'

import { LobbyPage } from '@/pages/LobbyPage'
import { LoginPage } from '@/pages/LoginPage'
import { TakePage } from '@/pages/TakePage'

function ExamLayout() {
  return (
    <div className="exam-shell">
      <Outlet />
    </div>
  )
}

const rootRoute = createRootRoute({
  component: ExamLayout,
  notFoundComponent: () => (
    <Result
      status="404"
      title="Không tìm thấy trang"
      subTitle="Đường dẫn không tồn tại trên cổng thi tuyển."
      extra={
        <Button type="primary" onClick={() => window.location.assign('/')}>
          Về đăng nhập phòng thi
        </Button>
      }
    />
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginPage,
})

const lobbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lobby',
  component: LobbyPage,
})

const takeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/take',
  component: TakePage,
})

const routeTree = rootRoute.addChildren([indexRoute, lobbyRoute, takeRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: false,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
