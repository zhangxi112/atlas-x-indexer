import { Link } from "react-router-dom";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";

export function NotFoundPage() {
  return (
    <EmptyState
      title="页面不存在"
      description="当前地址没有对应页面。"
      action={
        <Link to="/">
          <Button>返回首页</Button>
        </Link>
      }
    />
  );
}
