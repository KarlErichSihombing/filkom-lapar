import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { LogOut } from "@/components/ui/icons";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outlined" size="sm">
        <LogOut className="size-4" />
        Keluar
      </Button>
    </form>
  );
}