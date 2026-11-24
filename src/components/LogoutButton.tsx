import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outlined">
        Keluar
      </Button>
    </form>
  );
}