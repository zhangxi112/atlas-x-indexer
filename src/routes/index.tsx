import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { createHashRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingPanel } from "@/components/shared/loading-panel";

const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const EntriesPage = lazy(() => import("@/pages/entries-page").then((module) => ({ default: module.EntriesPage })));
const EntryFormPage = lazy(() => import("@/pages/entry-form-page").then((module) => ({ default: module.EntryFormPage })));
const EntryDetailPage = lazy(() => import("@/pages/entry-detail-page").then((module) => ({ default: module.EntryDetailPage })));
const ImportExportPage = lazy(() => import("@/pages/import-export-page").then((module) => ({ default: module.ImportExportPage })));
const SettingsPage = lazy(() => import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import("@/pages/not-found-page").then((module) => ({ default: module.NotFoundPage })));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<LoadingPanel message="正在加载页面..." />}>{element}</Suspense>;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: "entries", element: withSuspense(<EntriesPage />) },
      { path: "entries/new", element: withSuspense(<EntryFormPage mode="create" />) },
      { path: "entries/:id/edit", element: withSuspense(<EntryFormPage mode="edit" />) },
      { path: "entries/:id", element: withSuspense(<EntryDetailPage />) },
      { path: "import-export", element: withSuspense(<ImportExportPage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) },
      { path: "*", element: withSuspense(<NotFoundPage />) },
    ],
  },
]);
