import { Route as rootRouteImport } from './routes/__root'
import { Route as SignupRouteImport } from './routes/signup'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as LoginRouteImport } from './routes/login'
import { Route as ForgotPasswordRouteImport } from './routes/forgot-password'
import { Route as AuthenticatedRouteImport } from './routes/_authenticated'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthenticatedProfileRouteImport } from './routes/_authenticated/profile'
import { Route as AuthenticatedJoinRouteImport } from './routes/_authenticated/join'
import { Route as AuthenticatedDashboardRouteImport } from './routes/_authenticated/dashboard'
import { Route as AuthenticatedQuizzesIndexRouteImport } from './routes/_authenticated/quizzes.index'
import { Route as AuthenticatedMyQuizzesIndexRouteImport } from './routes/_authenticated/my-quizzes.index'
import { Route as AuthenticatedQuizzesQuizIdIndexRouteImport } from './routes/_authenticated/quizzes.$quizId.index'
import { Route as AuthenticatedQuizzesQuizIdEditRouteImport } from './routes/_authenticated/quizzes.$quizId.edit'
import { Route as AuthenticatedMyQuizzesQuizIdResultRouteImport } from './routes/_authenticated/my-quizzes.$quizId.result'
import { Route as AuthenticatedMyQuizzesQuizIdAttemptRouteImport } from './routes/_authenticated/my-quizzes.$quizId.attempt'
import { Route as AuthenticatedQuizzesQuizIdReportIndexRouteImport } from './routes/_authenticated/quizzes.$quizId.report.index'
import { Route as AuthenticatedQuizzesQuizIdReportAttemptIdRouteImport } from './routes/_authenticated/quizzes.$quizId.report.$attemptId'

const SignupRoute = SignupRouteImport.update({
  id: '/signup',
  path: '/signup',
  getParentRoute: () => rootRouteImport,
} as any)
const ResetPasswordRoute = ResetPasswordRouteImport.update({
  id: '/reset-password',
  path: '/reset-password',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const ForgotPasswordRoute = ForgotPasswordRouteImport.update({
  id: '/forgot-password',
  path: '/forgot-password',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedRoute = AuthenticatedRouteImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedProfileRoute = AuthenticatedProfileRouteImport.update({
  id: '/profile',
  path: '/profile',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedJoinRoute = AuthenticatedJoinRouteImport.update({
  id: '/join',
  path: '/join',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedDashboardRoute = AuthenticatedDashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedQuizzesIndexRoute =
  AuthenticatedQuizzesIndexRouteImport.update({
    id: '/quizzes/',
    path: '/quizzes/',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedMyQuizzesIndexRoute =
  AuthenticatedMyQuizzesIndexRouteImport.update({
    id: '/my-quizzes/',
    path: '/my-quizzes/',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedQuizzesQuizIdIndexRoute =
  AuthenticatedQuizzesQuizIdIndexRouteImport.update({
    id: '/quizzes/$quizId/',
    path: '/quizzes/$quizId/',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedQuizzesQuizIdEditRoute =
  AuthenticatedQuizzesQuizIdEditRouteImport.update({
    id: '/quizzes/$quizId/edit',
    path: '/quizzes/$quizId/edit',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedMyQuizzesQuizIdResultRoute =
  AuthenticatedMyQuizzesQuizIdResultRouteImport.update({
    id: '/my-quizzes/$quizId/result',
    path: '/my-quizzes/$quizId/result',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedMyQuizzesQuizIdAttemptRoute =
  AuthenticatedMyQuizzesQuizIdAttemptRouteImport.update({
    id: '/my-quizzes/$quizId/attempt',
    path: '/my-quizzes/$quizId/attempt',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedQuizzesQuizIdReportIndexRoute =
  AuthenticatedQuizzesQuizIdReportIndexRouteImport.update({
    id: '/quizzes/$quizId/report/',
    path: '/quizzes/$quizId/report/',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedQuizzesQuizIdReportAttemptIdRoute =
  AuthenticatedQuizzesQuizIdReportAttemptIdRouteImport.update({
    id: '/quizzes/$quizId/report/$attemptId',
    path: '/quizzes/$quizId/report/$attemptId',
    getParentRoute: () => AuthenticatedRoute,
  } as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/reset-password': typeof ResetPasswordRoute
  '/signup': typeof SignupRoute
  '/dashboard': typeof AuthenticatedDashboardRoute
  '/join': typeof AuthenticatedJoinRoute
  '/profile': typeof AuthenticatedProfileRoute
  '/my-quizzes/': typeof AuthenticatedMyQuizzesIndexRoute
  '/quizzes/': typeof AuthenticatedQuizzesIndexRoute
  '/my-quizzes/$quizId/attempt': typeof AuthenticatedMyQuizzesQuizIdAttemptRoute
  '/my-quizzes/$quizId/result': typeof AuthenticatedMyQuizzesQuizIdResultRoute
  '/quizzes/$quizId/edit': typeof AuthenticatedQuizzesQuizIdEditRoute
  '/quizzes/$quizId/': typeof AuthenticatedQuizzesQuizIdIndexRoute
  '/quizzes/$quizId/report/$attemptId': typeof AuthenticatedQuizzesQuizIdReportAttemptIdRoute
  '/quizzes/$quizId/report/': typeof AuthenticatedQuizzesQuizIdReportIndexRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/reset-password': typeof ResetPasswordRoute
  '/signup': typeof SignupRoute
  '/dashboard': typeof AuthenticatedDashboardRoute
  '/join': typeof AuthenticatedJoinRoute
  '/profile': typeof AuthenticatedProfileRoute
  '/my-quizzes': typeof AuthenticatedMyQuizzesIndexRoute
  '/quizzes': typeof AuthenticatedQuizzesIndexRoute
  '/my-quizzes/$quizId/attempt': typeof AuthenticatedMyQuizzesQuizIdAttemptRoute
  '/my-quizzes/$quizId/result': typeof AuthenticatedMyQuizzesQuizIdResultRoute
  '/quizzes/$quizId/edit': typeof AuthenticatedQuizzesQuizIdEditRoute
  '/quizzes/$quizId': typeof AuthenticatedQuizzesQuizIdIndexRoute
  '/quizzes/$quizId/report/$attemptId': typeof AuthenticatedQuizzesQuizIdReportAttemptIdRoute
  '/quizzes/$quizId/report': typeof AuthenticatedQuizzesQuizIdReportIndexRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/_authenticated': typeof AuthenticatedRouteWithChildren
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/reset-password': typeof ResetPasswordRoute
  '/signup': typeof SignupRoute
  '/_authenticated/dashboard': typeof AuthenticatedDashboardRoute
  '/_authenticated/join': typeof AuthenticatedJoinRoute
  '/_authenticated/profile': typeof AuthenticatedProfileRoute
  '/_authenticated/my-quizzes/': typeof AuthenticatedMyQuizzesIndexRoute
  '/_authenticated/quizzes/': typeof AuthenticatedQuizzesIndexRoute
  '/_authenticated/my-quizzes/$quizId/attempt': typeof AuthenticatedMyQuizzesQuizIdAttemptRoute
  '/_authenticated/my-quizzes/$quizId/result': typeof AuthenticatedMyQuizzesQuizIdResultRoute
  '/_authenticated/quizzes/$quizId/edit': typeof AuthenticatedQuizzesQuizIdEditRoute
  '/_authenticated/quizzes/$quizId/': typeof AuthenticatedQuizzesQuizIdIndexRoute
  '/_authenticated/quizzes/$quizId/report/$attemptId': typeof AuthenticatedQuizzesQuizIdReportAttemptIdRoute
  '/_authenticated/quizzes/$quizId/report/': typeof AuthenticatedQuizzesQuizIdReportIndexRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/forgot-password'
    | '/login'
    | '/reset-password'
    | '/signup'
    | '/dashboard'
    | '/join'
    | '/profile'
    | '/my-quizzes/'
    | '/quizzes/'
    | '/my-quizzes/$quizId/attempt'
    | '/my-quizzes/$quizId/result'
    | '/quizzes/$quizId/edit'
    | '/quizzes/$quizId/'
    | '/quizzes/$quizId/report/$attemptId'
    | '/quizzes/$quizId/report/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/forgot-password'
    | '/login'
    | '/reset-password'
    | '/signup'
    | '/dashboard'
    | '/join'
    | '/profile'
    | '/my-quizzes'
    | '/quizzes'
    | '/my-quizzes/$quizId/attempt'
    | '/my-quizzes/$quizId/result'
    | '/quizzes/$quizId/edit'
    | '/quizzes/$quizId'
    | '/quizzes/$quizId/report/$attemptId'
    | '/quizzes/$quizId/report'
  id:
    | '__root__'
    | '/'
    | '/_authenticated'
    | '/forgot-password'
    | '/login'
    | '/reset-password'
    | '/signup'
    | '/_authenticated/dashboard'
    | '/_authenticated/join'
    | '/_authenticated/profile'
    | '/_authenticated/my-quizzes/'
    | '/_authenticated/quizzes/'
    | '/_authenticated/my-quizzes/$quizId/attempt'
    | '/_authenticated/my-quizzes/$quizId/result'
    | '/_authenticated/quizzes/$quizId/edit'
    | '/_authenticated/quizzes/$quizId/'
    | '/_authenticated/quizzes/$quizId/report/$attemptId'
    | '/_authenticated/quizzes/$quizId/report/'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthenticatedRoute: typeof AuthenticatedRouteWithChildren
  ForgotPasswordRoute: typeof ForgotPasswordRoute
  LoginRoute: typeof LoginRoute
  ResetPasswordRoute: typeof ResetPasswordRoute
  SignupRoute: typeof SignupRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/signup': {
      id: '/signup'
      path: '/signup'
      fullPath: '/signup'
      preLoaderRoute: typeof SignupRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/reset-password': {
      id: '/reset-password'
      path: '/reset-password'
      fullPath: '/reset-password'
      preLoaderRoute: typeof ResetPasswordRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/forgot-password': {
      id: '/forgot-password'
      path: '/forgot-password'
      fullPath: '/forgot-password'
      preLoaderRoute: typeof ForgotPasswordRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated/profile': {
      id: '/_authenticated/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof AuthenticatedProfileRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/join': {
      id: '/_authenticated/join'
      path: '/join'
      fullPath: '/join'
      preLoaderRoute: typeof AuthenticatedJoinRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/dashboard': {
      id: '/_authenticated/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof AuthenticatedDashboardRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/quizzes/': {
      id: '/_authenticated/quizzes/'
      path: '/quizzes'
      fullPath: '/quizzes/'
      preLoaderRoute: typeof AuthenticatedQuizzesIndexRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/my-quizzes/': {
      id: '/_authenticated/my-quizzes/'
      path: '/my-quizzes'
      fullPath: '/my-quizzes/'
      preLoaderRoute: typeof AuthenticatedMyQuizzesIndexRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/quizzes/$quizId/': {
      id: '/_authenticated/quizzes/$quizId/'
      path: '/quizzes/$quizId'
      fullPath: '/quizzes/$quizId/'
      preLoaderRoute: typeof AuthenticatedQuizzesQuizIdIndexRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/quizzes/$quizId/edit': {
      id: '/_authenticated/quizzes/$quizId/edit'
      path: '/quizzes/$quizId/edit'
      fullPath: '/quizzes/$quizId/edit'
      preLoaderRoute: typeof AuthenticatedQuizzesQuizIdEditRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/my-quizzes/$quizId/result': {
      id: '/_authenticated/my-quizzes/$quizId/result'
      path: '/my-quizzes/$quizId/result'
      fullPath: '/my-quizzes/$quizId/result'
      preLoaderRoute: typeof AuthenticatedMyQuizzesQuizIdResultRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/my-quizzes/$quizId/attempt': {
      id: '/_authenticated/my-quizzes/$quizId/attempt'
      path: '/my-quizzes/$quizId/attempt'
      fullPath: '/my-quizzes/$quizId/attempt'
      preLoaderRoute: typeof AuthenticatedMyQuizzesQuizIdAttemptRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/quizzes/$quizId/report/': {
      id: '/_authenticated/quizzes/$quizId/report/'
      path: '/quizzes/$quizId/report'
      fullPath: '/quizzes/$quizId/report/'
      preLoaderRoute: typeof AuthenticatedQuizzesQuizIdReportIndexRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/quizzes/$quizId/report/$attemptId': {
      id: '/_authenticated/quizzes/$quizId/report/$attemptId'
      path: '/quizzes/$quizId/report/$attemptId'
      fullPath: '/quizzes/$quizId/report/$attemptId'
      preLoaderRoute: typeof AuthenticatedQuizzesQuizIdReportAttemptIdRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
  }
}

interface AuthenticatedRouteChildren {
  AuthenticatedDashboardRoute: typeof AuthenticatedDashboardRoute
  AuthenticatedJoinRoute: typeof AuthenticatedJoinRoute
  AuthenticatedProfileRoute: typeof AuthenticatedProfileRoute
  AuthenticatedMyQuizzesIndexRoute: typeof AuthenticatedMyQuizzesIndexRoute
  AuthenticatedQuizzesIndexRoute: typeof AuthenticatedQuizzesIndexRoute
  AuthenticatedMyQuizzesQuizIdAttemptRoute: typeof AuthenticatedMyQuizzesQuizIdAttemptRoute
  AuthenticatedMyQuizzesQuizIdResultRoute: typeof AuthenticatedMyQuizzesQuizIdResultRoute
  AuthenticatedQuizzesQuizIdEditRoute: typeof AuthenticatedQuizzesQuizIdEditRoute
  AuthenticatedQuizzesQuizIdIndexRoute: typeof AuthenticatedQuizzesQuizIdIndexRoute
  AuthenticatedQuizzesQuizIdReportAttemptIdRoute: typeof AuthenticatedQuizzesQuizIdReportAttemptIdRoute
  AuthenticatedQuizzesQuizIdReportIndexRoute: typeof AuthenticatedQuizzesQuizIdReportIndexRoute
}

const AuthenticatedRouteChildren: AuthenticatedRouteChildren = {
  AuthenticatedDashboardRoute: AuthenticatedDashboardRoute,
  AuthenticatedJoinRoute: AuthenticatedJoinRoute,
  AuthenticatedProfileRoute: AuthenticatedProfileRoute,
  AuthenticatedMyQuizzesIndexRoute: AuthenticatedMyQuizzesIndexRoute,
  AuthenticatedQuizzesIndexRoute: AuthenticatedQuizzesIndexRoute,
  AuthenticatedMyQuizzesQuizIdAttemptRoute:
    AuthenticatedMyQuizzesQuizIdAttemptRoute,
  AuthenticatedMyQuizzesQuizIdResultRoute:
    AuthenticatedMyQuizzesQuizIdResultRoute,
  AuthenticatedQuizzesQuizIdEditRoute: AuthenticatedQuizzesQuizIdEditRoute,
  AuthenticatedQuizzesQuizIdIndexRoute: AuthenticatedQuizzesQuizIdIndexRoute,
  AuthenticatedQuizzesQuizIdReportAttemptIdRoute:
    AuthenticatedQuizzesQuizIdReportAttemptIdRoute,
  AuthenticatedQuizzesQuizIdReportIndexRoute:
    AuthenticatedQuizzesQuizIdReportIndexRoute,
}

const AuthenticatedRouteWithChildren = AuthenticatedRoute._addFileChildren(
  AuthenticatedRouteChildren,
)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthenticatedRoute: AuthenticatedRouteWithChildren,
  ForgotPasswordRoute: ForgotPasswordRoute,
  LoginRoute: LoginRoute,
  ResetPasswordRoute: ResetPasswordRoute,
  SignupRoute: SignupRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
