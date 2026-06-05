import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Database, FileCog, FileSearch, House, PlusCircle, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NoticeCenter } from "@/components/shared/notice-center";
import { Button } from "@/components/shared/button";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const items = [
  { to: "/", label: "概览", icon: House },
  { to: "/entries", label: "索引列表", icon: Database },
  { to: "/import-export", label: "导入导出", icon: FileSearch },
  { to: "/settings", label: "设置", icon: Settings },
];

export function AppShell() {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="min-h-screen px-4 py-4 lg:px-6">
      <NoticeCenter />
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-soft backdrop-blur-sm">
          <div className="border-b border-border/60 pb-5">
            <p className="font-display text-2xl font-semibold tracking-tight">Atlas-X</p>
            <p className="mt-2 text-sm text-muted-foreground">本地优先的对话索引管理器，专门处理历史链接、摘要和标签。</p>
          </div>

          <nav className="mt-6 space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-border/60 bg-secondary/50 p-4">
            <p className="text-sm font-medium">快捷操作</p>
            <div className="mt-4 flex flex-col gap-3">
              <Link to="/entries/new">
                <Button className="w-full justify-start gap-2">
                  <PlusCircle className="h-4 w-4" />
                  新增条目
                </Button>
              </Link>
              <Link to="/import-export">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileCog className="h-4 w-4" />
                  导入导出
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-4">
          <header className="flex flex-col gap-3 rounded-[28px] border border-border/70 bg-card/85 px-5 py-4 shadow-soft backdrop-blur-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Atlas-X Indexer</h1>
              <p className="text-sm text-muted-foreground">把历史对话索引从聊天窗口里抽离出来，做成真正可维护的本地工具。</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </header>

          <main className="min-h-0 flex-1 rounded-[28px] border border-border/70 bg-card/70 p-5 shadow-soft backdrop-blur-sm">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
