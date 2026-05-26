import { RouteSpec } from '../src/types'

const INSIGHTS_STUDIO_ROUTE = '/reports/insights-studio'

export const routes: RouteSpec[] = [
  {
    path: '/',
    requiresAuth: true,
    expectedRedirect: '/home'
  },
  // {
  //   path: '/dashboard/widget/new',
  //   expectedRedirect: '/home/widget/new'
  // },
  // {
  //   path: '/dashboard/widget/:id',
  //   expectedRedirect: '/home/widget/:id',
  //   skip: true,
  //   notes: 'Provide params.id to validate this redirect route.'
  // },
  // {
  //   path: '/dashboard',
  //   expectedRedirect: '/home'
  // },
  // {
  //   path: '/home/widget/new',
  //   requiresAuth: true
  // },
  // {
  //   path: '/home/widget/:id',
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/home',
  //   requiresAuth: true
  // },
  // {
  //   path: '/reports'
  // },
  // {
  //   path: '/reports/content/linkslist/:id',
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/content/linkmap/:id',
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/content/aggregate_view'
  // },
  // {
  //   path: '/reports/embedded-reports'
  // },
  // {
  //   path: '/reports/embedded-reports/new',
  //   requiresAuth: true
  // },
  // {
  //   path: '/reports/embedded-reports/:id',
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/business_intelligence',
  //   expectedRedirect: '/reports/embedded-reports'
  // },
  // {
  //   path: '/reports/business_intelligence/new',
  //   expectedRedirect: '/reports/embedded-reports/new'
  // },
  // {
  //   path: '/reports/business_intelligence/:id',
  //   expectedRedirect: '/reports/embedded-reports/:id',
  //   skip: true,
  //   notes: 'Provide params.id to validate this redirect route.'
  // },
  // {
  //   path: '/reports/report_builder',
  //   expectedRedirect: INSIGHTS_STUDIO_ROUTE
  // },
  // {
  //   path: '/reports/report_builder/new',
  //   expectedRedirect: `${INSIGHTS_STUDIO_ROUTE}/new`
  // },
  // {
  //   path: '/reports/report_builder/:id',
  //   expectedRedirect: `${INSIGHTS_STUDIO_ROUTE}/:id`,
  //   skip: true,
  //   notes: 'Provide params.id to validate this redirect route.'
  // },
  // {
  //   path: `${INSIGHTS_STUDIO_ROUTE}/enterprise_activation_forecast/new`,
  //   requiresAuth: true
  // },
  // {
  //   path: `${INSIGHTS_STUDIO_ROUTE}/enterprise_activation_forecast/:id`,
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: INSIGHTS_STUDIO_ROUTE,
  //   requiresAuth: true
  // },
  // {
  //   path: `${INSIGHTS_STUDIO_ROUTE}/new`,
  //   requiresAuth: true
  // },
  // {
  //   path: `${INSIGHTS_STUDIO_ROUTE}/:id`,
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/dashboard/add-report/:id',
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/slides/new',
  //   requiresAuth: true
  // },
  // {
  //   path: '/reports/slides/:id',
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/dashboard/:id',
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/custom_datasets/new',
  //   requiresAuth: true
  // },
  // {
  //   path: '/reports/custom_datasets/:id',
  //   requiresAuth: true,
  //   skip: true,
  //   notes: 'Provide params.id to validate this route.'
  // },
  // {
  //   path: '/reports/query-lab',
  //   requiresAuth: true
  // },
  // {
  //   path: '/reports/query-studio',
  //   expectedRedirect: '/reports/query-lab'
  // },
  // {
  //   path: '/reports/primetime'
  // },
  // {
  //   path: '/reports/audience'
  // },
  // {
  //   path: '/reports/content'
  // },
  // {
  //   path: '/reports/templates'
  // }
]
